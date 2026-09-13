"""SQLite setup.

The database lives on a Fly volume mounted at /data, so it survives deploys
and machine restarts. Locally it falls back to ./data/app.db.

Sync cursors are the integer `seq` column, not a timestamp. See next_seq().
"""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data" if os.environ.get("FLY_APP_NAME") else "./data"))
DB_PATH = DATA_DIR / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    seq         INTEGER NOT NULL,           -- sync cursor; bumped on every write
    kind        TEXT NOT NULL DEFAULT 'note',
    body        TEXT NOT NULL,              -- JSON blob; the app's own record shape
    author      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'ok', -- ok | pending | pinned | needs_review | failed
    source_url  TEXT,                       -- canonical shared URL, for dedupe
    created_at  TEXT NOT NULL,              -- display only, never a cursor
    updated_at  TEXT NOT NULL,
    deleted     INTEGER NOT NULL DEFAULT 0  -- tombstone, so sync can delete too
);
-- Single-row counter backing `seq`. A table, not AUTOINCREMENT, because an
-- UPDATE has to advance the cursor too, not just an INSERT.
CREATE TABLE IF NOT EXISTS counters (
    name  TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('seq', 0);

-- Durable job queue. A deploy can kill a machine mid-extraction; without this
-- the share would vanish with no trace. sweep_stuck_jobs() requeues on boot.
CREATE TABLE IF NOT EXISTS jobs (
    item_id     TEXT PRIMARY KEY,
    state       TEXT NOT NULL,              -- queued | running | done | failed
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_error  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
"""

# Indexes run AFTER migrate(), never inside SCHEMA. An index on a column that a
# migration is about to add fails on an existing database, which would break
# the deploy on a volume that already holds data.
INDEXES = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_items_seq ON items(seq)",
    "CREATE INDEX IF NOT EXISTS idx_items_kind ON items(kind)",
    "CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)",
    # Partial unique index: one item per shared URL, unlimited rows without one.
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_items_source_url"
    " ON items(source_url) WHERE source_url IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state)",
]

# Columns added after the first deploy. CREATE TABLE IF NOT EXISTS won't add a
# column to a table that already exists, so an existing volume needs this.
MIGRATIONS: list[tuple[str, str, str]] = [
    ("items", "status", "TEXT NOT NULL DEFAULT 'ok'"),
    ("items", "source_url", "TEXT"),
]


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # isolation_level=None -> autocommit; write transactions are explicit below.
    conn = sqlite3.connect(DB_PATH, timeout=15, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    # WAL lets a reader and a writer run at once, which is all two phones need.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=15000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def migrate(conn: sqlite3.Connection) -> list[str]:
    """Add any missing columns. Idempotent; safe to run on every boot."""
    applied = []
    for table, column, decl in MIGRATIONS:
        cols = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
        if column not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
            applied.append(f"{table}.{column}")
    return applied


def init_db() -> list[str]:
    conn = connect()
    try:
        conn.executescript(SCHEMA)   # tables first
        applied = migrate(conn)      # then any columns the tables are missing
        for statement in INDEXES:    # only then the indexes over them
            conn.execute(statement)
        return applied
    finally:
        conn.close()


def get_conn():
    """FastAPI dependency: one short-lived connection per request."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def write_txn(conn: sqlite3.Connection):
    """BEGIN IMMEDIATE takes the write lock up front, so a reader can't turn a
    write into a mid-transaction SQLITE_BUSY."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    else:
        conn.execute("COMMIT")


def next_seq(conn: sqlite3.Connection) -> int:
    """Monotonic counter, allocated inside the caller's write transaction.

    Deliberately not a timestamp: wall clocks jump (NTP, DST-naive clients),
    two writes can share a microsecond, and an ISO timestamp in a query string
    contains a '+' that decodes as a space unless every client encodes it
    correctly. An integer has none of those failure modes.
    """
    return conn.execute(
        "UPDATE counters SET value = value + 1 WHERE name = 'seq' RETURNING value"
    ).fetchone()[0]

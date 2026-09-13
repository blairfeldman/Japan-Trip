"""The two failure modes that only show up under load or on a real volume."""

import json
import os
import shutil
import sqlite3
import tempfile
from concurrent.futures import ThreadPoolExecutor

TMP = tempfile.mkdtemp(prefix="jt-inv-")
os.environ["DATA_DIR"] = TMP
os.environ["APP_TOKEN"] = "test-token"
os.environ.pop("FLY_APP_NAME", None)

from fastapi.testclient import TestClient  # noqa: E402

import db  # noqa: E402
import main  # noqa: E402

PASS = FAIL = 0
AUTH = {"Authorization": "Bearer test-token"}


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1; print("  PASS", name)
    else:
        FAIL += 1; print("  FAIL", name, extra)


print("\n-- concurrent writes can't collide on seq --")
with TestClient(main.app) as c:
    def post(n):
        return c.post("/items", json={"id": f"c{n}", "kind": "load", "body": {"n": n}}, headers=AUTH).status_code

    with ThreadPoolExecutor(max_workers=16) as pool:
        codes = list(pool.map(post, range(120)))
    check("every write succeeded", all(x == 200 for x in codes), str(set(codes)))

    seqs, cur = [], 0
    while True:
        pg = c.get(f"/items?kind=load&since_seq={cur}&limit=50", headers=AUTH).json()
        seqs += [i["seq"] for i in pg["items"]]
        cur = pg["next_seq"]
        if not pg["has_more"]:
            break
    check("120 rows, no duplicates", len(seqs) == 120 and len(set(seqs)) == 120, f"{len(seqs)} rows, {len(set(seqs))} unique")
    check("seq is a contiguous run", sorted(seqs) == list(range(min(seqs), min(seqs) + 120)), str(sorted(seqs)[:5]))

print("\n-- an existing volume migrates rather than crash-looping --")
OLD = tempfile.mkdtemp(prefix="jt-old-")
old_db = os.path.join(OLD, "app.db")
# A database from before status/source_url existed.
conn = sqlite3.connect(old_db)
conn.executescript("""
CREATE TABLE items (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'note',
  body TEXT NOT NULL, author TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO counters VALUES ('seq', 7);
INSERT INTO items VALUES ('old-1', 6, 'place', '{"name":"Kept"}', 'blair', 't', 't', 0);
INSERT INTO items VALUES ('old-2', 7, 'event', '{"name":"Also kept"}', 'yev', 't', 't', 0);
""")
conn.commit(); conn.close()

os.environ["DATA_DIR"] = OLD
import importlib  # noqa: E402
importlib.reload(db); importlib.reload(main)

applied = db.init_db()
check("the missing columns are added", set(applied) == {"items.status", "items.source_url"}, str(applied))
conn = db.connect()
rows = {r["id"]: r for r in conn.execute("SELECT * FROM items")}
check("existing rows survive", len(rows) == 2 and json.loads(rows["old-1"]["body"])["name"] == "Kept")
check("they get the column default", rows["old-1"]["status"] == "ok")
check("the seq counter is preserved", conn.execute("SELECT value FROM counters WHERE name='seq'").fetchone()[0] == 7)
idx = {r[1] for r in conn.execute("PRAGMA index_list(items)")}
check("indexes over the new columns exist", any("status" in str(i) for i in idx), str(idx))
conn.close()
check("a second boot is a no-op", db.init_db() == [])

print(f"\n{PASS} passed, {FAIL} failed")
shutil.rmtree(TMP, ignore_errors=True); shutil.rmtree(OLD, ignore_errors=True)
raise SystemExit(1 if FAIL else 0)

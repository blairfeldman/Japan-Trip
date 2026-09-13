"""Two-person trip backend.

A single FastAPI app with a shared-secret bearer token and a SQLite database on
a persistent volume. `items` is the one synced entity — the app stores each of
its record types under a different `kind`, with its own shape in `body`, so the
phone stays the source of truth for display and this is only a sync target.

A shared TikTok/Instagram link becomes an item with kind='place' that a
background worker fills in with a real location.

Endpoints are `def` rather than `async def` on purpose: FastAPI runs them in a
threadpool, so the blocking sqlite3 calls don't stall the event loop.
"""

import json
import os
import secrets
import sqlite3
import threading
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlsplit, urlunsplit

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

import booking as booking_parser
import extract
from db import DB_PATH, get_conn, init_db, next_seq, write_txn

APP_TOKEN = os.environ.get("APP_TOKEN", "")
IS_FLY = bool(os.environ.get("FLY_APP_NAME"))
MAX_BODY_BYTES = 64 * 1024  # keeps one bad client from filling a 1 GB volume

if not APP_TOKEN:
    if IS_FLY:
        raise RuntimeError("APP_TOKEN is not set. Run: fly secrets set APP_TOKEN=$(openssl rand -hex 32)")
    APP_TOKEN = "dev-token"
    print("WARNING: APP_TOKEN unset, using 'dev-token'. Fine locally, never in deploy.")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_url(url: str) -> str:
    """Dedupe key. Drops the query string and fragment, which is where TikTok
    puts per-share tracking params — otherwise the same video shared twice
    looks like two different links."""
    parts = urlsplit(url.strip())
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, "", ""))


@asynccontextmanager
async def lifespan(app: FastAPI):
    applied = init_db()
    print(f"database ready at {DB_PATH}" + (f" (migrated: {', '.join(applied)})" if applied else ""))

    # A deploy kills in-flight workers; pick their jobs back up.
    stuck = extract.sweep_stuck_jobs()
    if stuck:
        print(f"requeueing {len(stuck)} interrupted job(s)")
        for item_id in stuck:
            threading.Thread(target=extract.process_item, args=(item_id,), daemon=True).start()
    yield


app = FastAPI(title="Japan Trip API", lifespan=lifespan)


def require_token(authorization: str = Header(default="")) -> None:
    """Shared secret. Both phones send the same one, so `author` below is
    self-reported, not proven — don't build anything that trusts it."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not secrets.compare_digest(token, APP_TOKEN):
        raise HTTPException(status_code=401, detail="bad or missing token")


# --------------------------------------------------------------------------
# models
# --------------------------------------------------------------------------

class ItemIn(BaseModel):
    # Client-supplied so a retry on flaky mobile data can't create a duplicate.
    id: Optional[str] = None
    kind: str = "note"
    body: dict[str, Any] = Field(default_factory=dict)
    author: str = ""


class ItemPatch(BaseModel):
    kind: Optional[str] = None
    body: Optional[dict[str, Any]] = None
    author: Optional[str] = None
    status: Optional[str] = None


class ShareIn(BaseModel):
    url: str
    shared_text: str = ""   # the share intent usually carries the caption
    author: str = ""


class PlaceIn(BaseModel):
    """Manual pin, for clearing the needs-review queue by hand."""
    lat: float
    lng: float
    name: Optional[str] = None
    address: Optional[str] = None
    google_place_id: Optional[str] = None


class BookingIn(BaseModel):
    text: str


class Item(BaseModel):
    id: str
    seq: int
    kind: str
    body: dict[str, Any]
    author: str
    status: str
    source_url: Optional[str]
    created_at: str
    updated_at: str
    deleted: bool


class ItemPage(BaseModel):
    items: list[Item]
    next_seq: int   # cursor to send on the following poll
    has_more: bool  # true -> poll again immediately, don't wait


def row_to_item(row: sqlite3.Row) -> Item:
    return Item(
        id=row["id"], seq=row["seq"], kind=row["kind"], body=json.loads(row["body"]),
        author=row["author"], status=row["status"], source_url=row["source_url"],
        created_at=row["created_at"], updated_at=row["updated_at"], deleted=bool(row["deleted"]),
    )


def dump_body(body: dict[str, Any]) -> str:
    encoded = json.dumps(body)
    if len(encoded.encode()) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail=f"body exceeds {MAX_BODY_BYTES} bytes")
    return encoded


# --------------------------------------------------------------------------
# routes
# --------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    """Unauthenticated so Fly's health check can hit it. Reports which optional
    keys are configured, so a share that fails is easy to diagnose."""
    return {
        "status": "ok",
        "time": now(),
        "extraction": bool(extract.ANTHROPIC_API_KEY),
        "geocoding": bool(extract.GOOGLE_MAPS_API_KEY),
    }


@app.get("/items", response_model=ItemPage)
def list_items(
    since_seq: int = Query(0, ge=0, description="Last seq you saw; 0 for a full load"),
    kind: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(500, ge=1, le=2000),
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> ItemPage:
    sql = "SELECT * FROM items WHERE seq > ?"
    args: list[Any] = [since_seq]
    if since_seq == 0:
        # A cold load wants live rows only; an incremental sync wants tombstones.
        sql += " AND deleted = 0"
    if kind:
        sql += " AND kind = ?"
        args.append(kind)
    if status:
        sql += " AND status = ?"
        args.append(status)
    # limit + 1 is how has_more is detected without a second COUNT query.
    sql += " ORDER BY seq ASC LIMIT ?"
    args.append(limit + 1)

    rows = [row_to_item(r) for r in conn.execute(sql, args)]
    has_more = len(rows) > limit
    rows = rows[:limit]
    return ItemPage(items=rows, next_seq=rows[-1].seq if rows else since_seq, has_more=has_more)


@app.get("/items/{item_id}", response_model=Item)
def get_item(
    item_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> Item:
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    return row_to_item(row)


@app.post("/items", response_model=Item)
def create_item(
    payload: ItemIn,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> Item:
    """Upsert on a client-supplied id.

    The app owns its records and pushes whatever it currently holds, so a
    second POST of the same id is an update, not a conflict. Last write wins,
    which is right for two people and avoids the phone needing to know whether
    the server has seen a row before.
    """
    encoded = dump_body(payload.body)
    item_id = payload.id or str(uuid.uuid4())
    ts = now()

    with write_txn(conn):
        seq = next_seq(conn)
        existing = conn.execute("SELECT created_at FROM items WHERE id = ?", (item_id,)).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO items (id, seq, kind, body, author, status, source_url,"
                " created_at, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 'ok', NULL, ?, ?, 0)",
                (item_id, seq, payload.kind, encoded, payload.author, ts, ts),
            )
        else:
            conn.execute(
                "UPDATE items SET seq = ?, kind = ?, body = ?, author = ?, updated_at = ?,"
                " deleted = 0 WHERE id = ?",
                (seq, payload.kind, encoded, payload.author, ts, item_id),
            )
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()

    return row_to_item(row)


@app.post("/share", response_model=Item, status_code=202)
def share(
    payload: ShareIn,
    background: BackgroundTasks,
    response: Response,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> Item:
    """The share sheet's endpoint. Returns immediately.

    Extraction takes several seconds (redirect + oEmbed + Claude + geocode), far
    too long to hold a share intent open, so this returns a pending row at once
    and the worker fills it in. The phone learns the result through the ordinary
    seq sync — no second delivery mechanism. Sharing the same link twice returns
    the existing row.
    """
    url = normalize_url(payload.url)
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="url must be http(s)")

    ts = now()
    item_id = str(uuid.uuid4())
    body = {"source_url": url, "shared_text": payload.shared_text}

    with write_txn(conn):
        existing = conn.execute("SELECT * FROM items WHERE source_url = ?", (url,)).fetchone()
        if existing is not None:
            response.status_code = 200
            return row_to_item(existing)
        seq = next_seq(conn)
        conn.execute(
            "INSERT INTO items (id, seq, kind, body, author, status, source_url,"
            " created_at, updated_at, deleted)"
            " VALUES (?, ?, 'place', ?, ?, 'pending', ?, ?, ?, 0)",
            (item_id, seq, json.dumps(body), payload.author, url, ts, ts),
        )
        conn.execute(
            "INSERT INTO jobs (item_id, state, attempts, created_at, updated_at)"
            " VALUES (?, 'queued', 0, ?, ?)",
            (item_id, ts, ts),
        )
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()

    background.add_task(extract.process_item, item_id)
    return row_to_item(row)


@app.post("/parse-booking")
def parse_booking_route(
    payload: BookingIn,
    _: None = Depends(require_token),
) -> dict[str, Any]:
    """Read a pasted confirmation with Claude and hand back raw facts.

    Synchronous, unlike /share: the app is showing a preview while you look at
    it, and this is one model call rather than a four-step pipeline. Returns an
    ISO date rather than a trip day — the app maps that onto its own itinerary.
    503 rather than a guess when no key is configured, so the app falls back to
    its offline regex parser instead of showing nothing.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="text is empty")
    try:
        return booking_parser.parse_booking(payload.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.put("/items/{item_id}/place", response_model=Item)
def set_place(
    item_id: str,
    payload: PlaceIn,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> Item:
    """Pin by hand — what the needs-review queue's 'set location' button calls."""
    with write_txn(conn):
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="not found")
        body = json.loads(row["body"])
        body["place"] = payload.model_dump()
        body["place"]["manual"] = True
        body.pop("review_reason", None)
        conn.execute(
            "UPDATE items SET body = ?, status = 'pinned', updated_at = ?, seq = ? WHERE id = ?",
            (json.dumps(body), now(), next_seq(conn), item_id),
        )
        updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return row_to_item(updated)


@app.patch("/items/{item_id}", response_model=Item)
def update_item(
    item_id: str,
    payload: ItemPatch,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> Item:
    """Omitted fields are left alone. `body` is replaced wholesale, not
    deep-merged — a partial body silently drops the keys it omits."""
    encoded = dump_body(payload.body) if payload.body is not None else None

    with write_txn(conn):
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="not found")
        conn.execute(
            "UPDATE items SET kind = ?, body = ?, author = ?, status = ?,"
            " updated_at = ?, seq = ? WHERE id = ?",
            (
                payload.kind if payload.kind is not None else row["kind"],
                encoded if encoded is not None else row["body"],
                payload.author if payload.author is not None else row["author"],
                payload.status if payload.status is not None else row["status"],
                now(), next_seq(conn), item_id,
            ),
        )
        updated = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()

    return row_to_item(updated)


@app.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
    _: None = Depends(require_token),
) -> None:
    """Soft delete. The row stays as a tombstone so the other phone learns about
    the deletion on its next sync. source_url is released so the same link can
    be shared again later."""
    with write_txn(conn):
        cur = conn.execute(
            "UPDATE items SET deleted = 1, source_url = NULL, updated_at = ?, seq = ? WHERE id = ?",
            (now(), next_seq(conn), item_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not found")

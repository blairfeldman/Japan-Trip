"""Turn a shared TikTok/Instagram link into a pinned place.

Pipeline:  resolve short URL -> oEmbed caption -> Claude extraction -> Google
Places geocode -> update the item and bump its seq so both phones sync it.

The network functions are module-level on purpose: the tests monkeypatch them,
so the pipeline's branching is covered without calling a paid API.
"""

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from db import connect, next_seq, write_txn

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
EXTRACT_MODEL = os.environ.get("EXTRACT_MODEL", "claude-haiku-4-5-20251001")

MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = [2, 5]
HTTP_TIMEOUT = 20.0


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --------------------------------------------------------------------------
# 1. the shared link
# --------------------------------------------------------------------------

def resolve_url(url: str) -> str:
    """TikTok's share sheet hands out vm.tiktok.com/XXXX shortlinks, which the
    oEmbed endpoint won't accept. Follow redirects to the canonical URL."""
    try:
        with httpx.Client(follow_redirects=True, timeout=HTTP_TIMEOUT) as client:
            r = client.head(url)
            resolved = str(r.url)
            # Some shortlinks only redirect on GET.
            if "/video/" not in resolved and "/photo/" not in resolved and "/reel/" not in resolved:
                r = client.get(url)
                resolved = str(r.url)
    except httpx.HTTPError:
        return url
    return resolved.split("?")[0] or url


def fetch_oembed(url: str) -> Optional[dict[str, Any]]:
    """Public, unauthenticated, and the only reliable way to read a post.

    Returns caption (as `title`), author, and thumbnail. It does NOT return the
    transcript, on-screen text, or comments — a post whose location is only
    spoken aloud cannot be parsed from here. That's the main source of
    needs_review, not a bug.

    Instagram goes through Meta's endpoint, which became tokenless on
    2026-06-15; before that it needed an app token and App Review.
    """
    try:
        with httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
            if "instagram.com" in url:
                r = client.get(
                    "https://graph.facebook.com/v25.0/instagram_oembed",
                    params={"url": url, "omitscript": "true"},
                )
            else:
                r = client.get("https://www.tiktok.com/oembed", params={"url": url})
            if r.status_code != 200:
                return None
            return r.json()
    except (httpx.HTTPError, ValueError):
        return None


# --------------------------------------------------------------------------
# 2. the LLM
# --------------------------------------------------------------------------

PLACE_TOOL = {
    "name": "record_place",
    "description": "Record the place and recommendation described in a social post.",
    "input_schema": {
        "type": "object",
        "properties": {
            "place_query": {
                "type": ["string", "null"],
                "description": (
                    "A search string a mapping service could resolve, e.g. "
                    "'Tsuta Ramen, Sugamo, Tokyo'. Null if the post does not "
                    "name a specific findable place."
                ),
            },
            "place_name": {"type": ["string", "null"], "description": "Just the venue name."},
            "city": {"type": ["string", "null"]},
            "country": {"type": ["string", "null"]},
            "category": {
                "type": ["string", "null"],
                "description": "restaurant, bar, cafe, hotel, shop, attraction, other",
            },
            "recommendation": {
                "type": ["string", "null"],
                "description": "One sentence on what to do or order there, in the poster's spirit.",
            },
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        },
        "required": ["place_query", "place_name", "city", "country", "category",
                     "recommendation", "confidence"],
    },
}

EXTRACT_SYSTEM = """You read short social media captions and pull out the place being recommended.

Rules:
- Never invent a place. If the caption doesn't name a specific, findable venue, set place_query to null. A caption like "you HAVE to try this" with no name is a null, not a guess.
- Never output coordinates, latitude, or longitude. A separate mapping service resolves the location; your job is only to name it well.
- Hashtags and the account name are evidence (e.g. #tokyoeats, a city-specific account), but a city alone is not a place. "Somewhere in Tokyo" is a null place_query.
- confidence: high if the venue is named outright, medium if the name is partial or needs the hashtags to disambiguate, low if you are stretching.
- recommendation should be one short sentence and must not add facts the caption doesn't support."""


def extract_place(caption: str, author: str = "", shared_text: str = "") -> dict[str, Any]:
    """Ask Claude for structured fields. Tool use, not free text, so the result
    is schema-checked rather than parsed out of prose."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    from anthropic import Anthropic  # imported lazily so tests need no SDK

    parts = [f"Caption: {caption or '(none)'}"]
    if author:
        parts.append(f"Posted by: {author}")
    if shared_text and shared_text.strip() != caption.strip():
        parts.append(f"Text the user shared alongside it: {shared_text}")

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=EXTRACT_MODEL,
        max_tokens=600,
        system=EXTRACT_SYSTEM,
        tools=[PLACE_TOOL],
        tool_choice={"type": "tool", "name": "record_place"},
        messages=[{"role": "user", "content": "\n".join(parts)}],
    )
    for block in message.content:
        if block.type == "tool_use":
            return dict(block.input)
    raise RuntimeError("model returned no tool_use block")


# --------------------------------------------------------------------------
# 3. the map
# --------------------------------------------------------------------------

def geocode(query: str) -> Optional[dict[str, Any]]:
    """Google Places Text Search. The LLM names the place; this decides where
    it is. Never let the model supply coordinates — it will produce
    plausible-looking ones that are simply wrong."""
    if not GOOGLE_MAPS_API_KEY:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not set")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    }
    with httpx.Client(timeout=HTTP_TIMEOUT) as client:
        r = client.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers=headers,
            json={"textQuery": query, "maxResultCount": 1},
        )
        r.raise_for_status()
        places = r.json().get("places") or []

    if not places:
        return None
    p = places[0]
    loc = p.get("location") or {}
    if loc.get("latitude") is None or loc.get("longitude") is None:
        return None
    return {
        "google_place_id": p.get("id"),
        "name": (p.get("displayName") or {}).get("text"),
        "address": p.get("formattedAddress"),
        "lat": loc["latitude"],
        "lng": loc["longitude"],
    }


# --------------------------------------------------------------------------
# 4. orchestration
# --------------------------------------------------------------------------

def _save(conn: sqlite3.Connection, item_id: str, body: dict[str, Any], status: str) -> None:
    with write_txn(conn):
        conn.execute(
            "UPDATE items SET body = ?, status = ?, updated_at = ?, seq = ? WHERE id = ?",
            (json.dumps(body), status, now(), next_seq(conn), item_id),
        )


def _finish_job(conn: sqlite3.Connection, item_id: str, state: str, error: Optional[str]) -> None:
    with write_txn(conn):
        conn.execute(
            "UPDATE jobs SET state = ?, last_error = ?, updated_at = ? WHERE item_id = ?",
            (state, error, now(), item_id),
        )


def _attempt(conn: sqlite3.Connection, item_id: str) -> None:
    """One full pass. Raises on transient failure so the caller can retry."""
    row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        return
    body = json.loads(row["body"])
    url = row["source_url"] or body.get("source_url", "")

    # The source_url COLUMN stays the normalized shared link — it's the dedupe
    # key and a unique index, so rewriting it here could collide with another
    # row. The resolved link goes in the body instead.
    canonical = resolve_url(url)
    body["canonical_url"] = canonical
    oembed = fetch_oembed(canonical) or {}
    caption = oembed.get("title", "") or ""
    body["post"] = {
        "caption": caption,
        "author": oembed.get("author_name"),
        "author_url": oembed.get("author_url"),
        "thumbnail_url": oembed.get("thumbnail_url"),
    }

    shared_text = body.get("shared_text", "") or ""
    if not caption.strip() and not shared_text.strip():
        body["review_reason"] = "Couldn't read the post — no caption available."
        _save(conn, item_id, body, "needs_review")
        return

    extraction = extract_place(caption, oembed.get("author_name", "") or "", shared_text)
    body["extraction"] = extraction
    if extraction.get("recommendation"):
        body["recommendation"] = extraction["recommendation"]

    query = extraction.get("place_query")
    if not query:
        body["review_reason"] = "The caption doesn't name a specific place."
        _save(conn, item_id, body, "needs_review")
        return

    place = geocode(query)
    if place is None:
        body["review_reason"] = f"No map match for '{query}'."
        _save(conn, item_id, body, "needs_review")
        return

    body["place"] = place
    # A low-confidence read still gets pinned, but flagged, so a wrong pin is
    # visibly a guess rather than silently authoritative.
    body.pop("review_reason", None)
    status = "needs_review" if extraction.get("confidence") == "low" else "pinned"
    if status == "needs_review":
        body["review_reason"] = "Low confidence — check this pin."
    _save(conn, item_id, body, status)


def process_item(item_id: str) -> None:
    """Background worker entry point. Opens its own connection: the request's
    connection is already closed by the time this runs."""
    conn = connect()
    try:
        for attempt in range(MAX_ATTEMPTS):
            with write_txn(conn):
                conn.execute(
                    "UPDATE jobs SET state = 'running', attempts = attempts + 1, updated_at = ?"
                    " WHERE item_id = ?",
                    (now(), item_id),
                )
            try:
                _attempt(conn, item_id)
                _finish_job(conn, item_id, "done", None)
                return
            except Exception as exc:  # noqa: BLE001 - last attempt is recorded below
                error = f"{type(exc).__name__}: {exc}"
                if attempt < MAX_ATTEMPTS - 1:
                    time.sleep(RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)])
                    continue
                row = conn.execute("SELECT body FROM items WHERE id = ?", (item_id,)).fetchone()
                if row is not None:
                    body = json.loads(row["body"])
                    body["review_reason"] = f"Processing failed: {error}"
                    _save(conn, item_id, body, "failed")
                _finish_job(conn, item_id, "failed", error)
                return
    finally:
        conn.close()


def sweep_stuck_jobs() -> list[str]:
    """A deploy restarts the machine and kills any in-flight worker. Anything
    left queued or running is picked up on the next boot."""
    conn = connect()
    try:
        rows = conn.execute(
            "SELECT item_id FROM jobs WHERE state IN ('queued', 'running')"
            " AND attempts < ? ORDER BY created_at ASC",
            (MAX_ATTEMPTS,),
        ).fetchall()
    finally:
        conn.close()
    return [r["item_id"] for r in rows]

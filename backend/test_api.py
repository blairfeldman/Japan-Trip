"""Core sync tests. No network, no API keys — run with `python test_api.py`.

The cursor and paging cases are the ones that matter: get those wrong and the
phone silently skips rows forever rather than failing visibly.
"""

import os
import shutil
import tempfile

TMP = tempfile.mkdtemp(prefix="jt-test-")
os.environ["DATA_DIR"] = TMP
os.environ["APP_TOKEN"] = "test-token"
os.environ.pop("FLY_APP_NAME", None)

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

PASS = FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  PASS", name)
    else:
        FAIL += 1
        print("  FAIL", name, extra)


AUTH = {"Authorization": "Bearer test-token"}

with TestClient(main.app) as c:
    print("\n-- auth --")
    check("health is open", c.get("/health").status_code == 200)
    check("no token is 401", c.get("/items").status_code == 401)
    check("wrong token is 401", c.get("/items", headers={"Authorization": "Bearer nope"}).status_code == 401)
    check("non-bearer is 401", c.get("/items", headers={"Authorization": "test-token"}).status_code == 401)
    check("health reports key config", c.get("/health").json()["extraction"] is False)

    print("\n-- create / read / update / delete --")
    r = c.post("/items", json={"id": "pin-1", "kind": "place", "body": {"name": "Tsuta"}, "author": "blair"}, headers=AUTH)
    check("create returns the row", r.status_code == 200 and r.json()["id"] == "pin-1", r.text)
    check("seq starts at 1", r.json()["seq"] == 1)
    check("body round-trips", c.get("/items/pin-1", headers=AUTH).json()["body"]["name"] == "Tsuta")
    check("unknown id is 404", c.get("/items/nope", headers=AUTH).status_code == 404)

    r = c.patch("/items/pin-1", json={"body": {"name": "Tsuta Sugamo"}}, headers=AUTH)
    check("patch updates", r.json()["body"]["name"] == "Tsuta Sugamo")
    check("patch bumps seq", r.json()["seq"] > 1)
    check("patch leaves omitted fields", r.json()["author"] == "blair")
    check("patch on unknown id is 404", c.patch("/items/nope", json={"body": {}}, headers=AUTH).status_code == 404)

    print("\n-- the phone pushes what it holds (upsert) --")
    # Deviates from a strict create-only POST: the app re-pushes records it has
    # edited locally, so a second POST of the same id must update, not no-op.
    r = c.post("/items", json={"id": "pin-1", "kind": "place", "body": {"name": "Edited"}}, headers=AUTH)
    check("re-POST updates rather than duplicating", r.json()["body"]["name"] == "Edited")
    check("still one row", len([i for i in c.get("/items", headers=AUTH).json()["items"] if i["id"] == "pin-1"]) == 1)

    print("\n-- the sync cursor --")
    c.post("/items", json={"id": "a", "kind": "event", "body": {"n": 1}}, headers=AUTH)
    c.post("/items", json={"id": "b", "kind": "event", "body": {"n": 2}}, headers=AUTH)
    page = c.get("/items", headers=AUTH).json()
    seqs = [i["seq"] for i in page["items"]]
    check("seq is unique and ascending", seqs == sorted(set(seqs)), str(seqs))
    cursor = page["next_seq"]
    check("nothing new after the cursor", c.get(f"/items?since_seq={cursor}", headers=AUTH).json()["items"] == [])
    c.post("/items", json={"id": "cc", "kind": "event", "body": {"n": 3}}, headers=AUTH)
    after = c.get(f"/items?since_seq={cursor}", headers=AUTH).json()
    check("only the new row comes back", [i["id"] for i in after["items"]] == ["cc"], str(after["items"]))
    check("an integer cursor survives a raw URL", c.get(f"/items?since_seq={cursor}", headers=AUTH).status_code == 200)

    print("\n-- paging --")
    for n in range(6):
        c.post("/items", json={"id": f"p{n}", "kind": "bulk", "body": {}}, headers=AUTH)
    first = c.get("/items?kind=bulk&since_seq=0&limit=2", headers=AUTH).json()
    check("a truncated page says so", first["has_more"] is True and len(first["items"]) == 2, str(first))
    seen, cur, guard = [], 0, 0
    while True:
        pg = c.get(f"/items?kind=bulk&since_seq={cur}&limit=2", headers=AUTH).json()
        seen += [i["id"] for i in pg["items"]]
        cur = pg["next_seq"]
        guard += 1
        if not pg["has_more"] or guard > 10:
            break
    check("paging covers every row exactly once", sorted(seen) == sorted(f"p{n}" for n in range(6)), str(seen))

    print("\n-- filters --")
    check("kind filter", all(i["kind"] == "event" for i in c.get("/items?kind=event", headers=AUTH).json()["items"]))

    print("\n-- tombstones --")
    before = c.get("/items", headers=AUTH).json()["next_seq"]
    check("delete is 204", c.delete("/items/a", headers=AUTH).status_code == 204)
    check("delete of unknown id is 404", c.delete("/items/nope", headers=AUTH).status_code == 404)
    inc = c.get(f"/items?since_seq={before}", headers=AUTH).json()["items"]
    check("an incremental sync sees the tombstone", any(i["id"] == "a" and i["deleted"] for i in inc), str(inc))
    cold = c.get("/items?since_seq=0", headers=AUTH).json()["items"]
    check("a cold load does not", all(i["id"] != "a" for i in cold))

    print("\n-- limits --")
    big = c.post("/items", json={"id": "big", "kind": "note", "body": {"x": "y" * 70000}}, headers=AUTH)
    check("oversized body is 413", big.status_code == 413, str(big.status_code))
    check("bad share url is 422", c.post("/share", json={"url": "not-a-url"}, headers=AUTH).status_code == 422)
    check("empty booking text is 422", c.post("/parse-booking", json={"text": "  "}, headers=AUTH).status_code == 422)
    check("booking parse without a key is 503",
          c.post("/parse-booking", json={"text": "JAL 8 Oct 6"}, headers=AUTH).status_code == 503)

print(f"\n{PASS} passed, {FAIL} failed")
shutil.rmtree(TMP, ignore_errors=True)
raise SystemExit(1 if FAIL else 0)

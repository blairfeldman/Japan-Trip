"""Share-pipeline tests. The four network calls are monkeypatched, so this
covers every branch without touching a paid API.

The load-bearing case is "coordinates from the model are ignored": an LLM will
happily produce plausible, wrong coordinates, and a pin in the sea off Yokohama
looks exactly like a correct one.
"""

import os
import shutil
import tempfile

TMP = tempfile.mkdtemp(prefix="jt-share-")
os.environ["DATA_DIR"] = TMP
os.environ["APP_TOKEN"] = "test-token"
os.environ.pop("FLY_APP_NAME", None)

from fastapi.testclient import TestClient  # noqa: E402

import extract  # noqa: E402
import main  # noqa: E402

PASS = FAIL = 0
AUTH = {"Authorization": "Bearer test-token"}


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  PASS", name)
    else:
        FAIL += 1
        print("  FAIL", name, extra)


def stub(*, caption="Best tsukemen 🍜 Tsuta in Sugamo #tokyoeats", extraction=None, place="ok", fail_times=0):
    """Swap the four network functions for canned answers."""
    state = {"calls": 0}
    extract.resolve_url = lambda u: u.split("?")[0]
    extract.fetch_oembed = lambda u: (
        None if caption is None else {"title": caption, "author_name": "tokyo eats", "thumbnail_url": "https://t/x.jpg"}
    )

    def _extract(cap, author="", shared=""):
        state["calls"] += 1
        if state["calls"] <= fail_times:
            raise RuntimeError("transient upstream blip")
        return extraction if extraction is not None else {
            "place_query": "Tsuta, Sugamo, Tokyo", "place_name": "Tsuta", "city": "Tokyo",
            "country": "Japan", "category": "restaurant",
            "recommendation": "Order the tsukemen.", "confidence": "high",
        }

    extract.extract_place = _extract
    extract.geocode = lambda q: (
        None if place is None else
        {"google_place_id": "ChIJ1", "name": "Tsuta", "address": "1-14-1 Sugamo, Tokyo",
         "lat": 35.7336, "lng": 139.7395}
    )
    extract.RETRY_BACKOFF_SECONDS = [0, 0]
    return state


def share_and_run(client, url, shared_text=""):
    """POST /share, then run the worker synchronously so the test can assert."""
    r = client.post("/share", json={"url": url, "shared_text": shared_text, "author": "blair"}, headers=AUTH)
    item = r.json()
    if r.status_code == 202:
        extract.process_item(item["id"])
    return r, client.get(f"/items/{item['id']}", headers=AUTH).json()


with TestClient(main.app) as c:
    print("\n-- the happy path --")
    stub()
    r, item = share_and_run(c, "https://www.tiktok.com/@tokyoeats/video/1?is_from=x")
    check("share returns 202 immediately", r.status_code == 202)
    check("and starts as pending", r.json()["status"] == "pending")
    check("ends up pinned", item["status"] == "pinned", item["status"])
    check("has coordinates", item["body"]["place"]["lat"] == 35.7336)
    check("keeps the recommendation", item["body"]["recommendation"] == "Order the tsukemen.")
    check("keeps the thumbnail", item["body"]["post"]["thumbnail_url"] == "https://t/x.jpg")
    check("seq advanced past the pending row", item["seq"] > r.json()["seq"])

    print("\n-- the model never supplies coordinates --")
    stub(extraction={
        "place_query": "Tsuta, Sugamo, Tokyo", "place_name": "Tsuta", "city": "Tokyo",
        "country": "Japan", "category": "restaurant", "recommendation": "x",
        "confidence": "high", "lat": 1.234, "lng": 5.678,   # invented, must be ignored
    })
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/coords")
    check("geocoder wins over the model", item["body"]["place"]["lat"] == 35.7336, str(item["body"]["place"]))

    print("\n-- when it can't place it --")
    stub(extraction={
        "place_query": None, "place_name": None, "city": None, "country": None,
        "category": None, "recommendation": None, "confidence": "low",
    }, caption="you HAVE to try this 🤤")
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/vague")
    check("an unnamed place needs review", item["status"] == "needs_review")
    check("and says why", "doesn't name a specific place" in item["body"]["review_reason"])
    check("but the post is still saved", item["body"]["post"]["caption"] == "you HAVE to try this 🤤")

    stub(place=None)
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/nomatch")
    check("no map match needs review", item["status"] == "needs_review")
    check("naming the failed query", "Tsuta, Sugamo, Tokyo" in item["body"]["review_reason"])

    stub(extraction={
        "place_query": "Some Ramen, Tokyo", "place_name": "Some Ramen", "city": "Tokyo",
        "country": "Japan", "category": "restaurant", "recommendation": "x", "confidence": "low",
    })
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/lowconf")
    check("low confidence still pins but flags", item["status"] == "needs_review" and "place" in item["body"])

    stub(caption=None)
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/nooembed")
    check("no caption at all needs review", item["status"] == "needs_review")
    stub(caption=None)
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/sharedtext", shared_text="Tsuta in Sugamo")
    check("unless the share carried the caption", item["status"] == "pinned", item["status"])

    print("\n-- the geocoder answering somewhere else --")
    # Found on the first live call: asking for "Tsuta, Sugamo, Tokyo" returned an
    # address in Shibuya, ~8km away. A confident name plus a returned result meant
    # it would have been pinned as authoritative with no signal anything was off.
    stub(extraction={
        "place_query": "Some Ramen, Kyoto", "place_name": "Some Ramen", "city": "Kyoto",
        "country": "Japan", "category": "restaurant", "recommendation": "x", "confidence": "high",
    })
    extract.geocode = lambda q: {"google_place_id": "ChIJ2", "name": "Some Ramen",
                                 "address": "1-1 Namba, Chuo Ward, Osaka", "lat": 34.66, "lng": 135.50}
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/wrongcity")
    check("a match in another city is flagged", item["status"] == "needs_review", item["status"])
    check("naming the city the caption meant", "Kyoto" in item["body"]["review_reason"], item["body"].get("review_reason"))
    check("but the coordinates are still saved", item["body"]["place"]["lat"] == 34.66)

    stub()  # city Tokyo, address "1-14-1 Sugamo, Tokyo"
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/rightcity")
    check("a match in the right city is not flagged", item["status"] == "pinned", item["status"])

    check("no city means no check", extract.locality_mismatch(None, "anywhere") is None)
    check("no address means no check", extract.locality_mismatch("Kyoto", None) is None)
    check("case and spacing are ignored", extract.locality_mismatch("  tokyo ", "Shibuya, TOKYO, Japan") is None)

    print("\n-- retries --")
    stub(fail_times=2)
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/flaky")
    check("recovers on the third attempt", item["status"] == "pinned", item["status"])
    stub(fail_times=99)
    _, item = share_and_run(c, "https://www.tiktok.com/@x/video/broken")
    check("gives up as failed", item["status"] == "failed")
    check("recording the reason", "Processing failed" in item["body"]["review_reason"])

    print("\n-- dedupe and manual pinning --")
    stub()
    r1, _ = share_and_run(c, "https://www.tiktok.com/@x/video/dupe?utm=a")
    r2 = c.post("/share", json={"url": "https://www.tiktok.com/@x/video/dupe?utm=DIFFERENT"}, headers=AUTH)
    check("the same link twice returns the first row", r2.status_code == 200 and r2.json()["id"] == r1.json()["id"])

    review = [i for i in c.get("/items?status=needs_review", headers=AUTH).json()["items"]]
    check("the review queue is one query", len(review) > 0)
    fixed = c.put(f"/items/{review[0]['id']}/place",
                  json={"lat": 35.0, "lng": 135.0, "name": "By hand"}, headers=AUTH).json()
    check("a manual pin clears the review reason", fixed["status"] == "pinned" and "review_reason" not in fixed["body"])
    check("and is marked manual", fixed["body"]["place"]["manual"] is True)

    c.delete(f"/items/{r1.json()['id']}", headers=AUTH)
    r3 = c.post("/share", json={"url": "https://www.tiktok.com/@x/video/dupe"}, headers=AUTH)
    check("deleting frees the link for a re-share", r3.status_code == 202, str(r3.status_code))

print(f"\n{PASS} passed, {FAIL} failed")
shutil.rmtree(TMP, ignore_errors=True)
raise SystemExit(1 if FAIL else 0)

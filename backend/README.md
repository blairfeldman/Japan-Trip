# Japan Trip — backend

FastAPI + SQLite on a Fly volume. It exists for two things:

1. **Sync** — both phones read and write one shared set of records, so a pin
   Blair saves shows up on Yev's phone without swapping a file.
2. **Share-to-pin** — share a TikTok or Instagram post to the app and the
   backend reads the post, works out the place, resolves it to coordinates,
   and it lands on the map.

**The phone stays the source of truth for display.** The app renders from its
own local storage and treats this as a sync target, so it works with no signal
— on a train, underground, or with the backend switched off entirely. Nothing
here is required for the app to run.

## The API

Everything except `/health` needs `Authorization: Bearer <APP_TOKEN>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Open, for Fly's health check. Reports which optional keys are configured |
| GET | `/items?since_seq=&kind=&status=&limit=` | `since_seq=0` is a cold load (live rows only); `>0` is incremental and includes tombstones. Returns `{items, next_seq, has_more}` |
| GET | `/items/{id}` | |
| POST | `/items` | Upsert on a client-supplied id |
| POST | `/share` | Returns `202` + a pending row immediately; re-sharing a known link returns `200` + the existing row |
| POST | `/parse-booking` | `{text}` → booking fields read by Claude. `503` when no key is set, so the app falls back to its offline parser |
| PUT | `/items/{id}/place` | Manual pin — the needs-review queue's "set location" |
| PATCH | `/items/{id}` | Omitted fields unchanged; `body` is replaced wholesale, not deep-merged |
| DELETE | `/items/{id}` | Soft delete → tombstone. Frees `source_url` so the link can be shared again |

`413` over a 64 KB body, `401` bad token, `404` unknown id, `422` malformed input.

`status`: `ok` · `pending` (share accepted, worker running) · `pinned` ·
`needs_review` (saved but not confidently placed; `body.review_reason` says why)
· `failed`. The review queue is one query: `GET /items?status=needs_review`.

`author` is self-reported — both phones share one token, so the server can't
prove who wrote a row. Fine here; don't build anything that trusts it.

### How the app maps onto `items`

`body` is deliberately loose. The app stores each of its record types under a
different `kind`, keeping its own shape inside `body`, with the app's own record
id as the item id:

| `kind` | What |
|---|---|
| `place` | A saved pin |
| `event` | An entry added to a day |
| `event_edit` | A change to an itinerary entry |
| `decision` | A Book it / Skip choice |
| `booking` | A forwarded or pasted confirmation |

## Invariants — changing these back silently corrupts data

**One machine, never two.** The volume holding `app.db` attaches to a single
machine. If Fly scales to two, the second gets its own blank volume and you have
two diverging databases with no error anywhere. `fly.toml` pins this with
`auto_stop_machines = false` and `min_machines_running = 1`. Check `fly status`
after any deploy that touches scaling.

**The sync cursor is an integer, not a timestamp.** Wall clocks jump backwards
on an NTP correction and rows are skipped forever; two writes can share a
microsecond; and an ISO timestamp contains `+`, which decodes as a space in a
query string. `seq` comes from a counter table, allocated inside the write
transaction. `created_at`/`updated_at` are display-only — never page by them.

**Paging must signal `has_more`.** A client that advances its cursor past a
truncated page skips every unreturned row permanently. The handler fetches
`limit + 1` to detect it. The client must loop while `has_more` before idling.

**The model names places; the geocoder locates them.** Claude returns a
`place_query` string and is instructed never to emit coordinates. Ask an LLM for
coordinates and it produces confident, plausible, wrong ones — a pin in the sea
off Yokohama looks exactly like a correct one. If the caption doesn't name a
real place the answer is `null`, not a guess.

**Indexes are created after migrations, never inside the schema script.** An
index on a column a migration is about to add works on a fresh database and
raises `no such column` on an existing volume — a crash-looping deploy over data
you already have. `init_db()` runs tables → `migrate()` → indexes.

## Run it locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8080     # token defaults to "dev-token"
python test_api.py && python test_share.py && python test_invariants.py
# interactive docs at http://localhost:8080/docs
```

## Deploy

Install flyctl — **Windows (PowerShell)**:

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

macOS/Linux: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`.

Then, from this directory:

```powershell
fly auth signup            # or: fly auth login
fly launch --no-deploy --name YOUR-APP-NAME --region nrt
#   decline the Postgres/Redis offer
#   if launch rewrites fly.toml, check the scaling guard survived
fly volumes create data --size 1 --region nrt   # must match [mounts].source AND the region
fly secrets set APP_TOKEN=<a long random string>   # copy it; both phones need it
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set GOOGLE_MAPS_API_KEY=...
fly deploy
fly scale count 1                               # confirm — see the invariant above
fly status                                      # expect exactly one machine
curl https://YOUR-APP-NAME.fly.dev/health
```

Fly no longer has a standing free tier — new accounts get a short trial and
then need a card on file. This runs about $2–3/month. Set a spend limit under
Billing once the account exists.

Then point the app at it: `EXPO_PUBLIC_API_BASE_URL` and
`EXPO_PUBLIC_API_TOKEN`, set both in `app/.env` and as EAS environment
variables (see `app/README.md` — `.env` is gitignored, so EAS never sees it).

Without `ANTHROPIC_API_KEY` or `GOOGLE_MAPS_API_KEY` the app still boots and
ordinary sync works; shares fail into `status: failed` with the missing-key
reason in `review_reason`, and `/parse-booking` returns `503`.

### The server's Google key

It must be a **different** key from the one in the APK. The Android key is
restricted to your package + signing certificate, so this one can't reuse it.

**Set Application restrictions to "None"** — none of Google's three options fit
a server. "Websites" is for browser JavaScript, "Android apps" is the APK key,
and IP restriction breaks here: Fly machines egress through a shared NAT pool
whose address changes when a machine is recreated or moved
(https://fly.io/docs/networking/egress-ips/), so an IP allowlist would work
until some unrelated redeploy and then fail silently.

Two controls carry the weight instead:

- **API restrictions → Places API (New) only.** A leaked key can then do
  nothing but place lookups.
- **A daily quota cap** on that API (Quotas in the Cloud console). Two people
  won't approach 100 requests/day, and a cap bounds the damage from an abused
  key to pennies.

That's a different threat model from the Android key, which ships inside an APK
anyone can unzip. This one only ever exists in `fly secrets`.

If you later want IP restriction, Fly sells app-scoped static egress IPs at
about $3.60/month per region — roughly triple the cost of the machine itself,
so it isn't worth it at this size.

Day to day: `fly logs`, `fly ssh console`, `fly deploy`, `fly secrets list`.

### Backups

Volume snapshots exist (5-day retention) but aren't yours to control:

```bash
fly ssh console -C "sqlite3 /data/app.db '.backup /data/backup.db'"
fly ssh sftp get /data/backup.db ./app-backup-$(date +%F).db
```

Use `.backup`, not a raw copy — with WAL on, a plain copy can miss committed
writes still sitting in the `-wal` file.

### Cost

Machine + 1 GB volume is roughly $2–3/month. Extraction is a few hundred input
tokens and ~150 output per share, so a hundred shares a month rounds to nothing.
Google Places Text Search bills per request against a monthly free credit two
people won't approach. Check current rates and set a spend limit on each account.

## Test status

`python test_api.py` — 30 cases: auth, CRUD, upsert-on-re-POST, the integer
cursor (including surviving a raw URL), paging with `has_more` covering every
row exactly once, kind filtering, tombstones reaching an incremental sync while
staying hidden from a cold load, the 64 KB cap, and the `503`/`422` paths on
`/parse-booking`.

`python test_share.py` — 24 cases with the network stubbed: happy path to
`pinned`; **coordinates from the model ignored in favour of the geocoder's**; no
named place, no map match, and no caption each landing in `needs_review` with a
reason and the post still saved; low confidence pinned but flagged; recovery on
the third attempt and `failed` after that; re-sharing a link with different
tracking params returning the original row; manual pin clearing the review
reason; deleting freeing the link for a re-share.

`python test_invariants.py` — 9 cases: 120 concurrent POSTs across 16 threads
yielding a contiguous `seq` run with no duplicates, and an old-schema database
migrating cleanly with rows intact, the counter preserved, indexes built, and a
second boot as a no-op.

**Not verified:** the live request/response shapes of the two paid APIs are
written from their documentation and exercised only through stubs. Smoke-test
each once before trusting the pipeline:

```bash
python -c "
import os; os.environ.setdefault('ANTHROPIC_API_KEY','sk-ant-...')
import extract; print(extract.extract_place('Best tsukemen 🍜 Tsuta in Sugamo #tokyoeats'))"

python -c "
import os; os.environ.setdefault('GOOGLE_MAPS_API_KEY','...')
import extract; print(extract.geocode('Tsuta, Sugamo, Tokyo'))"
```

If the Places response shape has moved, `geocode()` is the only function to
adjust; if the SDK's tool-use interface has moved, it's `extract_place()`. Both
are small and isolated for exactly this reason.

## Accepted limits

- One machine → a deploy is a few seconds of downtime, and no HA.
- Background work is in-process. A deploy mid-extraction is handled by the boot
  sweep, but there's no queue outside the app.
- No rate limiting. The URL is public and will get scanned; 401s are cheap, but
  add a limiter if the logs get noisy.
- Tombstones accumulate forever. Purge ones older than both phones' last sync if
  the table ever gets big.
- `PATCH` replaces `body` wholesale — a partial body drops the keys it omits.
- Last-write-wins conflicts. Two people editing one row within seconds isn't a
  real scenario here.
- The token ships inside the APK, so whoever holds the APK holds it. Acceptable
  for an unpublished two-person app; rotate with `fly secrets set` + a rebuild.

## Note on `server/`

`../server/` is the earlier Node/Express prototype. It was never deployed and
this replaces it. It's left in the tree rather than deleted so you can decide;
nothing points at it any more.

# Improvements log

A running list of changes made to the app, what they actually did (measured,
not guessed), and what they cost us. Every number here comes from the load-test
harness in [loadtest/](loadtest/README.md) on the same small box: backend and
MySQL with 1 vCPU and 1 GB each.

Starting point: [loadtest/BASELINE.md](loadtest/BASELINE.md).

---

## 001 — Let MySQL generate IDs (fixes the write deadlock)

**Date:** 2026-10-03
**Files:** the six entities in `Backend/src/main/java/com/whatsapp/Web/model/`, plus
[Backend/migrations/001_identity_ids.sql](Backend/migrations/001_identity_ids.sql)

### What was wrong

- Every entity used `@GeneratedValue(strategy = GenerationType.AUTO)`.
- On MySQL, Hibernate turns that into a homemade sequence table (`message_seq`,
  `user_seq`, ...) and hands out IDs in batches of 50.
- Every 50th insert, the thread grabbing the next batch takes a lock and needs a
  *second* database connection to do it.
- We only have 10 connections, and each request holds its own one until it
  finishes. When ~10 requests were inserting at once, all 10 connections
  belonged to threads waiting on that lock, and the lock holder could never get
  its extra connection. Everyone waited on everyone: a deadlock.
- What that looked like: past ~50 writes/s the whole backend froze. CPU
  dropped to almost zero, every request timed out after 10 s, and even the
  profile page stopped loading until traffic went away.

### What we changed

- One line in each of the six entities:
  `GenerationType.AUTO` → `GenerationType.IDENTITY`
- Now MySQL's own `AUTO_INCREMENT` picks the ID inside the `INSERT`, using the
  connection the request already has. No lock, no second connection, nothing to
  deadlock on.
- Existing databases need a one-time migration (`001_identity_ids.sql`), because
  Hibernate won't add `AUTO_INCREMENT` to existing columns by itself. Tested on a
  copy with 30k messages and 3k users: took 21 s and kept every row and ID.
- Applied to the local dev database (`chat_app_mysql_data`) on 2026-10-03,
  after a full backup in `backups/`. All row counts and max IDs were identical
  before and after, and a test insert got the next ID (255 after 254).

### What it did (measured)

Clean A/B test: same fresh data, same machine, back to back, and only these six
lines different. Reports:
[before](loadtest/improvements/001-identity-ids/REPORT-before-auto.md),
[after](loadtest/improvements/001-identity-ids/REPORT-after-identity.md).

**Under overload, it keeps working instead of freezing.** At 100 writes/s (2×
what the box can comfortably take):

| | Before | After |
|---|---|---|
| Messages actually saved | 7/s | 43/s (**6× more**) |
| Failed requests | 98% | **0%** |
| Chats created | 6/s | 45/s |
| Backend CPU | ~5% (stuck, doing nothing) | ~100% (busy, doing real work) |
| Backend after the test | frozen, needed traffic to stop | **healthy straight away** |

**At 700 concurrent users** (the point where the old code died):

- Before: every message send failed and the backend froze.
- After: zero errors, messages still flowing (~45/s delivered), just slowly
  (p95 about 3 s) because the CPU is maxed out. And it recovers by itself when load drops.

**What did NOT change:** the comfortable limits stayed about the same.

- Still about **50 writes/s** and **400 concurrent users** within our latency
  targets.
- That's expected. The deadlock was hiding the next bottleneck: each message
  send burns ~17–19 ms of backend CPU, so one core tops out around 50/s whether
  or not anything deadlocks.
- So this fix changed *how* the app fails (gracefully instead of falling over),
  not *when* it starts to struggle.

### Trade-offs

- **No insert batching.** With `IDENTITY`, Hibernate has to send each insert
  separately to learn the new ID. Today this only matters for publishing a key
  bundle (100 prekeys saved one by one), and that code was already inserting
  them one at a time, so nothing got slower. If we ever need it, a single
  multi-row `INSERT` for prekeys fixes it.
- **The database owns the IDs.** The app can't know an ID before the row is
  saved, and IDs are tied to one MySQL instance. That's fine today. If we
  ever split data across several databases, we'll want app-generated IDs
  (ULID/UUIDv7/Snowflake) instead.
- **A migration step for existing databases.** It's a one-off, but each
  `ALTER TABLE` rebuilds the table and blocks writes to it while it runs:
  seconds for us, potentially minutes on big production tables. Run it in a
  quiet window and take a backup first.

### Things we learned along the way

- **Measure before and after on the same day.** A first comparison against the
  morning's baseline looked *worse* after the fix. It turned out the machine
  was ~25% slower in the afternoon (login, which is pure CPU, went from 86 ms to
  110 ms), and the database had grown a lot from earlier tests. Re-running both
  versions back to back on fresh data gave the honest answer.
- **Don't trust a verdict from five samples.** One endpoint "failed" because a
  single slow request out of five pushed its p95 over the line. The harness now
  ignores steps with fewer than 20 samples for pass/fail.

### What's next (suggested by these numbers)

1. **Cut the CPU cost of sending a message** (~17–19 ms each). Likely suspects:
   the JWT is parsed twice per request, the user is looked up by an unindexed
   `email`, and the response serialises the whole chat with every member. A
   profiler run on `POST /api/messages/create` would tell us which.
2. **Shed load instead of queueing it.** Under overload, threads pile up (to
   ~220) and latency climbs into seconds. Better to reject extra requests fast
   with a 503 and keep the rest snappy.
3. **Give the JVM more of the container's memory** (`-XX:MaxRAMPercentage=75`):
   a one-line change that should move the WebSocket crash point well past
   ~2,400 connections.

---

<!-- Template for the next entry:

## 00N — <short name>

**Date:** · **Files:**

### What was wrong
### What we changed
### What it did (measured)   (A/B on fresh data, link both reports)
### Trade-offs
### What's next
-->

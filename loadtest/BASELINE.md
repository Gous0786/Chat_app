# Baseline — the app as originally built (2026-10-03)

This is the "before" picture for the rebuild. Every number below comes from
`./run.sh` on the stack in [docker-compose.yml](docker-compose.yml). The full
per-step tables (latency percentiles, CPU, memory, threads per load step) are in
[baseline/REPORT-1cpu-1g.md](baseline/REPORT-1cpu-1g.md). Re-run the same
harness against the rebuild and compare. Changes made since are tracked in
[IMPROVEMENTS.md](../IMPROVEMENTS.md).

## Setup

| | |
|---|---|
| Backend | 1 vCPU, 1 GB RAM. JVM defaults for that size: **256 MB heap, SerialGC** (the Dockerfile sets no JVM flags) |
| MySQL 8.0 | 1 vCPU, 1 GB RAM |
| Load generator | k6 v2.3.0 in its own container, 2 vCPU |
| Data | 2,000 users, 1,000 1:1 chats with 10+ messages each, 100 Signal key bundles, plus chats with 10/100/1,000/5,000 messages |
| SLO ("knee") | p95 ≤ 500 ms for HTTP, ≤ 1,000 ms for socket connect and end-to-end delivery, ≤ 1% errors, ≥ 90% of offered load served |
| Isolation | Backend restarted and warmed up before every endpoint, so one test's damage can't leak into the next |
| Noise | Another Docker project used ~1.7 cores of the 6-core VM throughout. Knees reproduced across runs to within ±1 load step |

## Headline numbers

| Capability | Baseline | Limited by |
|---|---|---|
| **Concurrent active users** (full app flow, 1 msg / 15 s each) | **400** | Pool deadlock at 700 (100% of sends fail) |
| Open WebSocket connections | **~2,000 OK, ~2,400 OOM-crashes the backend** | 256 MB heap |
| Realtime broker, socket-only (no DB) | **3,000 msg/s**, p95 66 ms | Backend CPU |
| Send message (REST persist) | **50 req/s** | Pool deadlock |
| Open/create 1:1 chat | **50 req/s** | Pool deadlock |
| Publish Signal key bundle | **30 req/s** | Pool deadlock |
| Login | **10 req/s** | BCrypt on backend CPU |
| Signup | **10 req/s** | BCrypt, then pool deadlock |
| Profile (JWT → user) | **400 req/s** | Backend CPU |
| User search | **300 req/s** | MySQL CPU (full-table `LIKE '%q%'`) |
| Chat list | **50–100 req/s** | Backend CPU (N+1 lazy loading) |
| Message history (10–30 msgs) | **100 req/s** | Backend CPU |
| Fetch key bundle | **100 req/s** (p95 79 ms; 265 ms when all hit one user) | Backend CPU; row lock adds latency |

Unloaded latency, one user at a time (p50 / p95): login 86/118 ms, send message
20/35 ms, profile 5/9 ms, socket connect 5/10 ms, broker round trip 2/6 ms,
history 11 ms at 10 messages vs 61/156 ms at 5,000.

## What the numbers say

### 1. Writes deadlock instead of slowing down (most important)

Every endpoint that inserts a row hits the same wall. One step past its knee,
CPU *collapses* (72% → 7% on message send), all ~200 Tomcat threads park, every
request times out, and the app stays wedged until load stops.

The cause is confirmed with a thread dump
([evidence/backend-threaddump-wedged.txt](baseline/evidence/pool-deadlock-threaddump.txt)):

1. Entities use `@GeneratedValue(strategy = GenerationType.AUTO)`. On MySQL,
   Hibernate 6 implements that as a **table-backed sequence** (`message_seq`,
   `user_seq`, …) that hands out IDs in blocks of 50.
2. Every 50th insert, the thread holding the generator's lock needs a
   **second, separate connection** to fetch the next block.
3. The pool has only **10 connections**, and with open-session-in-view each
   request holds its connection for its whole lifetime. When 10 requests are
   inside an insert path, all 10 connections are held by threads waiting on
   that lock, so the lock holder never gets its extra connection.
4. Nothing moves until Hikari's 30 s timeout, and new arrivals rebuild the jam.

It needs only ~10 concurrent inserts, not high throughput: a cold JVM after a
restart deadlocked at ~8 req/s of mixed traffic. This one bug is what caps
concurrent users at 400–700.

### 2. Memory caps the socket count

Each open STOMP session costs roughly 100 KB of heap. With the default 256 MB
heap the backend holds 2,000 sockets fine (p95 broker round trip 16 ms), but at
~2,400 it throws `OutOfMemoryError`
([evidence/ws-oom-excerpt.txt](baseline/evidence/ws-oom-excerpt.txt)). The error
also kills Tomcat's acceptor thread, so the process stays up but never accepts
another connection: a zombie that a liveness check on `GET /` would not catch.

### 3. The realtime path is not the bottleneck; the REST + DB path is

The in-memory STOMP broker moved 3,000 msg/s (6,000 deliveries/s with fan-out)
on one core. The same message going through `POST /api/messages/create` tops
out at 50/s. Today every message goes over REST, then the client re-publishes
it over the socket (two hops, and the server trusts the client's copy).

### 4. CPU-bound reads

* **Login/signup at ~10/s per core** is BCrypt (cost 10, ~85 ms CPU each). That
  is intended security cost; it just needs to be off the request threads or
  scaled out.
* **Chat list** costs ~4× a profile read: each chat lazily loads members,
  admins and messages (N+1 queries) and serialises the whole object graph.
* **History has no pagination**: the cost grows with chat length (p95 156 ms at
  5,000 messages, unloaded), and every message embeds its full chat and user
  objects.
* **Search** is the one endpoint where MySQL saturates first: `LIKE '%q%'` on
  unindexed columns, with no result limit.
* Every authenticated request parses the JWT twice and looks up the user by
  `email`, which has no index.

### 5. Things that did *not* matter (at this scale)

* **`spring.jpa.show-sql=true`**: turning SQL logging off changed no knee by more
  than run-to-run noise ([experiment](baseline/REPORT-experiment-showsql-off.md)).
  Worth turning off anyway, but it is not where the time goes.

## Rebuild checklist this suggests

Ordered by impact on the numbers above:

1. **ID generation**: `IDENTITY` (MySQL auto-increment) or app-generated IDs
   (UUIDv7/ULID/Snowflake), and size the pool deliberately. *Target: writes
   degrade gracefully, no deadlock at any load.*
2. **Turn off open-session-in-view**, and keep transactions short so a request
   holds a DB connection only while it actually uses it.
3. **Persist on the socket path** (or via a queue) instead of REST-then-republish;
   authenticate the STOMP session and authorise topics server-side.
4. **JVM sizing** (`-XX:MaxRAMPercentage=75`) and a per-connection memory
   budget; health checks that exercise the DB and accept sockets, not just
   `GET /`.
5. **Paginate history**, return DTOs instead of entity graphs, fix the N+1 in
   the chat list.
6. **Index `user.email`** (unique), cache the user per token, parse the JWT once.
7. **Search**: prefix match on an index, or a search engine, plus a result limit.
8. **Horizontal scale**: the in-memory SimpleBroker and in-JVM state pin
   everything to one instance; a broker relay (Redis/RabbitMQ) lets you add
   instances behind a load balancer.

## Reproduce

```bash
cd loadtest
./run.sh                                   # everything (~90 min incl. restarts)
RUN_ID=after-fix ./run.sh 04 08            # just writes + concurrent users
```

Compare `results/<run>/REPORT.md` with [baseline/REPORT-1cpu-1g.md](baseline/REPORT-1cpu-1g.md).
Change one thing per run (code *or* budget), and stop other containers for the
cleanest numbers.

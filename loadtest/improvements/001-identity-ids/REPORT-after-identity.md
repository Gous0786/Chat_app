# Load test baseline — ab-after-identity

| | |
|---|---|
| Backend budget | 1 vCPU, 1g RAM (JVM: MaxHeapSize 268435456;UseG1GC false;UseSerialGC true;) |
| MySQL budget | 1 vCPU, 1g RAM |
| Load generator | k6 in its own container, 2 vCPU (k6 v2.3.0 (commit/e088784614, go1.27.1, linux/amd64)) |
| Code | f88ab99 + uncommitted backend changes, spring.jpa.show-sql=true |
| Data | 2000 users, 1000 1:1 chats, 10 msgs/chat, 100 key bundles |
| Docker VM | 6 CPUs, 13.7 GiB; other containers used ~-% CPU (100% = 1 core) during tests |
| SLO | p95 ≤ 500 ms for HTTP (1000 ms for WebSocket connect / end-to-end delivery), errors ≤ 1%, open-loop tests must serve ≥ 90% of offered rate |

## Headline: capacity per feature

The **knee** is the highest load step that still met the SLO. "Limit" is what ran out at the next step.

| Feature | Knee | p95 at knee | Tested up to | Limit hit at next step |
|---|---|---|---|---|
| **Concurrent active users (full app flow)** | 400 users | - | 2000 | Send -> delivered to peer (REST persist + broker), end to end; POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/chats/user (app open); GET /api/users/query |
| POST /api/chats/single (open/create a 1:1 chat) | 50 req/s | 119 ms | 450 | backend CPU (101%) |
| POST /api/messages/create (persist one E2E message) | 50 req/s | 126 ms | 800 | backend CPU (102%) |
| Send -> delivered to peer (REST persist + broker), end to end | 400 concurrent users | 132 ms | 2000 | backend CPU (89%) |
| POST /api/messages/create | 400 concurrent users | 83 ms | 2000 | backend CPU (89%) |
| GET /api/messages/chat/{id} (open chat) | 400 concurrent users | 487 ms | 2000 | backend CPU (89%) |
| GET /api/chats/user (app open) | < 700 concurrent users | - | 2000 | backend CPU (89%) |
| GET /api/users/profile (app open) | < ? concurrent users | - | 2000 | not reached |
| GET /api/users/query | 400 concurrent users | 11 ms | 2000 | backend CPU (89%) |
| WebSocket connect (SockJS + STOMP) at app open | 700 concurrent users | 888 ms | 2000 | queueing / contention (backend 61%, MySQL 35% CPU) |

## 01-baseline

| Operation | p50 ms | p95 ms | p99 ms | max ms | n | errors |
|---|---|---|---|---|---|---|
| GET / (framework floor, no auth, no DB) | 2.4 | 3.7 | 4.7 | 5.0 | 40 | 0% |
| POST /auth/login | 109.7 | 293.9 | 340.7 | 369.9 | 40 | 0% |
| POST /auth/signup | 107.0 | 157.7 | 212.9 | 220.0 | 40 | 0% |
| GET /api/users/profile | 5.4 | 12.6 | 38.3 | 51.6 | 40 | 0% |
| GET /api/users/query?query= | 5.0 | 7.3 | 11.5 | 14.1 | 40 | 0% |
| GET /api/chats/user | 52.6 | 98.8 | 112.3 | 113.6 | 40 | 0% |
| POST /api/chats/single | 16.3 | 29.7 | 31.4 | 31.6 | 40 | 0% |
| GET /api/messages/chat/{id} (10 msgs) | 10.2 | 17.6 | 46.1 | 64.2 | 40 | 0% |
| GET /api/messages/chat/{id} (100 msgs) | 11.9 | 70.9 | 88.2 | 98.4 | 40 | 0% |
| GET /api/messages/chat/{id} (1000 msgs) | 22.6 | 68.1 | 76.8 | 81.5 | 40 | 0% |
| GET /api/messages/chat/{id} (5000 msgs) | 72.9 | 176.4 | 285.1 | 296.5 | 40 | 0% |
| POST /api/messages/create | 16.4 | 71.6 | 85.3 | 86.2 | 40 | 0% |
| POST /api/keys/bundle (100 prekeys) | 82.0 | 287.3 | 315.0 | 326.8 | 40 | 0% |
| GET /api/keys/bundle/{userId} | 14.7 | 66.2 | 81.4 | 88.3 | 40 | 0% |
| GET /api/keys/count | 7.1 | 16.3 | 29.8 | 36.9 | 40 | 0% |
| WebSocket: SockJS open + STOMP CONNECTED | 5.0 | 12.7 | 38.6 | 46.0 | 40 | - |
| WebSocket: publish -> broker -> subscriber round trip | 3.0 | 5.0 | 15.1 | 33.0 | 200 | - |

## 04-writes--chat_create

#### POST /api/chats/single (open/create a 1:1 chat)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 27.1 | 48.8 | 77.1 | 100 | 0.00 | 57 | 25 | 255 | 36 | ok |
| 50 | 50.0 | 20.6 | 119.0 | 181.0 | 261 | 0.00 | 86 | 42 | 271 | 46 | ok |
| 100 | 44.8 | 2254.1 | 5275.1 | 5473.8 | 7604 | 0.00 | 101 | 58 | 358 | 226 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 119.0 ms, 50.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.14 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T17:26:08Z" level=error msg="thresholds on metrics 'http_req_duration{name:chat_create,step:2}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 04-writes--message_send

#### POST /api/messages/create (persist one E2E message)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 28.6 | 46.7 | 68.7 | 109 | 0.00 | 62 | 27 | 254 | 36 | ok |
| 50 | 50.1 | 21.9 | 126.1 | 176.2 | 266 | 0.00 | 87 | 43 | 262 | 41 | ok |
| 100 | 42.6 | 2448.8 | 5039.4 | 5454.7 | 7666 | 0.00 | 102 | 61 | 342 | 223 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 600 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 800 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 126.1 ms, 50.1/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.15 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T17:23:50Z" level=error msg="thresholds on metrics 'http_req_duration{name:message_send,step:2}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 08-mixed-users

#### Send -> delivered to peer (REST persist + broker), end to end

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.5 | 39.0 | 54.5 | 55.6 | 56 | 0.00 | 11 | 5 | 251 | 44 | ok |
| 50 | 3.2 | 37.0 | 54.0 | 57.2 | 59 | 0.00 | 17 | 9 | 258 | 37 | ok |
| 100 | 6.9 | 33.0 | 51.9 | 59.1 | 64 | 0.00 | 26 | 12 | 283 | 37 | ok |
| 200 | 13.3 | 31.0 | 69.6 | 101.4 | 171 | 0.00 | 40 | 21 | 297 | 37 | ok |
| 400 | 26.4 | 29.0 | 131.6 | 720.1 | 974 | 0.00 | 56 | 32 | 346 | 67 | ok |
| 700 | 44.5 | 136.0 | 3111.0 | 4950.0 | 8585 | 0.00 | 89 | 51 | 476 | 234 | FAIL |
| 1000 | 1.8 | 3566.0 | 5703.5 | 7037.0 | 7070 | 0.00 | 61 | 35 | 499 | 228 | FAIL |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 131.6 ms, 26.4/s served)

#### POST /api/messages/create

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.6 | 35.6 | 48.4 | 50.2 | 50 | 0.00 | 11 | 5 | 251 | 44 | ok |
| 50 | 3.2 | 34.0 | 48.9 | 53.0 | 54 | 0.00 | 17 | 9 | 258 | 37 | ok |
| 100 | 6.9 | 30.1 | 47.6 | 52.2 | 59 | 0.00 | 26 | 12 | 283 | 37 | ok |
| 200 | 13.4 | 27.8 | 61.1 | 95.3 | 168 | 0.00 | 40 | 21 | 297 | 37 | ok |
| 400 | 25.9 | 25.4 | 83.3 | 399.5 | 861 | 0.00 | 56 | 32 | 346 | 67 | ok |
| 700 | 41.5 | 99.7 | 2511.5 | 4434.7 | 6926 | 0.00 | 89 | 51 | 476 | 234 | FAIL |
| 1000 | 0.1 | 1604.4 | 1623.8 | 1625.5 | 1626 | 0.00 | 61 | 35 | 499 | 228 | too few samples (3) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 83.3 ms, 25.9/s served)

#### GET /api/messages/chat/{id} (open chat)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.1 | 16.4 | 24.3 | 25.0 | 25 | 0.00 | 11 | 5 | 251 | 44 | too few samples (3) |
| 50 | 0.1 | 18.6 | 20.7 | 20.8 | 21 | 0.00 | 17 | 9 | 258 | 37 | too few samples (4) |
| 100 | 0.5 | 16.9 | 24.5 | 26.4 | 27 | 0.00 | 26 | 12 | 283 | 37 | too few samples (13) |
| 200 | 0.5 | 16.0 | 46.3 | 78.4 | 86 | 0.00 | 40 | 21 | 297 | 37 | too few samples (14) |
| 400 | 2.0 | 20.3 | 487.5 | 585.8 | 688 | 0.00 | 56 | 32 | 346 | 67 | ok |
| 700 | 6.4 | 1915.9 | 4303.7 | 5612.8 | 7400 | 0.00 | 89 | 51 | 476 | 234 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 61 | 35 | 499 | 228 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 487.5 ms, 2.0/s served)

#### GET /api/chats/user (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 38.9 | 38.9 | 38.9 | 39 | 0.00 | 11 | 5 | 251 | 44 | too few samples (1) |
| 50 | 0.0 | 16.2 | 16.2 | 16.2 | 16 | 0.00 | 17 | 9 | 258 | 37 | too few samples (1) |
| 100 | 0.0 | 59.9 | 59.9 | 59.9 | 60 | 0.00 | 26 | 12 | 283 | 37 | too few samples (1) |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 40 | 21 | 297 | 37 | no data |
| 400 | 0.3 | 603.6 | 895.4 | 901.3 | 903 | 0.00 | 56 | 32 | 346 | 67 | too few samples (7) |
| 700 | 1.9 | 2340.9 | 4494.4 | 5217.4 | 5895 | 0.00 | 89 | 51 | 476 | 234 | FAIL |
| 1000 | 0.1 | 370.6 | 1444.5 | 1540.0 | 1564 | 0.00 | 61 | 35 | 499 | 228 | too few samples (3) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/profile (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 10.1 | 10.1 | 10.1 | 10 | 0.00 | 11 | 5 | 251 | 44 | too few samples (1) |
| 50 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 17 | 9 | 258 | 37 | no data |
| 100 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 26 | 12 | 283 | 37 | no data |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 40 | 21 | 297 | 37 | no data |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 56 | 32 | 346 | 67 | no data |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 89 | 51 | 476 | 234 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 61 | 35 | 499 | 228 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/query

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.3 | 9.7 | 12.9 | 13.5 | 14 | 0.00 | 11 | 5 | 251 | 44 | too few samples (9) |
| 50 | 0.4 | 10.4 | 20.8 | 25.5 | 27 | 0.00 | 17 | 9 | 258 | 37 | too few samples (11) |
| 100 | 0.8 | 8.8 | 20.7 | 45.1 | 52 | 0.00 | 26 | 12 | 283 | 37 | ok |
| 200 | 1.5 | 7.8 | 10.3 | 34.1 | 48 | 0.00 | 40 | 21 | 297 | 37 | ok |
| 400 | 3.0 | 6.8 | 11.5 | 37.1 | 54 | 0.00 | 56 | 32 | 346 | 67 | ok |
| 700 | 4.8 | 49.5 | 2226.2 | 3038.4 | 3478 | 0.00 | 89 | 51 | 476 | 234 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 61 | 35 | 499 | 228 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 11.5 ms, 3.0/s served)

#### WebSocket connect (SockJS + STOMP) at app open

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.9 | 8.0 | 11.0 | 15.6 | 17 | 0.00 | 11 | 5 | 251 | 44 | ok |
| 50 | 0.9 | 5.0 | 11.2 | 12.8 | 13 | 0.00 | 17 | 9 | 258 | 37 | ok |
| 100 | 1.8 | 5.0 | 9.0 | 11.0 | 12 | 0.00 | 26 | 12 | 283 | 37 | ok |
| 200 | 3.6 | 5.0 | 12.0 | 15.5 | 61 | 0.00 | 40 | 21 | 297 | 37 | ok |
| 400 | 7.1 | 13.5 | 180.1 | 202.1 | 286 | 0.00 | 56 | 32 | 346 | 67 | ok |
| 700 | 10.7 | 106.5 | 888.4 | 1218.6 | 1294 | 0.00 | 89 | 51 | 476 | 234 | ok |
| 1000 | 5.9 | 180.0 | 1863.5 | 2550.4 | 2611 | 0.00 | 61 | 35 | 499 | 228 | FAIL |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 700 concurrent users (p95 888.4 ms, 10.7/s served)

**Concurrent active users sustained within SLO:** 400 — broke at 700 users on: Send -> delivered to peer (REST persist + broker), end to end; POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/chats/user (app open); GET /api/users/query

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.12 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T17:31:40Z" level=warning msg="setTimeout 5 was stopped because the VU iteration was interrupted"
time="2026-10-03T17:31:40Z" level=warning msg="setTimeout 2 was stopped because the VU iteration was interrupted"
time="2026-10-03T17:31:40Z" level=warning msg="setTimeout 1 was stopped because the VU iteration was interrupted"
time="2026-10-03T17:31:40Z" level=warning msg="setTimeout 11 was stopped because the VU iteration was interrupted"
time="2026-10-03T17:31:40Z" level=warning msg="setTimeout 2 was stopped because the VU iteration was interrupted"
```
</details>


---
Columns: *achieved/s* is completed requests per second during the hold part of each step (ramp excluded). Resource columns are averages (CPU) or peaks (memory, threads) from `docker stats` over the same window; 100% CPU = one full core.

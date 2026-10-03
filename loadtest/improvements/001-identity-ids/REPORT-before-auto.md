# Load test baseline — ab-before-auto

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
| **Concurrent active users (full app flow)** | 400 users | - | 2000 | POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/chats/user (app open); GET /api/users/query |
| POST /api/chats/single (open/create a 1:1 chat) | 50 req/s | 181 ms | 450 | errors (100.0%) before CPU saturation |
| POST /api/messages/create (persist one E2E message) | 50 req/s | 170 ms | 800 | errors (98.2%) before CPU saturation |
| Send -> delivered to peer (REST persist + broker), end to end | 400 concurrent users | 72 ms | 2000 | not reached |
| POST /api/messages/create | 400 concurrent users | 53 ms | 2000 | errors (100.0%) before CPU saturation |
| GET /api/messages/chat/{id} (open chat) | 400 concurrent users | 284 ms | 2000 | errors (100.0%) before CPU saturation |
| GET /api/chats/user (app open) | < 700 concurrent users | - | 2000 | errors (100.0%) before CPU saturation |
| GET /api/users/profile (app open) | < ? concurrent users | - | 2000 | not reached |
| GET /api/users/query | 400 concurrent users | 13 ms | 2000 | errors (100.0%) before CPU saturation |
| WebSocket connect (SockJS + STOMP) at app open | 700 concurrent users | 189 ms | 2000 | not reached |

## 01-baseline

| Operation | p50 ms | p95 ms | p99 ms | max ms | n | errors |
|---|---|---|---|---|---|---|
| GET / (framework floor, no auth, no DB) | 2.4 | 3.8 | 4.2 | 4.2 | 40 | 0% |
| POST /auth/login | 104.9 | 188.7 | 211.1 | 216.6 | 40 | 0% |
| POST /auth/signup | 100.5 | 170.7 | 195.0 | 202.0 | 40 | 0% |
| GET /api/users/profile | 5.0 | 7.6 | 9.6 | 10.7 | 40 | 0% |
| GET /api/users/query?query= | 4.9 | 10.4 | 38.8 | 53.3 | 40 | 0% |
| GET /api/chats/user | 58.4 | 105.6 | 108.5 | 109.2 | 40 | 0% |
| POST /api/chats/single | 17.1 | 28.8 | 38.6 | 43.5 | 40 | 0% |
| GET /api/messages/chat/{id} (10 msgs) | 10.7 | 22.0 | 33.7 | 38.9 | 40 | 0% |
| GET /api/messages/chat/{id} (100 msgs) | 11.6 | 33.3 | 51.2 | 53.7 | 40 | 0% |
| GET /api/messages/chat/{id} (1000 msgs) | 22.5 | 49.1 | 58.2 | 61.1 | 40 | 0% |
| GET /api/messages/chat/{id} (5000 msgs) | 73.4 | 177.5 | 177.9 | 178.0 | 40 | 0% |
| POST /api/messages/create | 20.3 | 37.6 | 58.6 | 62.4 | 40 | 0% |
| POST /api/keys/bundle (100 prekeys) | 79.6 | 189.3 | 220.5 | 223.0 | 40 | 0% |
| GET /api/keys/bundle/{userId} | 12.9 | 51.1 | 55.4 | 56.8 | 40 | 0% |
| GET /api/keys/count | 6.4 | 11.0 | 12.2 | 12.6 | 40 | 0% |
| WebSocket: SockJS open + STOMP CONNECTED | 4.0 | 7.1 | 30.1 | 43.0 | 40 | - |
| WebSocket: publish -> broker -> subscriber round trip | 3.0 | 4.0 | 5.0 | 20.0 | 200 | - |

## 04-writes--chat_create

#### POST /api/chats/single (open/create a 1:1 chat)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 26.3 | 42.4 | 59.2 | 64 | 0.00 | 57 | 26 | 245 | 36 | ok |
| 50 | 50.0 | 21.0 | 180.8 | 322.8 | 413 | 0.00 | 78 | 39 | 254 | 45 | ok |
| 100 | 6.3 | 9999.9 | 10000.8 | 10006.7 | 10007 | 100.00 | 6 | 3 | 309 | 226 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 180.8 ms, 50.0/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.13 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T17:00:15Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T17:00:15Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T17:00:15Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T17:00:15Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T17:00:15Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
```
</details>


## 04-writes--message_send

#### POST /api/messages/create (persist one E2E message)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.1 | 28.5 | 52.3 | 94.3 | 156 | 0.00 | 65 | 28 | 250 | 36 | ok |
| 50 | 50.0 | 43.5 | 170.4 | 238.0 | 273 | 0.00 | 95 | 48 | 269 | 45 | ok |
| 100 | 7.0 | 9998.8 | 9999.7 | 10016.0 | 10019 | 98.21 | 8 | 3 | 323 | 227 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 600 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 800 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 170.4 ms, 50.0/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.14 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T16:57:53Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T16:57:53Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T16:57:53Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T16:57:53Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T16:57:54Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
```
</details>


## 08-mixed-users

#### Send -> delivered to peer (REST persist + broker), end to end

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.3 | 40.0 | 59.6 | 63.9 | 65 | 0.00 | 9 | 5 | 251 | 37 | ok |
| 50 | 3.5 | 37.0 | 61.0 | 73.7 | 91 | 0.00 | 17 | 9 | 258 | 43 | ok |
| 100 | 7.0 | 33.0 | 50.6 | 61.3 | 79 | 0.00 | 26 | 12 | 273 | 37 | ok |
| 200 | 13.3 | 27.0 | 50.4 | 73.6 | 87 | 0.00 | 37 | 19 | 288 | 37 | ok |
| 400 | 26.5 | 28.0 | 71.8 | 387.6 | 430 | 0.00 | 51 | 30 | 345 | 61 | ok |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 100.00 | 16 | 3 | 455 | 238 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | no data |

**Knee:** 400 concurrent users (p95 71.8 ms, 26.5/s served)

#### POST /api/messages/create

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.4 | 35.1 | 49.4 | 54.3 | 55 | 0.00 | 9 | 5 | 251 | 37 | ok |
| 50 | 3.5 | 32.5 | 53.2 | 71.0 | 87 | 0.00 | 17 | 9 | 258 | 43 | ok |
| 100 | 6.9 | 29.4 | 45.7 | 54.5 | 75 | 0.00 | 26 | 12 | 273 | 37 | ok |
| 200 | 13.4 | 24.4 | 44.8 | 69.1 | 83 | 0.00 | 37 | 19 | 288 | 37 | ok |
| 400 | 26.1 | 24.9 | 52.9 | 264.1 | 420 | 0.00 | 51 | 30 | 345 | 61 | ok |
| 700 | 0.6 | 10000.9 | 10001.4 | 10001.4 | 10001 | 100.00 | 16 | 3 | 455 | 238 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | not run (stopped) |

**Knee:** 400 concurrent users (p95 52.9 ms, 26.1/s served)

#### GET /api/messages/chat/{id} (open chat)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.1 | 11.2 | 27.0 | 28.4 | 29 | 0.00 | 9 | 5 | 251 | 37 | too few samples (3) |
| 50 | 0.2 | 19.0 | 22.0 | 22.5 | 23 | 0.00 | 17 | 9 | 258 | 43 | too few samples (5) |
| 100 | 0.3 | 19.7 | 22.2 | 22.3 | 22 | 0.00 | 26 | 12 | 273 | 37 | too few samples (8) |
| 200 | 0.7 | 13.8 | 19.7 | 20.7 | 21 | 0.00 | 37 | 19 | 288 | 37 | too few samples (19) |
| 400 | 1.8 | 16.2 | 284.1 | 297.7 | 298 | 0.00 | 51 | 30 | 345 | 61 | ok |
| 700 | 0.1 | 10001.3 | 10001.3 | 10001.3 | 10001 | 100.00 | 16 | 3 | 455 | 238 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | not run (stopped) |

**Knee:** 400 concurrent users (p95 284.1 ms, 1.8/s served)

#### GET /api/chats/user (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 17.0 | 17.0 | 17.0 | 17 | 0.00 | 9 | 5 | 251 | 37 | too few samples (1) |
| 50 | 0.0 | 14.6 | 14.6 | 14.6 | 15 | 0.00 | 17 | 9 | 258 | 43 | too few samples (1) |
| 100 | 0.0 | 19.6 | 19.6 | 19.6 | 20 | 0.00 | 26 | 12 | 273 | 37 | too few samples (1) |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 37 | 19 | 288 | 37 | no data |
| 400 | 0.2 | 286.8 | 379.1 | 395.0 | 399 | 0.00 | 51 | 30 | 345 | 61 | too few samples (5) |
| 700 | 0.0 | 10000.7 | 10000.7 | 10000.7 | 10001 | 100.00 | 16 | 3 | 455 | 238 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | not run (stopped) |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/profile (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 6.8 | 6.8 | 6.8 | 7 | 0.00 | 9 | 5 | 251 | 37 | too few samples (1) |
| 50 | 0.0 | 5.0 | 5.0 | 5.0 | 5 | 0.00 | 17 | 9 | 258 | 43 | too few samples (1) |
| 100 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 26 | 12 | 273 | 37 | no data |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 37 | 19 | 288 | 37 | no data |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 51 | 30 | 345 | 61 | no data |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 16 | 3 | 455 | 238 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | no data |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/query

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.2 | 11.5 | 19.4 | 20.7 | 21 | 0.00 | 9 | 5 | 251 | 37 | too few samples (5) |
| 50 | 0.3 | 9.9 | 11.4 | 11.8 | 12 | 0.00 | 17 | 9 | 258 | 43 | too few samples (9) |
| 100 | 0.7 | 8.8 | 10.9 | 15.7 | 17 | 0.00 | 26 | 12 | 273 | 37 | too few samples (19) |
| 200 | 1.6 | 7.0 | 12.2 | 19.3 | 23 | 0.00 | 37 | 19 | 288 | 37 | ok |
| 400 | 2.5 | 7.4 | 12.7 | 31.7 | 56 | 0.00 | 51 | 30 | 345 | 61 | ok |
| 700 | 0.1 | 10001.1 | 10001.2 | 10001.2 | 10001 | 100.00 | 16 | 3 | 455 | 238 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | not run (stopped) |

**Knee:** 400 concurrent users (p95 12.7 ms, 2.5/s served)

#### WebSocket connect (SockJS + STOMP) at app open

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.9 | 8.0 | 16.8 | 33.7 | 39 | 0.00 | 9 | 5 | 251 | 37 | ok |
| 50 | 0.9 | 6.0 | 10.6 | 13.3 | 14 | 0.00 | 17 | 9 | 258 | 43 | ok |
| 100 | 1.8 | 6.0 | 9.0 | 21.1 | 28 | 0.00 | 26 | 12 | 273 | 37 | ok |
| 200 | 3.6 | 5.0 | 12.0 | 46.3 | 77 | 0.00 | 37 | 19 | 288 | 37 | ok |
| 400 | 7.1 | 12.0 | 106.1 | 192.0 | 198 | 0.00 | 51 | 30 | 345 | 61 | ok |
| 700 | 2.1 | 95.5 | 189.1 | 193.9 | 198 | 0.00 | 16 | 3 | 455 | 238 | ok |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 15 | 4 | 465 | 247 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 3 | 468 | 256 | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 10 | 3 | 470 | 262 | no data |

**Knee:** 700 concurrent users (p95 189.1 ms, 2.1/s served)

**Concurrent active users sustained within SLO:** 400 — broke at 700 users on: POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/chats/user (app open); GET /api/users/query

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.12 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T17:05:24Z" level=warning msg="Request Failed" error="Get \"http://backend:5454/api/chats/user\": request timeout"
time="2026-10-03T17:05:24Z" level=warning msg="Request Failed" error="Get \"http://backend:5454/api/messages/chat/218\": request timeout"
time="2026-10-03T17:05:24Z" level=warning msg="Request Failed" error="Get \"http://backend:5454/api/users/profile\": request timeout"
time="2026-10-03T17:05:24Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T17:05:25Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
```
</details>


---
Columns: *achieved/s* is completed requests per second during the hold part of each step (ramp excluded). Resource columns are averages (CPU) or peaks (memory, threads) from `docker stats` over the same window; 100% CPU = one full core.

# Load test baseline — baseline-1cpu-1g

| | |
|---|---|
| Backend budget | 1 vCPU, 1g RAM (JVM: MaxHeapSize 268435456;UseG1GC false;UseSerialGC true;) |
| MySQL budget | 1 vCPU, 1g RAM |
| Load generator | k6 in its own container, 2 vCPU (k6 v2.3.0 (commit/e088784614, go1.27.1, linux/amd64)) |
| Code | f88ab99 + uncommitted backend changes, spring.jpa.show-sql=true |
| Data | 2000 users, 1000 1:1 chats, 10 msgs/chat, 100 key bundles |
| Docker VM | 6 CPUs, 13.7 GiB; other containers used ~180% CPU (100% = 1 core) during tests |
| SLO | p95 ≤ 500 ms for HTTP (1000 ms for WebSocket connect / end-to-end delivery), errors ≤ 1%, open-loop tests must serve ≥ 90% of offered rate |

## Headline: capacity per feature

The **knee** is the highest load step that still met the SLO. "Limit" is what ran out at the next step.

| Feature | Knee | p95 at knee | Tested up to | Limit hit at next step |
|---|---|---|---|---|
| **Concurrent active users (full app flow)** | 400 users | - | 2000 | POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/users/query |
| POST /auth/login | 10 req/s | 223 ms | 60 | backend CPU (112%) |
| POST /auth/signup | 10 req/s | 252 ms | 60 | errors (9.1%) before CPU saturation |
| GET /api/chats/user (chat list with members) | 100 req/s | 347 ms | 1200 | backend CPU (106%) |
| GET /api/messages/chat/{id} (typical chat, ~10-30 msgs) | 100 req/s | 35 ms | 600 | backend CPU (108%) |
| GET /api/users/profile (JWT -> user lookup only) | 400 req/s | 133 ms | 1200 | backend CPU (107%) |
| GET /api/users/query (LIKE %q% over all users) | 300 req/s | 13 ms | 450 | MySQL CPU (102%) |
| POST /api/chats/single (open/create a 1:1 chat) | 50 req/s | 30 ms | 450 | errors (16.0%) before CPU saturation |
| POST /api/messages/create (persist one E2E message) | 50 req/s | 45 ms | 800 | errors (100.0%) before CPU saturation |
| GET /api/keys/bundle/{id} (random recipients) | 100 req/s | 79 ms | 600 | backend CPU (106%) |
| GET /api/keys/bundle/{id} (one hot recipient, lock contention) | 100 req/s | 265 ms | 450 | backend CPU (88%) |
| POST /api/keys/bundle (identity + 100 prekeys) | 30 req/s | 224 ms | 60 | errors (100.0%) before CPU saturation |
| New connection (SockJS + STOMP CONNECTED) while N are already open | 2000 open connections | 9 ms | 2000 | not reached |
| Broker round trip (publish -> subscriber) with N connections open | 2000 open connections | 16 ms | 2000 | not reached |
| Broker delivery latency, 200 connected users in 100 chats (each message fans out to 2 subscribers) | 3000 msg/s | 66 ms | 6000 | backend CPU (104%) |
| Send -> delivered to peer (REST persist + broker), end to end | 400 concurrent users | 31 ms | 2000 | not reached |
| POST /api/messages/create | 400 concurrent users | 28 ms | 2000 | errors (100.0%) before CPU saturation |
| GET /api/messages/chat/{id} (open chat) | 400 concurrent users | 16 ms | 2000 | errors (100.0%) before CPU saturation |
| GET /api/chats/user (app open) | < ? concurrent users | - | 2000 | not reached |
| GET /api/users/profile (app open) | < ? concurrent users | - | 2000 | not reached |
| GET /api/users/query | 400 concurrent users | 10 ms | 2000 | errors (100.0%) before CPU saturation |
| WebSocket connect (SockJS + STOMP) at app open | 700 concurrent users | 76 ms | 2000 | not reached |

## 01-baseline

| Operation | p50 ms | p95 ms | p99 ms | max ms | n | errors |
|---|---|---|---|---|---|---|
| GET / (framework floor, no auth, no DB) | 1.8 | 2.8 | 4.2 | 4.8 | 40 | 0% |
| POST /auth/login | 86.4 | 118.3 | 157.4 | 176.5 | 40 | 0% |
| POST /auth/signup | 97.5 | 112.4 | 174.5 | 208.4 | 40 | 0% |
| GET /api/users/profile | 5.2 | 8.6 | 10.2 | 10.5 | 40 | 0% |
| GET /api/users/query?query= | 5.4 | 8.3 | 10.2 | 11.4 | 40 | 0% |
| GET /api/chats/user | 214.3 | 317.5 | 355.5 | 365.2 | 40 | 0% |
| POST /api/chats/single | 19.6 | 26.8 | 29.0 | 29.1 | 40 | 0% |
| GET /api/messages/chat/{id} (10 msgs) | 11.0 | 19.8 | 30.0 | 35.9 | 40 | 0% |
| GET /api/messages/chat/{id} (100 msgs) | 11.6 | 18.6 | 28.3 | 34.1 | 40 | 0% |
| GET /api/messages/chat/{id} (1000 msgs) | 20.2 | 35.5 | 130.2 | 141.8 | 40 | 0% |
| GET /api/messages/chat/{id} (5000 msgs) | 60.7 | 156.0 | 169.2 | 170.9 | 40 | 0% |
| POST /api/messages/create | 19.9 | 34.5 | 35.9 | 36.8 | 40 | 0% |
| POST /api/keys/bundle (100 prekeys) | 79.0 | 122.6 | 152.2 | 155.2 | 40 | 0% |
| GET /api/keys/bundle/{userId} | 17.0 | 21.6 | 37.3 | 46.2 | 40 | 0% |
| GET /api/keys/count | 8.4 | 12.9 | 40.7 | 43.4 | 40 | 0% |
| WebSocket: SockJS open + STOMP CONNECTED | 5.0 | 10.0 | 10.6 | 11.0 | 40 | - |
| WebSocket: publish -> broker -> subscriber round trip | 2.0 | 6.0 | 9.1 | 17.0 | 200 | - |

## 02-auth--login

#### POST /auth/login

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 2.0 | 87.3 | 100.7 | 101.9 | 102 | 0.00 | 23 | 3 | 236 | 36 | ok |
| 5 | 5.1 | 87.3 | 99.2 | 126.4 | 129 | 0.00 | 56 | 3 | 239 | 36 | ok |
| 10 | 10.0 | 86.5 | 223.0 | 250.2 | 319 | 0.00 | 106 | 3 | 247 | 32 | ok |
| 15 | 6.4 | 3492.9 | 5183.2 | 5694.3 | 6326 | 0.00 | 112 | 4 | 255 | 93 | FAIL |
| 20 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 30 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 45 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 60 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 10 req/s (p95 223.0 ms, 10.0/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.11 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T12:44:04Z" level=error msg="thresholds on metrics 'http_req_duration{name:login,step:3}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 02-auth--signup

#### POST /auth/signup

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 2.0 | 97.3 | 119.2 | 135.1 | 138 | 0.00 | 25 | 4 | 244 | 36 | ok |
| 5 | 5.0 | 97.3 | 128.9 | 149.2 | 167 | 0.00 | 59 | 6 | 253 | 36 | ok |
| 10 | 10.1 | 97.1 | 252.5 | 268.4 | 280 | 0.00 | 107 | 9 | 251 | 32 | ok |
| 15 | 2.1 | 2149.2 | 10000.2 | 10000.8 | 10001 | 9.09 | 29 | 4 | 276 | 126 | FAIL |
| 20 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 30 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 45 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 60 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 10 req/s (p95 252.5 ms, 10.1/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.10 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T12:46:36Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/auth/signup\": request timeout"
time="2026-10-03T12:46:37Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/auth/signup\": request timeout"
time="2026-10-03T12:46:37Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/auth/signup\": request timeout"
time="2026-10-03T12:46:37Z" level=error msg="thresholds on metrics 'http_req_duration{name:signup,step:3}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 03-reads--chats

#### GET /api/chats/user (chat list with members)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 50.1 | 24.3 | 127.2 | 178.9 | 246 | 0.00 | 92 | 41 | 258 | 36 | ok |
| 100 | 100.0 | 36.2 | 347.4 | 485.4 | 631 | 0.00 | 105 | 73 | 278 | 75 | ok |
| 200 | 130.4 | 3182.7 | 5167.7 | 6191.2 | 7333 | 0.00 | 106 | 90 | 383 | 226 | FAIL |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 600 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 800 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 1200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 100 req/s (p95 347.4 ms, 100.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.11 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T12:52:26Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=chats
time="2026-10-03T12:52:32Z" level=error msg="thresholds on metrics 'http_req_duration{name:chats,step:2}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 03-reads--history

#### GET /api/messages/chat/{id} (typical chat, ~10-30 msgs)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.1 | 13.6 | 21.0 | 32.5 | 56 | 0.00 | 49 | 14 | 263 | 36 | ok |
| 50 | 50.1 | 10.9 | 20.3 | 43.8 | 65 | 0.00 | 60 | 25 | 266 | 36 | ok |
| 100 | 100.0 | 9.4 | 35.3 | 60.2 | 84 | 0.00 | 80 | 45 | 263 | 32 | ok |
| 200 | 191.2 | 687.1 | 1813.7 | 2528.6 | 3798 | 0.00 | 108 | 73 | 357 | 223 | FAIL |
| 300 | 226.1 | 2536.3 | 3902.1 | 4679.1 | 6678 | 0.00 | 108 | 85 | 389 | 226 | FAIL |
| 450 | 257.8 | 2293.5 | 3323.7 | 3910.1 | 5623 | 0.00 | 107 | 95 | 406 | 226 | FAIL |
| 600 | 281.9 | 2117.9 | 2902.2 | 3556.8 | 4863 | 0.00 | 107 | 104 | 409 | 226 | FAIL |

**Knee:** 100 req/s (p95 35.3 ms, 100.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.12 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T12:55:16Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=history
```
</details>


## 03-reads--profile

#### GET /api/users/profile (JWT -> user lookup only)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 50.0 | 5.7 | 9.7 | 13.4 | 38 | 0.00 | 35 | 11 | 251 | 36 | ok |
| 100 | 100.0 | 4.7 | 8.1 | 20.4 | 46 | 0.00 | 54 | 18 | 264 | 36 | ok |
| 200 | 200.0 | 4.3 | 43.5 | 65.9 | 117 | 0.00 | 90 | 32 | 271 | 37 | ok |
| 400 | 396.7 | 4.7 | 133.4 | 296.9 | 631 | 0.00 | 94 | 60 | 292 | 103 | ok |
| 600 | 586.9 | 34.8 | 660.3 | 962.3 | 2273 | 0.00 | 107 | 90 | 346 | 223 | FAIL |
| 800 | 675.1 | 694.3 | 1465.1 | 1906.8 | 2554 | 0.00 | 108 | 103 | 360 | 229 | FAIL |
| 1200 | 671.2 | 724.8 | 1499.6 | 1995.5 | 2985 | 0.00 | 103 | 99 | 361 | 229 | FAIL |

**Knee:** 400 req/s (p95 133.4 ms, 396.7/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.11 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T12:49:46Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=profile
```
</details>


## 03-reads--search

#### GET /api/users/query (LIKE %q% over all users)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10.0 | 7.3 | 11.3 | 13.7 | 15 | 0.00 | 16 | 5 | 241 | 36 | ok |
| 25 | 25.1 | 6.4 | 11.7 | 18.1 | 27 | 0.00 | 31 | 11 | 248 | 36 | ok |
| 50 | 50.0 | 5.6 | 9.4 | 13.5 | 20 | 0.00 | 33 | 17 | 257 | 32 | ok |
| 100 | 100.0 | 5.1 | 8.6 | 20.1 | 52 | 0.00 | 52 | 28 | 251 | 32 | ok |
| 200 | 200.0 | 4.7 | 28.2 | 46.4 | 72 | 0.00 | 83 | 51 | 260 | 33 | ok |
| 300 | 300.0 | 4.1 | 13.0 | 63.9 | 138 | 0.00 | 64 | 73 | 259 | 48 | ok |
| 450 | 439.9 | 308.3 | 631.6 | 845.8 | 1640 | 0.00 | 70 | 102 | 335 | 223 | FAIL |

**Knee:** 300 req/s (p95 13.0 ms, 300.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.09 ms).


## 04-writes--chat_create

#### POST /api/chats/single (open/create a 1:1 chat)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 21.0 | 30.5 | 46.9 | 64 | 0.00 | 50 | 22 | 252 | 36 | ok |
| 50 | 50.1 | 17.1 | 30.2 | 45.9 | 67 | 0.00 | 66 | 36 | 256 | 36 | ok |
| 100 | 56.3 | 34.9 | 10000.7 | 10001.2 | 10007 | 15.98 | 57 | 25 | 327 | 226 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 30.2 ms, 50.1/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.10 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:04:13Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T13:04:13Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T13:04:13Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T13:04:13Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
time="2026-10-03T13:04:13Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/chats/single\": request timeout"
```
</details>


## 04-writes--message_send

#### POST /api/messages/create (persist one E2E message)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 22.6 | 34.2 | 45.1 | 77 | 0.00 | 49 | 24 | 251 | 36 | ok |
| 50 | 49.9 | 19.8 | 45.5 | 68.1 | 109 | 0.00 | 72 | 41 | 264 | 36 | ok |
| 100 | 6.3 | 9998.1 | 9998.9 | 9999.8 | 10000 | 100.00 | 7 | 3 | 323 | 227 | FAIL |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 600 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 800 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 45.5 ms, 49.9/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.10 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:01:50Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:01:50Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:01:50Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:01:50Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:01:50Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
```
</details>


## 05-keys--key_fetch

#### GET /api/keys/bundle/{id} (random recipients)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 17.8 | 26.6 | 36.0 | 49 | 0.00 | 36 | 21 | 258 | 36 | ok |
| 50 | 50.1 | 14.5 | 23.8 | 34.6 | 46 | 0.00 | 50 | 32 | 260 | 36 | ok |
| 100 | 100.0 | 17.4 | 79.0 | 120.0 | 209 | 0.00 | 87 | 55 | 262 | 37 | ok |
| 200 | 196.2 | 196.6 | 687.1 | 1123.6 | 1987 | 0.00 | 106 | 81 | 312 | 144 | FAIL |
| 300 | 256.9 | 1880.0 | 2930.0 | 3598.5 | 6228 | 0.00 | 103 | 94 | 386 | 226 | FAIL |
| 450 | 281.1 | 2121.9 | 2943.3 | 3574.5 | 4748 | 0.00 | 101 | 106 | 404 | 229 | FAIL |
| 600 | 270.8 | 2172.9 | 3109.4 | 3598.9 | 5248 | 0.00 | 98 | 106 | 411 | 226 | FAIL |

**Knee:** 100 req/s (p95 79.0 ms, 100.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.14 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:10:45Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=key_fetch
```
</details>


## 05-keys--key_fetch_hot

#### GET /api/keys/bundle/{id} (one hot recipient, lock contention)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10.0 | 20.4 | 29.9 | 33.6 | 40 | 0.00 | 20 | 11 | 246 | 36 | ok |
| 25 | 25.1 | 16.9 | 25.3 | 32.6 | 67 | 0.00 | 33 | 22 | 247 | 36 | ok |
| 50 | 50.0 | 14.3 | 22.6 | 36.0 | 57 | 0.00 | 57 | 32 | 265 | 32 | ok |
| 100 | 100.0 | 18.8 | 265.4 | 390.2 | 591 | 0.00 | 85 | 57 | 274 | 63 | ok |
| 200 | 141.9 | 3028.3 | 5259.9 | 5922.4 | 7154 | 0.00 | 88 | 69 | 373 | 226 | FAIL |
| 300 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 450 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 100 req/s (p95 265.4 ms, 100.0/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.10 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:14:25Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=key_fetch_hot
time="2026-10-03T13:14:31Z" level=error msg="thresholds on metrics 'http_req_duration{name:key_fetch_hot,step:4}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 05-keys--key_publish

#### POST /api/keys/bundle (identity + 100 prekeys)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 2.0 | 82.7 | 105.7 | 127.5 | 135 | 0.00 | 12 | 13 | 257 | 36 | ok |
| 5 | 5.0 | 76.5 | 104.9 | 119.2 | 130 | 0.00 | 23 | 26 | 259 | 36 | ok |
| 10 | 10.0 | 71.7 | 100.4 | 130.6 | 155 | 0.00 | 34 | 46 | 260 | 32 | ok |
| 20 | 20.1 | 70.6 | 122.4 | 149.4 | 213 | 0.00 | 53 | 75 | 261 | 32 | ok |
| 30 | 30.1 | 84.6 | 224.4 | 291.5 | 393 | 0.00 | 76 | 92 | 263 | 34 | ok |
| 45 | 2.2 | 10000.0 | 10000.8 | 10001.1 | 10001 | 100.00 | 10 | 4 | 325 | 226 | FAIL |
| 60 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 30 req/s (p95 224.4 ms, 30.1/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 1.67 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:07:35Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/keys/bundle\": request timeout"
time="2026-10-03T13:07:36Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/keys/bundle\": request timeout"
time="2026-10-03T13:07:36Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/keys/bundle\": request timeout"
time="2026-10-03T13:07:36Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/keys/bundle\": request timeout"
time="2026-10-03T13:07:36Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/keys/bundle\": request timeout"
```
</details>


## 06-ws-connections

#### New connection (SockJS + STOMP CONNECTED) while N are already open

| open connections | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 3.6 | 6.0 | 11.0 | 30.0 | 129 | 0.00 | 9 | 2 | 257 | 37 | ok |
| 250 | 5.4 | 5.0 | 9.0 | 14.0 | 34 | 0.00 | 14 | 2 | 276 | 37 | ok |
| 500 | 8.9 | 4.0 | 8.5 | 27.1 | 126 | 0.00 | 20 | 2 | 318 | 37 | ok |
| 1000 | 17.9 | 3.0 | 8.0 | 20.0 | 35 | 0.00 | 19 | 2 | 395 | 39 | ok |
| 1500 | 17.9 | 3.0 | 7.0 | 21.0 | 39 | 0.00 | 22 | 2 | 456 | 50 | ok |
| 2000 | 17.9 | 3.0 | 9.0 | 125.1 | 181 | 0.00 | 31 | 2 | 476 | 135 | ok |

**Knee:** 2000 open connections (p95 9.0 ms, 17.9/s served)

#### Broker round trip (publish -> subscriber) with N connections open

| open connections | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 19.3 | 2.0 | 3.0 | 5.0 | 7 | 0.00 | 9 | 2 | 257 | 37 | ok |
| 250 | 48.6 | 2.0 | 3.0 | 6.0 | 15 | 0.00 | 14 | 2 | 276 | 37 | ok |
| 500 | 97.9 | 1.0 | 3.0 | 6.0 | 31 | 0.00 | 20 | 2 | 318 | 37 | ok |
| 1000 | 195.7 | 1.0 | 3.0 | 8.0 | 150 | 0.00 | 19 | 2 | 395 | 39 | ok |
| 1500 | 296.1 | 1.0 | 4.0 | 101.1 | 198 | 0.00 | 22 | 2 | 456 | 50 | ok |
| 2000 | 389.1 | 1.0 | 16.0 | 184.1 | 488 | 0.00 | 31 | 2 | 476 | 135 | ok |

**Knee:** 2000 open connections (p95 16.0 ms, 389.1/s served)

Backend right after this test: **healthy**


## 07-ws-broker

#### Broker delivery latency, 200 connected users in 100 chats (each message fans out to 2 subscribers)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 99.5 | 3.0 | 12.0 | 33.2 | 47 | 0.00 | 11 | 2 | 283 | 90 | ok |
| 250 | 245.4 | 2.0 | 10.0 | 23.0 | 66 | 0.00 | 15 | 2 | 284 | 84 | ok |
| 500 | 486.6 | 2.0 | 11.0 | 28.0 | 86 | 0.00 | 25 | 2 | 285 | 84 | ok |
| 1000 | 969.0 | 3.0 | 15.0 | 31.0 | 76 | 0.00 | 44 | 2 | 285 | 85 | ok |
| 2000 | 1904.2 | 4.0 | 34.0 | 73.0 | 176 | 0.00 | 72 | 2 | 286 | 90 | ok |
| 3000 | 2749.6 | 8.0 | 66.0 | 115.0 | 231 | 0.00 | 94 | 2 | 288 | 97 | ok |
| 4000 | 3519.6 | 18.0 | 91.0 | 144.0 | 248 | 0.00 | 104 | 2 | 291 | 126 | FAIL |
| 6000 | 4596.4 | 37.0 | 126.0 | 190.0 | 417 | 0.00 | 107 | 2 | 297 | 165 | FAIL |

**Knee:** 3000 req/s (p95 66.0 ms, 2749.6/s served)

Messages published: 584819, delivered to peer: 584001 (0.14% not delivered by test end).

Backend right after this test: **healthy**


## 08-mixed-users

#### Send -> delivered to peer (REST persist + broker), end to end

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.5 | 29.0 | 41.9 | 53.8 | 55 | 0.00 | 7 | 4 | 260 | 37 | ok |
| 50 | 3.3 | 28.0 | 51.2 | 68.1 | 69 | 0.00 | 12 | 7 | 268 | 37 | ok |
| 100 | 6.9 | 24.0 | 34.0 | 47.4 | 58 | 0.00 | 18 | 10 | 282 | 37 | ok |
| 200 | 13.1 | 22.0 | 31.0 | 41.4 | 49 | 0.00 | 22 | 15 | 300 | 43 | ok |
| 400 | 26.5 | 20.0 | 31.0 | 49.6 | 70 | 0.00 | 38 | 27 | 339 | 37 | ok |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 100.00 | 7 | 3 | 449 | 237 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |

**Knee:** 400 concurrent users (p95 31.0 ms, 26.5/s served)

#### POST /api/messages/create

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 1.6 | 26.0 | 35.2 | 47.2 | 51 | 0.00 | 7 | 4 | 260 | 37 | ok |
| 50 | 3.3 | 25.5 | 43.6 | 58.9 | 66 | 0.00 | 12 | 7 | 268 | 37 | ok |
| 100 | 6.8 | 21.8 | 30.2 | 39.9 | 56 | 0.00 | 18 | 10 | 282 | 37 | ok |
| 200 | 13.1 | 19.7 | 28.0 | 37.2 | 46 | 0.00 | 22 | 15 | 300 | 43 | ok |
| 400 | 26.5 | 18.1 | 27.9 | 45.9 | 63 | 0.00 | 38 | 27 | 339 | 37 | ok |
| 700 | 0.7 | 10000.8 | 10001.2 | 10001.3 | 10001 | 100.00 | 7 | 3 | 449 | 237 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 27.9 ms, 26.5/s served)

#### GET /api/messages/chat/{id} (open chat)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 11.9 | 11.9 | 11.9 | 12 | 0.00 | 7 | 4 | 260 | 37 | too few samples (1) |
| 50 | 0.2 | 14.4 | 20.5 | 21.2 | 21 | 0.00 | 12 | 7 | 268 | 37 | too few samples (5) |
| 100 | 0.1 | 12.3 | 14.5 | 14.7 | 15 | 0.00 | 18 | 10 | 282 | 37 | too few samples (3) |
| 200 | 0.8 | 12.0 | 16.6 | 18.9 | 20 | 0.00 | 22 | 15 | 300 | 43 | ok |
| 400 | 1.3 | 11.3 | 15.5 | 17.7 | 19 | 0.00 | 38 | 27 | 339 | 37 | ok |
| 700 | 0.1 | 10000.4 | 10000.8 | 10000.8 | 10001 | 100.00 | 7 | 3 | 449 | 237 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 15.5 ms, 1.3/s served)

#### GET /api/chats/user (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 28.6 | 28.6 | 28.6 | 29 | 0.00 | 7 | 4 | 260 | 37 | too few samples (1) |
| 50 | 0.0 | 24.4 | 24.4 | 24.4 | 24 | 0.00 | 12 | 7 | 268 | 37 | too few samples (1) |
| 100 | 0.0 | 23.5 | 23.5 | 23.5 | 23 | 0.00 | 18 | 10 | 282 | 37 | too few samples (1) |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 22 | 15 | 300 | 43 | no data |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 38 | 27 | 339 | 37 | no data |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 7 | 3 | 449 | 237 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/profile (app open)

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 6.0 | 6.0 | 6.0 | 6 | 0.00 | 7 | 4 | 260 | 37 | too few samples (1) |
| 50 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 12 | 7 | 268 | 37 | no data |
| 100 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 18 | 10 | 282 | 37 | no data |
| 200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 22 | 15 | 300 | 43 | no data |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 38 | 27 | 339 | 37 | no data |
| 700 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 7 | 3 | 449 | 237 | no data |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |

**Knee:** below the first step (failed SLO at the lowest load)

#### GET /api/users/query

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.0 | 6.0 | 6.0 | 6.0 | 6 | 0.00 | 7 | 4 | 260 | 37 | too few samples (1) |
| 50 | 0.1 | 7.4 | 8.2 | 8.3 | 8 | 0.00 | 12 | 7 | 268 | 37 | too few samples (4) |
| 100 | 0.9 | 6.0 | 8.9 | 10.7 | 11 | 0.00 | 18 | 10 | 282 | 37 | ok |
| 200 | 1.3 | 5.6 | 11.3 | 13.3 | 14 | 0.00 | 22 | 15 | 300 | 43 | ok |
| 400 | 2.3 | 5.0 | 9.5 | 14.1 | 18 | 0.00 | 38 | 27 | 339 | 37 | ok |
| 700 | 0.1 | 10001.0 | 10001.2 | 10001.2 | 10001 | 100.00 | 7 | 3 | 449 | 237 | FAIL |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | not run (stopped) |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 400 concurrent users (p95 9.5 ms, 2.3/s served)

#### WebSocket connect (SockJS + STOMP) at app open

| concurrent users | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 0.9 | 6.0 | 11.8 | 13.5 | 14 | 0.00 | 7 | 4 | 260 | 37 | ok |
| 50 | 0.9 | 5.0 | 11.4 | 12.0 | 12 | 0.00 | 12 | 7 | 268 | 37 | ok |
| 100 | 1.8 | 5.0 | 8.5 | 16.6 | 22 | 0.00 | 18 | 10 | 282 | 37 | ok |
| 200 | 3.6 | 4.0 | 10.0 | 13.1 | 18 | 0.00 | 22 | 15 | 300 | 43 | ok |
| 400 | 7.1 | 4.0 | 15.1 | 52.1 | 62 | 0.00 | 38 | 27 | 339 | 37 | ok |
| 700 | 9.9 | 6.0 | 76.0 | 124.5 | 341 | 0.00 | 7 | 3 | 449 | 237 | ok |
| 1000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 13 | 2 | 475 | 241 | no data |
| 1500 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |
| 2000 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | no data |

**Knee:** 700 concurrent users (p95 76.0 ms, 9.9/s served)

**Concurrent active users sustained within SLO:** 400 — broke at 700 users on: POST /api/messages/create; GET /api/messages/chat/{id} (open chat); GET /api/users/query

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.08 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:19:31Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:19:31Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:19:31Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:19:31Z" level=warning msg="Request Failed" error="Post \"http://backend:5454/api/messages/create\": request timeout"
time="2026-10-03T13:19:31Z" level=warning msg="Request Failed" error="Get \"http://backend:5454/api/users/profile\": request timeout"
```
</details>


---
Columns: *achieved/s* is completed requests per second during the hold part of each step (ramp excluded). Resource columns are averages (CPU) or peaks (memory, threads) from `docker stats` over the same window; 100% CPU = one full core.

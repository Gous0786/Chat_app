# Load test baseline — experiment-showsql-off

| | |
|---|---|
| Backend budget | 1 vCPU, 1g RAM (JVM: MaxHeapSize 268435456;UseG1GC false;UseSerialGC true;) |
| MySQL budget | 1 vCPU, 1g RAM |
| Load generator | k6 in its own container, 2 vCPU (k6 v2.3.0 (commit/e088784614, go1.27.1, linux/amd64)) |
| Code | f88ab99 + uncommitted backend changes, spring.jpa.show-sql=false |
| Data | 2000 users, 1000 1:1 chats, 10 msgs/chat, 100 key bundles |
| Docker VM | 6 CPUs, 13.7 GiB; other containers used ~164% CPU (100% = 1 core) during tests |
| SLO | p95 ≤ 500 ms for HTTP (1000 ms for WebSocket connect / end-to-end delivery), errors ≤ 1%, open-loop tests must serve ≥ 90% of offered rate |

## Headline: capacity per feature

The **knee** is the highest load step that still met the SLO. "Limit" is what ran out at the next step.

| Feature | Knee | p95 at knee | Tested up to | Limit hit at next step |
|---|---|---|---|---|
| GET /api/chats/user (chat list with members) | 50 req/s | 202 ms | 1200 | backend CPU (108%) |
| GET /api/messages/chat/{id} (typical chat, ~10-30 msgs) | 100 req/s | 148 ms | 600 | backend CPU (108%) |
| GET /api/users/profile (JWT -> user lookup only) | 400 req/s | 186 ms | 1200 | backend CPU (108%) |
| GET /api/users/query (LIKE %q% over all users) | 300 req/s | 63 ms | 450 | MySQL CPU (109%) |

## 03-reads--chats

#### GET /api/chats/user (chat list with members)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 50.1 | 63.4 | 202.0 | 295.7 | 484 | 0.00 | 109 | 51 | 259 | 43 | ok |
| 100 | 99.5 | 107.5 | 516.7 | 864.9 | 1355 | 0.00 | 108 | 85 | 283 | 86 | FAIL |
| 200 | 69.1 | 3181.1 | 5412.2 | 5798.6 | 7965 | 0.00 | 107 | 98 | 368 | 226 | FAIL |
| 400 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 600 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 800 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |
| 1200 | 0.0 | 0.0 | 0.0 | 0.0 | 0 | 0.00 | - | - | - | - | not run (stopped) |

**Knee:** 50 req/s (p95 202.0 ms, 50.1/s served)

Backend right after this test: **unresponsive (profile: HTTP 000 within 3 s)**

Load generator check: ok (k6 send p95 0.10 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:26:36Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=chats
time="2026-10-03T13:26:39Z" level=error msg="thresholds on metrics 'http_req_duration{name:chats,step:2}' were crossed; at least one has abortOnFail enabled, stopping test prematurely"
```
</details>


## 03-reads--history

#### GET /api/messages/chat/{id} (typical chat, ~10-30 msgs)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | 25.0 | 13.9 | 32.0 | 50.5 | 72 | 0.00 | 49 | 15 | 263 | 36 | ok |
| 50 | 50.0 | 11.0 | 19.3 | 33.9 | 55 | 0.00 | 61 | 26 | 260 | 36 | ok |
| 100 | 100.0 | 18.2 | 148.0 | 299.5 | 528 | 0.00 | 104 | 50 | 277 | 54 | ok |
| 200 | 183.7 | 606.6 | 2531.6 | 3549.2 | 5744 | 0.00 | 108 | 71 | 361 | 226 | FAIL |
| 300 | 194.8 | 3087.1 | 4539.2 | 5465.5 | 7500 | 0.00 | 109 | 81 | 389 | 226 | FAIL |
| 450 | 238.6 | 2401.2 | 3899.7 | 4691.4 | 6430 | 0.00 | 106 | 97 | 409 | 229 | FAIL |
| 600 | 252.4 | 2287.5 | 3509.4 | 4149.0 | 5512 | 0.00 | 106 | 104 | 417 | 226 | FAIL |

**Knee:** 100 req/s (p95 148.0 ms, 100.0/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.12 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:29:22Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=history
```
</details>


## 03-reads--profile

#### GET /api/users/profile (JWT -> user lookup only)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 50.1 | 5.5 | 9.1 | 21.6 | 67 | 0.00 | 44 | 10 | 256 | 36 | ok |
| 100 | 100.0 | 4.6 | 8.4 | 20.5 | 37 | 0.00 | 58 | 18 | 271 | 36 | ok |
| 200 | 200.0 | 4.3 | 40.7 | 55.2 | 76 | 0.00 | 87 | 34 | 270 | 37 | ok |
| 400 | 396.4 | 6.4 | 186.2 | 446.7 | 810 | 0.00 | 97 | 66 | 299 | 116 | ok |
| 600 | 579.5 | 116.5 | 903.4 | 1143.9 | 2473 | 0.00 | 108 | 95 | 349 | 223 | FAIL |
| 800 | 659.1 | 719.3 | 1508.9 | 1938.5 | 3360 | 0.00 | 108 | 105 | 364 | 226 | FAIL |
| 1200 | 666.3 | 752.2 | 1499.9 | 1906.8 | 2632 | 0.00 | 105 | 105 | 367 | 226 | FAIL |

**Knee:** 400 req/s (p95 186.2 ms, 396.4/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.12 ms).

<details><summary>k6 warnings/errors (first 5)</summary>

```
time="2026-10-03T13:23:59Z" level=warning msg="Insufficient VUs, reached 600 active VUs and cannot initialize more" executor=ramping-arrival-rate scenario=profile
```
</details>


## 03-reads--search

#### GET /api/users/query (LIKE %q% over all users)

| target req/s | achieved/s | p50 ms | p95 ms | p99 ms | max ms | err % | backend CPU % | MySQL CPU % | backend mem MiB | backend threads | SLO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 10.1 | 7.5 | 10.6 | 13.4 | 14 | 0.00 | 10 | 5 | 247 | 36 | ok |
| 25 | 25.0 | 6.2 | 9.7 | 15.6 | 19 | 0.00 | 24 | 9 | 256 | 36 | ok |
| 50 | 50.0 | 5.5 | 9.3 | 12.5 | 16 | 0.00 | 28 | 16 | 248 | 32 | ok |
| 100 | 100.0 | 5.3 | 11.1 | 28.0 | 49 | 0.00 | 60 | 30 | 258 | 32 | ok |
| 200 | 200.0 | 5.1 | 35.3 | 51.0 | 72 | 0.00 | 84 | 55 | 270 | 35 | ok |
| 300 | 299.4 | 4.8 | 62.8 | 198.9 | 473 | 0.00 | 73 | 81 | 268 | 73 | ok |
| 450 | 414.9 | 665.2 | 1692.6 | 2165.0 | 4038 | 0.00 | 76 | 109 | 363 | 226 | FAIL |

**Knee:** 300 req/s (p95 62.8 ms, 299.4/s served)

Backend right after this test: **healthy**

Load generator check: ok (k6 send p95 0.10 ms).


---
Columns: *achieved/s* is completed requests per second during the hold part of each step (ramp excluded). Resource columns are averages (CPU) or peaks (memory, threads) from `docker stats` over the same window; 100% CPU = one full core.

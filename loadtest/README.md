# Load testing — baseline harness

Measures what the chat app **as currently built** can handle on a small, fixed
resource budget, so the rebuild has numbers to beat.

**Results and analysis: [BASELINE.md](BASELINE.md).**

```
            ┌──────────── Docker (one VM) ─────────────┐
 k6 (2 vCPU) ──HTTP / SockJS+STOMP──► backend (1 vCPU, 1 GB) ──► MySQL (1 vCPU, 1 GB)
            └──────────────────────────────────────────┘
                 docker stats sampled every ~2 s
```

## Run it

Prerequisites: Docker, Node 18+, Git Bash (Windows) or any POSIX shell.

```bash
cd loadtest
./run.sh                 # everything, ~90 min (seeding adds ~10 min the first time)
./run.sh 01 08           # just the latency floor and the concurrent-users test
RESEED=1 ./run.sh        # drop the DB volume, seed again, then run
```

Each run writes `results/<timestamp>/`:

| File | What |
|---|---|
| `REPORT.md` | Headline capacity table + per-step tables with CPU/mem/threads |
| `NN-name.json` | Raw k6 summary + the staircase plan (re-run `node scripts/report.mjs <dir>` any time) |
| `NN-name.stats.csv` | `docker stats` samples for every container |
| `NN-name.log` | k6 console output |

Tear down: `docker compose down -v`.

## What each test measures

| # | Test | Question it answers | Load shape |
|---|---|---|---|
| 01 | baseline | How fast is each operation with **no** contention? (the floor) | 1 user, sequential, 40 iterations |
| 02 | auth | Logins/signups per second (BCrypt is CPU-bound) | open-loop req/s staircase |
| 03 | reads | Profile, chat list, history, user search — each separately | open-loop req/s staircase |
| 04 | writes | Message persist rate, chat creation rate | open-loop req/s staircase |
| 05 | keys | Signal prekey publish/fetch; lock contention on one hot user | open-loop req/s staircase |
| 06 | ws-connections | How many sockets can be open, and does the broker stay responsive? | VUs only added, each holds a socket |
| 07 | ws-broker | Raw STOMP broker throughput (no DB) | 200 sockets, rising msg/s |
| 08 | mixed-users | **How many concurrent active users?** Full app flow, end-to-end delivery latency | VU staircase, 1 VU = 1 user |

### How to read the numbers

* **Isolation:** before every endpoint the backend is restarted, warmed up
  gently, and checked with a DB-backed request, because overload can wedge it
  (see BASELINE.md). Each staircase stops early once a step is far past the SLO.
* **Generator check:** each test section says whether k6 itself was CPU-starved
  (send p95 > 20 ms). If it was, those numbers measure k6, not the app.
* **Staircase:** load rises in steps (default 20 s each; 40 s for socket tests).
  The first few seconds of each step are ramp and excluded, so every row
  describes steady state at that load.
* **Open-loop (req/s) tests** keep sending at the target rate even when the
  server slows down, as real traffic does. If *achieved/s* drops below the
  target, the server is saturated and requests are queueing.
* **Knee** = highest step that met the SLO (p95 ≤ 500 ms HTTP, ≤ 1000 ms for
  socket connect / end-to-end delivery, errors ≤ 1%, ≥ 90% of offered load
  served). That is the capacity number for that feature.
* **Limit hit**: CPU at the first failing step. If backend CPU is at ~100%, the
  code burns CPU (e.g. BCrypt, JSON, Hibernate). If neither CPU is maxed but
  latency explodes, something is serialising work: the 10-connection DB pool,
  a row lock, or the 256 MB heap stuck in GC.
* **p95 vs p99 vs max:** p95 is what most users feel; a large gap to p99/max
  usually means GC pauses or pool waits.

### Tuning knobs

All optional environment variables passed to `./run.sh`:

| Variable | Default | Meaning |
|---|---|---|
| `BACKEND_CPUS` / `BACKEND_MEM` | `1` / `1g` | Backend container budget |
| `DB_CPUS` / `DB_MEM` | `1` / `1g` | MySQL container budget |
| `K6_CPUS` | `2` | Load generator budget |
| `SHOW_SQL` | `true` | The app's default logs every SQL statement; set `false` to see its cost |
| `STEP_SEC` / `RAMP_SEC` | `20`/`4` (`40`/`12` for 06-08) | Staircase timing |
| `SLO_P95_MS` / `SLO_MAX_ERR` | `500` / `0.01` | Knee criteria |
| `*_RATES`, `*_LEVELS` | per test | Comma-separated steps, e.g. `LOGIN_RATES=5,10,20` |
| `SEED_USERS` etc. | see `seed/seed.mjs` | Dataset size (needs `RESEED=1`) |

## Keeping the comparison fair

* Change **one** thing per run (the code *or* the budget), and keep `results/`
  folders side by side to compare.
* The Docker VM is shared. Other running containers take CPU from the test;
  the report's header shows how much they used. Stop them for clean numbers.
* The first run after `RESEED` has a cold MySQL buffer pool. For a stable
  baseline, run twice and keep the second.

#!/usr/bin/env bash
# Runs the load-test suite against the resource-capped stack and writes a report.
#
#   ./run.sh                 # all tests (~45 min)
#   ./run.sh 01 03 08        # just these
#   RESEED=1 ./run.sh        # wipe the DB and seed again first
#   BACKEND_CPUS=2 BACKEND_MEM=2g ./run.sh 08   # different budget
#
# Results: results/<run-id>/REPORT.md  (+ raw k6 JSON, logs, docker stats CSVs)
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: don't rewrite container paths

TESTS=("$@")
[ ${#TESTS[@]} -eq 0 ] && TESTS=(01 02 03 04 05 06 07 08)
RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
RES="results/$RUN_ID"
mkdir -p "$RES"


if [ -n "${RESEED:-}" ]; then
  docker compose down -v
  rm -f data/seed.json
fi
echo ">> starting stack (backend ${BACKEND_CPUS:-1} cpu/${BACKEND_MEM:-1g}, mysql ${DB_CPUS:-1} cpu/${DB_MEM:-1g})"
docker compose up -d --build --wait mysql backend
[ -f data/seed.json ] || node seed/seed.mjs

cat > "$RES/env.json" <<EOF
{
  "runId": "$RUN_ID",
  "gitSha": "$(git rev-parse --short HEAD 2>/dev/null || echo unknown)",
  "gitDirty": $([ -n "$(git status --porcelain -- ../Backend 2>/dev/null)" ] && echo true || echo false),
  "backend": { "cpus": "${BACKEND_CPUS:-1}", "mem": "${BACKEND_MEM:-1g}" },
  "mysql": { "cpus": "${DB_CPUS:-1}", "mem": "${DB_MEM:-1g}" },
  "k6": { "cpus": "${K6_CPUS:-2}", "version": "$(docker compose run --rm --no-deps k6 version 2>/dev/null | head -1)" },
  "showSql": "${SHOW_SQL:-true}",
  "dockerHost": { "cpus": $(docker info --format '{{.NCPU}}'), "memBytes": $(docker info --format '{{.MemTotal}}') },
  "jvm": "$(docker exec chatload-backend-1 sh -c 'java -XX:+PrintFlagsFinal -version 2>/dev/null | grep -E " MaxHeapSize | UseSerialGC | UseG1GC " | tr -s " " | cut -d" " -f3,5 | tr "\n" ";"')",
  "seed": $(node -e "const s=require('./data/seed.json');console.log(JSON.stringify({seededAt:s.seededAt,...s.params}))")
}
EOF

# Variables a user may set to reshape a test; forwarded into the k6 container.
PASS=(STEP_SEC RAMP_SEC COOLDOWN_SEC SLO_P95_MS SLO_MAX_ERR MAX_VUS BASELINE_ITER
      LOGIN_RATES SIGNUP_RATES PROFILE_RATES CHATS_RATES HISTORY_RATES SEARCH_RATES
      SEND_RATES CHAT_CREATE_RATES PUBLISH_RATES FETCH_RATES FETCH_HOT_RATES HOT_PREKEYS
      WS_CONN_LEVELS PING_SEC BROKER_PAIRS BROKER_RATES MIXED_LEVELS THINK_MIN_SEC THINK_MAX_SEC
      ABORT_P95_MS ABORT_ERR WARMUP_DURATION)

# Restart the backend and warm it up, so every measurement starts from the
# same state: no backlog, no exhausted pools, no leftovers from the last test.
TOKEN=$(node -e "console.log(require('./data/seed.json').users[0].token)")

# An authenticated DB-backed request answering in < 3 s, three times in a row.
# (GET / alone stays green even while the DB pool is deadlocked.)
ready() {
  local ok=0 code
  for _ in $(seq 1 30); do
    code=$(curl -s -m 3 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:15454/api/users/profile || true)
    if [ "$code" = "202" ]; then ok=$((ok + 1)); [ $ok -ge 3 ] && return 0; else ok=0; fi
    sleep 2
  done
  return 1
}

fresh_backend() {
  for attempt in 1 2 3; do
    echo "   restarting backend + warm-up (attempt $attempt)"
    docker compose restart backend >/dev/null 2>&1
    docker compose up -d --wait backend >/dev/null 2>&1
    docker compose run --rm -e "RESULTS_DIR=$RES" k6 run -q scenarios/00-warmup.js >/dev/null 2>&1 || true
    sleep 3
    ready && return 0
    echo "   backend not serving DB requests after warm-up; retrying" | tee -a "$RES/warmup-failures.txt"
  done
  echo "   WARNING: backend never became ready; measuring anyway" | tee -a "$RES/warmup-failures.txt"
}

# Did the backend survive the test? Overload can wedge it (see REPORT.md).
health_after() {
  local code
  code=$(curl -s -m 3 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" http://localhost:15454/api/users/profile || true)
  if [ "$code" = "202" ]; then echo healthy; else echo "unresponsive (profile: HTTP ${code:-none} within 3 s)"; fi
}

run_unit() { # $1 scenario file, $2 unit name, $3 ONLY value (may be empty), $4 step, $5 ramp
  local file=$1 unit=$2 only=$3 step=$4 ramp=$5
  [ -n "${ISOLATE:-1}" ] && [ "${ISOLATE:-1}" != 0 ] && fresh_backend
  local envargs=(-e "RESULTS_DIR=$RES" -e "STEP_SEC=$step" -e "RAMP_SEC=$ramp")
  [ -n "$only" ] && envargs+=(-e "ONLY=$only")
  for v in "${PASS[@]}"; do
    [ "$v" = STEP_SEC ] || [ "$v" = RAMP_SEC ] && continue
    [ -n "${!v:-}" ] && envargs+=(-e "$v=${!v}")
  done
  echo ">> $unit (step ${step}s, ramp ${ramp}s)"
  bash scripts/stats.sh "$RES/$unit.stats.csv" &
  local sampler=$!
  set +e
  docker compose run --rm "${envargs[@]}" k6 run -q "$file" 2>&1 | tee "$RES/$unit.log"
  set -e
  date +%s%3N > "$RES/$unit.end"
  kill $sampler 2>/dev/null || true
  wait $sampler 2>/dev/null || true
  health_after > "$RES/$unit.health"
  echo "   backend after test: $(cat "$RES/$unit.health")"
}

for t in "${TESTS[@]}"; do
  file=$(ls scenarios/${t}-*.js 2>/dev/null | head -1) || true
  [ -z "$file" ] && { echo "no scenario matching $t"; continue; }
  name=$(basename "$file" .js)

  # Long-lived-connection tests ramp more gently: opening hundreds of sockets
  # in 4 s would measure a connect storm, not steady state.
  step=${STEP_SEC:-20}; ramp=${RAMP_SEC:-4}
  case "$t" in 06|07|08) step=${STEP_SEC:-40}; ramp=${RAMP_SEC:-12} ;; esac

  if grep -q httpStaircases "$file"; then
    # One k6 run per endpoint, so an aborted staircase stops only that endpoint.
    for ep in $(grep -oE "\{ name: '[a-z_]+', exec:" "$file" | sed -E "s/.*'([a-z_]+)', exec:/\1/"); do
      run_unit "$file" "$name--$ep" "$ep" "$step" "$ramp"
    done
  else
    run_unit "$file" "$name" "" "$step" "$ramp"
  fi
done

node scripts/report.mjs "$RES"
echo ">> report: $RES/REPORT.md"

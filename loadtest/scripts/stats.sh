#!/usr/bin/env bash
# Samples `docker stats` for every running container until killed.
# Output CSV: ts_ms,container,cpu_pct,mem_usage,pids
# (Other projects' containers are included on purpose: they share the same
# Docker VM, and their CPU use is noise the report should show.)
out="$1"
echo "ts_ms,container,cpu_pct,mem_usage,pids" > "$out"
while true; do
  ts=$(date +%s%3N)
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.PIDs}}' 2>/dev/null \
    | sed "s|^|$ts,|" >> "$out"
done

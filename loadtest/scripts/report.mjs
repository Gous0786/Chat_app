// Builds REPORT.md for one run directory: k6 step tables joined with the
// docker stats samples taken during each step, plus a one-table headline.
//
//   node scripts/report.mjs results/<run-id>
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stepRows, stepTable, knee } from '../lib/table.js';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/report.mjs results/<run-id>');

const env = existsSync(join(dir, 'env.json')) ? JSON.parse(readFileSync(join(dir, 'env.json'), 'utf8')) : {};
const BACKEND = 'chatload-backend-1';
const MYSQL = 'chatload-mysql-1';

function toMiB(s) {
  const m = /([\d.]+)\s*([KMG]i?B)/.exec(s || '');
  if (!m) return null;
  const v = Number(m[1]);
  return m[2].startsWith('G') ? v * 1024 : m[2].startsWith('K') ? v / 1024 : v;
}

function loadStats(name) {
  const p = join(dir, `${name}.stats.csv`);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').trim().split('\n').slice(1).map((l) => {
    const [ts, container, cpu, mem, pids] = l.split(',');
    return { ts: Number(ts), container, cpu: parseFloat(cpu), memMiB: toMiB((mem || '').split('/')[0]), pids: Number(pids) };
  }).filter((r) => Number.isFinite(r.ts) && Number.isFinite(r.cpu));
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const max = (xs) => (xs.length ? Math.max(...xs) : null);

function window(stats, from, to) {
  const inW = stats.filter((s) => s.ts >= from && s.ts <= to);
  const of = (c) => inW.filter((s) => s.container === c);
  const others = {};
  for (const s of inW) {
    if (s.container === BACKEND || s.container === MYSQL || s.container.startsWith('chatload-k6')) continue;
    (others[s.ts] ||= []).push(s.cpu);
  }
  return {
    beCpu: avg(of(BACKEND).map((s) => s.cpu)),
    dbCpu: avg(of(MYSQL).map((s) => s.cpu)),
    beMem: max(of(BACKEND).map((s) => s.memMiB)),
    beThreads: max(of(BACKEND).map((s) => s.pids)),
    otherCpu: avg(Object.values(others).map((xs) => xs.reduce((a, b) => a + b, 0))),
  };
}

const f = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? '-' : v.toFixed(d));

function stepWindows(doc, plan) {
  if (!doc.setupEndMs) return null;
  const start = doc.setupEndMs + (plan.startOffsetSec || 0) * 1000;
  return plan.levels.map((_, s) => [start + (s * doc.stepSec + doc.rampSec) * 1000, start + (s + 1) * doc.stepSec * 1000]);
}

// Coarse "what ran out first" for the first failing step.
function bottleneck(row, res) {
  if (!row) return '';
  if (!res) return 'n/a';
  const be = res.beCpu ?? 0;
  const db = res.dbCpu ?? 0;
  if (be >= 85 && be >= db) return `backend CPU (${f(be)}%)`;
  if (db >= 85) return `MySQL CPU (${f(db)}%)`;
  if (row.errRate > 0.01) return `errors (${f(row.errRate * 100, 1)}%) before CPU saturation`;
  return `queueing / contention (backend ${f(be)}%, MySQL ${f(db)}% CPU)`;
}

const files = readdirSync(dir).filter((n) => /^\d\d-.*\.json$/.test(n)).sort();
const headline = [];
const sections = [];
const generatorWarnings = [];
let otherCpuAll = [];

for (const file of files) {
  const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const name = file.replace(/\.json$/, '');
  const stats = loadStats(name);
  const log = existsSync(join(dir, `${name}.log`)) ? readFileSync(join(dir, `${name}.log`), 'utf8') : '';
  const health = existsSync(join(dir, `${name}.health`)) ? readFileSync(join(dir, `${name}.health`), 'utf8').trim() : '-';
  let sec = `## ${name}\n\n`;

  if (doc.table) {
    // 01-baseline has its own single-table format.
    sec += doc.table + '\n';
    sections.push(sec);
    continue;
  }

  const wins = {};
  for (const plan of doc.plans) {
    const w = stepWindows(doc, plan);
    const res = w ? w.map(([a, b]) => window(stats, a, b)) : null;
    if (res) otherCpuAll.push(...res.map((r) => r.otherCpu).filter((x) => x !== null));
    wins[plan.name] = res;
    const extra = {
      head: ['backend CPU %', 'MySQL CPU %', 'backend mem MiB', 'backend threads'],
      cells: (r) => (res ? [f(res[r.step].beCpu), f(res[r.step].dbCpu), f(res[r.step].beMem), f(res[r.step].beThreads)] : ['-', '-', '-', '-']),
    };
    sec += stepTable(doc, plan, extra) + '\n\n';

    const rows = stepRows(doc, plan);
    const k = knee(rows);
    const firstFail = rows.find((r) => r.ok === false);
    headline.push({
      test: name,
      label: plan.label,
      unit: plan.unit === 'rps' ? (plan.name === 'ws_broker' ? 'msg/s' : 'req/s') : plan.unit,
      knee: k,
      maxTested: plan.levels[plan.levels.length - 1],
      firstFail,
      limit: firstFail ? bottleneck(firstFail, res && res[firstFail.step]) : 'not reached',
      health,
    });
  }

  if (name.startsWith('07')) {
    const s = doc.summary.metrics;
    const sent = s.broker_msgs_sent ? s.broker_msgs_sent.values.count : 0;
    const recv = s.broker_msgs_received ? s.broker_msgs_received.values.count : 0;
    sec += `Messages published: ${sent}, delivered to peer: ${recv} (${f(sent ? (1 - recv / sent) * 100 : 0, 2)}% not delivered by test end).\n\n`;
  }

  if (name.startsWith('08')) {
    // A level counts only if every part of the user experience met its SLO there.
    const plans = doc.plans;
    const allRows = plans.map((p) => stepRows(doc, p));
    let best = null;
    let breaker = null;
    for (let s = 0; s < plans[0].levels.length; s++) {
      const failing = allRows.map((rows, i) => (rows[s].ok === false ? plans[i].label : null)).filter(Boolean);
      if (failing.length) { breaker = { level: plans[0].levels[s], failing }; break; }
      best = plans[0].levels[s];
    }
    sec += `**Concurrent active users sustained within SLO:** ${best ?? 'below the first step'}` +
      (breaker ? ` — broke at ${breaker.level} users on: ${breaker.failing.join('; ')}` : ' (never broke; raise MIXED_LEVELS)') + '\n\n';
    headline.unshift({ test: name, label: '**Concurrent active users (full app flow)**', unit: 'users', knee: best ? { target: best, p95: null } : null, maxTested: plans[0].levels.at(-1), firstFail: breaker, limit: breaker ? breaker.failing.join('; ') : 'not reached', health, combined: true });
  }

  sec += `Backend right after this test: **${health}**

`;
  // Guard against measuring the load generator instead of the app: if k6 itself
  // takes long to *send* a request, it was CPU-starved and the numbers are suspect.
  const sending = doc.summary.metrics.http_req_sending;
  if (sending) {
    const p95 = sending.values['p(95)'];
    const starved = p95 > 20;
    if (starved) generatorWarnings.push(name);
    sec += starved
      ? `> **Load generator check: FAILED** � k6 send p95 ${f(p95, 1)} ms; k6 was CPU-starved, treat these numbers as a lower bound.

`
      : `Load generator check: ok (k6 send p95 ${f(p95, 2)} ms).

`;
  }
  const errLines = log.split('\n').filter((l) => /level=(error|warning)/.test(l)).slice(0, 5);
  if (errLines.length) sec += '<details><summary>k6 warnings/errors (first 5)</summary>\n\n```\n' + errLines.join('\n') + '\n```\n</details>\n\n';
  sections.push(sec);
}

let md = `# Load test baseline — ${env.runId || dir}\n\n`;
md += `| | |\n|---|---|\n`;
md += `| Backend budget | ${env.backend?.cpus ?? '?'} vCPU, ${env.backend?.mem ?? '?'} RAM (JVM: ${env.jvm || '?'}) |\n`;
md += `| MySQL budget | ${env.mysql?.cpus ?? '?'} vCPU, ${env.mysql?.mem ?? '?'} RAM |\n`;
md += `| Load generator | k6 in its own container, ${env.k6?.cpus ?? '?'} vCPU (${env.k6?.version ?? '?'}) |\n`;
md += `| Code | ${env.gitSha ?? '?'}${env.gitDirty ? ' + uncommitted backend changes' : ''}, spring.jpa.show-sql=${env.showSql ?? '?'} |\n`;
md += `| Data | ${env.seed ? `${env.seed.USERS} users, ${env.seed.USERS / 2} 1:1 chats, ${env.seed.MSGS_PER_PAIR} msgs/chat, ${env.seed.KEY_USERS} key bundles` : '?'} |\n`;
md += `| Docker VM | ${env.dockerHost?.cpus ?? '?'} CPUs, ${env.dockerHost ? (env.dockerHost.memBytes / 2 ** 30).toFixed(1) : '?'} GiB; other containers used ~${f(avg(otherCpuAll))}% CPU (100% = 1 core) during tests |\n`;
md += `| SLO | p95 ≤ ${files.length ? JSON.parse(readFileSync(join(dir, files.find((x) => !x.startsWith('01')) || files[0]), 'utf8')).slo?.p95Ms ?? 500 : 500} ms for HTTP (1000 ms for WebSocket connect / end-to-end delivery), errors ≤ 1%, open-loop tests must serve ≥ 90% of offered rate |\n\n`;

md += `## Headline: capacity per feature\n\n`;
md += `The **knee** is the highest load step that still met the SLO. "Limit" is what ran out at the next step.\n\n`;
md += `| Feature | Knee | p95 at knee | Tested up to | Limit hit at next step |\n|---|---|---|---|---|\n`;
for (const h of headline) {
  const kneeTxt = h.knee ? `${h.knee.target} ${h.unit}` : `< ${h.firstFail ? (h.firstFail.target ?? h.firstFail.level) : '?'} ${h.unit}`;
  md += `| ${h.label} | ${kneeTxt} | ${h.knee && h.knee.p95 != null ? f(h.knee.p95, 0) + ' ms' : '-'} | ${h.maxTested} | ${h.limit} |\n`;
}
md += `\n${sections.join('\n')}`;
md += `\n---\nColumns: *achieved/s* is completed requests per second during the hold part of each step (ramp excluded). Resource columns are averages (CPU) or peaks (memory, threads) from \`docker stats\` over the same window; 100% CPU = one full core.\n`;

writeFileSync(join(dir, 'REPORT.md'), md);
console.log(md);

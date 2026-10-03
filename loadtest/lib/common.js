// Shared helpers for every k6 scenario.
//
// Measurement model: each test is a *staircase*. Load is raised to a level,
// held, raised again. Every sample is tagged with the stair it was taken on
// (`step`), and samples taken while load is still changing are tagged
// `step=ramp` and ignored. That turns one run into a load→latency curve, and
// the "knee" (last step that still meets the SLO) is the capacity number.
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { stepTable } from './table.js';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:15454';
export const WS_URL = __ENV.WS_URL || 'ws://localhost:15454';
export const ORIGIN = 'http://localhost:3000';
export const RESULTS_DIR = __ENV.RESULTS_DIR || 'results/adhoc';

// Seconds per stair, and how much of its start is excluded as ramp-up.
export const STEP_SEC = Number(__ENV.STEP_SEC || 20);
export const RAMP_SEC = Number(__ENV.RAMP_SEC || 4);

// Service-level objective used to call the knee. Interactive chat UX budget.
export const SLO = {
  p95Ms: Number(__ENV.SLO_P95_MS || 500),
  maxErrorRate: Number(__ENV.SLO_MAX_ERR || 0.01),
};

// SharedArray deep-copies an element on *every* index access. Storing the whole
// seed (~1 MB of users + JWTs) as one element made each iteration copy 1 MB and
// capped k6 near 100 iterations/s, so the load generator, not the app, was the
// bottleneck. One element per record keeps each access tiny.
const USERS = new SharedArray('users', () => JSON.parse(open('../data/seed.json')).users);
const PAIRS = new SharedArray('pairs', () => JSON.parse(open('../data/seed.json')).pairs);
const META = new SharedArray('meta', () => {
  const s = JSON.parse(open('../data/seed.json'));
  return [{ history: s.history, keyUserIds: s.keyUserIds }];
});
let view = null;
export function data() {
  if (!view) {
    const m = META[0]; // small; copied once per VU
    view = { users: USERS, pairs: PAIRS, history: m.history, keyUserIds: m.keyUserIds };
  }
  return view;
}

export function parseList(envValue, fallback) {
  return (envValue ? envValue.split(',') : fallback).map(Number);
}

// ramping-arrival-rate stages for a staircase of request rates.
export function arrivalStages(rates) {
  const stages = [];
  for (const r of rates) {
    stages.push({ duration: `${RAMP_SEC}s`, target: r });
    stages.push({ duration: `${STEP_SEC - RAMP_SEC}s`, target: r });
  }
  return stages;
}

// ramping-vus stages for a staircase of concurrent VUs (WebSocket tests).
export function vuStages(levels) {
  return arrivalStages(levels);
}

export function planSeconds(levels) {
  return levels.length * STEP_SEC;
}

// Which stair the current moment belongs to, relative to the scenario start.
export function currentStep() {
  const elapsed = Date.now() - exec.scenario.startTime;
  const stepMs = STEP_SEC * 1000;
  if (elapsed % stepMs < RAMP_SEC * 1000) return 'ramp';
  return String(Math.floor(elapsed / stepMs));
}

// Stair index without the ramp exclusion. Used for events that only happen
// during a ramp (e.g. new connections opening as VUs are added).
export function rawStep() {
  return String(Math.floor((Date.now() - exec.scenario.startTime) / (STEP_SEC * 1000)));
}

// Milliseconds until the staircase is over; long-lived sockets close then.
export function msUntilPlanEnd(levels) {
  return exec.scenario.startTime + planSeconds(levels) * 1000 - Date.now() - 500;
}

export function tags(name) {
  return { name, step: currentStep() };
}

// Past the knee there is nothing left to learn, and driving the app deep into
// overload leaves it in a state (queued work, exhausted pools) that takes a
// long time to drain. A step this far gone stops the run.
export const ABORT_P95_MS = Number(__ENV.ABORT_P95_MS || 5000);
export const ABORT_ERR = Number(__ENV.ABORT_ERR || 0.3);

// k6 only reports per-tag sub-metrics that have a threshold, so register an
// always-true threshold for every (metric, name, step) we want in the summary,
// plus abort-on-fail guards on each step's latency and error rate.
export function stepThresholds(plans) {
  const t = {};
  for (const p of plans) {
    for (let s = 0; s < p.levels.length; s++) {
      for (const m of p.metrics) {
        const sel = `${m.metric}{name:${p.name},step:${s}}`;
        t[sel] = [m.kind === 'rate' ? 'rate>=0' : m.kind === 'counter' ? 'count>=0' : 'max>=0'];
        if (m.metric === p.latency) {
          t[sel].push({ threshold: `p(95)<${ABORT_P95_MS}`, abortOnFail: true, delayAbortEval: '5s' });
        }
        if (m.metric === p.errors) {
          t[sel].push({ threshold: `rate<${ABORT_ERR}`, abortOnFail: true, delayAbortEval: '5s' });
        }
      }
    }
  }
  return t;
}

export const HTTP_METRICS = [
  { metric: 'http_req_duration', kind: 'trend' },
  { metric: 'http_req_failed', kind: 'rate' },
  { metric: 'http_reqs', kind: 'counter' },
];

export const SUMMARY_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'];

// Writes the raw summary plus the staircase plan, and prints a per-step table.
export function summarize(testName, plans) {
  // One k6 run per endpoint (ONLY=name) writes one file per endpoint.
  if (__ENV.ONLY) testName = `${testName}--${__ENV.ONLY}`;
  return (summary) => {
    const doc = {
      test: testName,
      setupEndMs: summary.setup_data ? summary.setup_data.setupEndMs : null,
      stepSec: STEP_SEC,
      rampSec: RAMP_SEC,
      slo: SLO,
      plans,
      summary,
    };
    let out = `\n=== ${testName} ===\n`;
    for (const p of plans) out += stepTable(doc, p) + '\n';
    return {
      [`${RESULTS_DIR}/${testName}.json`]: JSON.stringify(doc, null, 1),
      stdout: out,
    };
  };
}

// Seconds of idle between back-to-back staircases so one test's backlog
// (queued requests, GC debt, DB flushes) does not bleed into the next.
export const COOLDOWN_SEC = Number(__ENV.COOLDOWN_SEC || 15);

/**
 * Builds k6 options for a file that runs one open-loop staircase per endpoint,
 * one after another. endpoints: [{ name, label, exec, levels }]
 * Open-loop (ramping-arrival-rate) means requests keep arriving at the target
 * rate whether or not the server keeps up, like real users do.
 */
export function httpStaircases(endpoints) {
  if (__ENV.ONLY) endpoints = endpoints.filter((e) => e.name === __ENV.ONLY);
  if (!endpoints.length) throw new Error(`no endpoint named ${__ENV.ONLY}`);
  const scenarios = {};
  const plans = [];
  let offset = 0;
  for (const e of endpoints) {
    scenarios[e.name] = {
      executor: 'ramping-arrival-rate',
      exec: e.exec,
      startTime: `${offset}s`,
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: Math.min(50, Math.max(...e.levels)),
      maxVUs: Number(__ENV.MAX_VUS || 600),
      stages: arrivalStages(e.levels),
      gracefulStop: '5s',
    };
    plans.push({
      name: e.name,
      label: e.label,
      levels: e.levels,
      unit: 'rps',
      openLoop: true,
      startOffsetSec: offset,
      latency: 'http_req_duration',
      errors: 'http_req_failed',
      count: 'http_reqs',
      metrics: HTTP_METRICS,
    });
    offset += planSeconds(e.levels) + COOLDOWN_SEC;
  }
  return {
    plans,
    options: {
      scenarios,
      thresholds: stepThresholds(plans),
      summaryTrendStats: SUMMARY_STATS,
      discardResponseBodies: true,
      setupTimeout: '300s',
    },
  };
}

// Scenario clocks start after setup(); report.mjs lines docker stats up against this.
export function markSetupEnd(extra = {}) {
  return { ...extra, setupEndMs: Date.now() };
}

export const HTTP_TIMEOUT = '10s';

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Roughly the size of a base64 Signal ciphertext for a short chat message.
export function fakeCiphertext(len = 320) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 64)];
  return s;
}

// 01 — Unloaded latency floor.
// One virtual user calls every endpoint in sequence, so nothing competes for
// CPU, threads or DB connections. These numbers are the best case: anything
// higher under load is queueing.
import http from 'k6/http';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';
import {
  BASE_URL, RESULTS_DIR, HTTP_TIMEOUT, SUMMARY_STATS,
  data, authHeaders, fakeCiphertext, markSetupEnd,
} from '../lib/common.js';
import { stompConnect } from '../lib/stomp.js';

const ITER = Number(__ENV.BASELINE_ITER || 40);
const WARMUP = 5; // JIT/connection-pool warmup iterations, excluded

const stompConnectMs = new Trend('stomp_connect_ms', true);
const brokerRttMs = new Trend('broker_rtt_ms', true);

const ENDPOINTS = [
  ['home', 'GET / (framework floor, no auth, no DB)'],
  ['login', 'POST /auth/login'],
  ['signup', 'POST /auth/signup'],
  ['profile', 'GET /api/users/profile'],
  ['search', 'GET /api/users/query?query='],
  ['chats', 'GET /api/chats/user'],
  ['chat_create', 'POST /api/chats/single'],
  ['history_10', 'GET /api/messages/chat/{id} (10 msgs)'],
  ['history_100', 'GET /api/messages/chat/{id} (100 msgs)'],
  ['history_1000', 'GET /api/messages/chat/{id} (1000 msgs)'],
  ['history_5000', 'GET /api/messages/chat/{id} (5000 msgs)'],
  ['message_send', 'POST /api/messages/create'],
  ['key_publish', 'POST /api/keys/bundle (100 prekeys)'],
  ['key_fetch', 'GET /api/keys/bundle/{userId}'],
  ['key_count', 'GET /api/keys/count'],
];

const thresholds = {};
for (const [n] of ENDPOINTS) {
  thresholds[`http_req_duration{name:${n},step:0}`] = ['max>=0'];
  thresholds[`http_req_failed{name:${n},step:0}`] = ['rate>=0'];
}
thresholds['stomp_connect_ms{step:0}'] = ['max>=0'];
thresholds['broker_rtt_ms{step:0}'] = ['max>=0'];

export const options = {
  scenarios: {
    baseline: { executor: 'per-vu-iterations', vus: 1, iterations: ITER + WARMUP, maxDuration: '20m' },
  },
  thresholds,
  summaryTrendStats: SUMMARY_STATS,
  discardResponseBodies: true,
};

export function setup() {
  return markSetupEnd();
}

function bundle() {
  const keys = [];
  const start = Math.floor(Math.random() * 100000);
  for (let i = 0; i < 100; i++) keys.push({ id: start + i, publicKey: fakeCiphertext(44) });
  return JSON.stringify({
    registrationId: 1234, identityKey: fakeCiphertext(44), signedPreKeyId: 1,
    signedPreKeyPublic: fakeCiphertext(44), signedPreKeySignature: fakeCiphertext(88), oneTimePreKeys: keys,
  });
}

export default async function () {
  const d = data();
  const step = exec.scenario.iterationInTest < WARMUP ? 'warm' : '0';
  const t = (name) => ({ tags: { name, step }, timeout: HTTP_TIMEOUT });
  const me = d.users[0];
  const pair = d.pairs[0];
  const h = { headers: authHeaders(me.token) };
  const p = (name) => Object.assign({}, h, t(name));

  http.get(`${BASE_URL}/`, t('home'));
  http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: me.email, password: 'Passw0rd!load' }),
    Object.assign({ headers: { 'Content-Type': 'application/json' } }, t('login')));
  const email = `base-${Date.now()}-${Math.floor(Math.random() * 1e6)}@load.test`;
  http.post(`${BASE_URL}/auth/signup`, JSON.stringify({ email, full_name: 'Baseline', password: 'x12345678' }),
    Object.assign({ headers: { 'Content-Type': 'application/json' } }, t('signup')));
  http.get(`${BASE_URL}/api/users/profile`, p('profile'));
  http.get(`${BASE_URL}/api/users/query?query=${encodeURIComponent('user ' + Math.floor(Math.random() * 200))}`, p('search'));
  http.get(`${BASE_URL}/api/chats/user`, p('chats'));
  const other = d.users[2 + Math.floor(Math.random() * (d.users.length - 2))];
  http.post(`${BASE_URL}/api/chats/single`, JSON.stringify({ userId: other.id }), p('chat_create'));
  for (const size of [10, 100, 1000, 5000]) {
    const hc = d.history[size];
    http.get(`${BASE_URL}/api/messages/chat/${hc.chatId}`,
      Object.assign({ headers: authHeaders(hc.token) }, t(`history_${size}`)));
  }
  http.post(`${BASE_URL}/api/messages/create`,
    JSON.stringify({ chatId: pair.chatId, content: fakeCiphertext(), encrypted: true }), p('message_send'));
  http.post(`${BASE_URL}/api/keys/bundle`, bundle(), p('key_publish'));
  http.get(`${BASE_URL}/api/keys/bundle/${d.keyUserIds[1 + Math.floor(Math.random() * (d.keyUserIds.length - 1))]}`, p('key_fetch'));
  http.get(`${BASE_URL}/api/keys/count`, p('key_count'));

  // Realtime path: STOMP handshake, then 5 round trips through the broker.
  await new Promise((resolve) => {
    const topic = `/group/${pair.chatId}`;
    let sentAt = 0;
    let n = 0;
    const client = stompConnect({
      onConnected(c, ms) {
        stompConnectMs.add(ms, { step });
        c.subscribe(topic);
        // Give the SUBSCRIBE a moment to register before the first send.
        setTimeout(sendOne, 50);
      },
      onMessage() {
        brokerRttMs.add(Date.now() - sentAt, { step });
        if (++n >= 5) { client.close(); resolve(); } else sendOne();
      },
      onError() { client.close(); resolve(); },
      onClose() { resolve(); },
    });
    function sendOne() {
      sentAt = Date.now();
      client.send('/app/message', JSON.stringify({ content: 'rtt', encrypted: false, chat: { id: pair.chatId } }));
    }
  });
}

export function handleSummary(s) {
  const rows = [];
  const fmt = (v) => (v === undefined ? '-' : v.toFixed(1));
  const line = (label, key, errKey) => {
    const m = s.metrics[key];
    if (!m) return;
    const v = m.values;
    const e = errKey && s.metrics[errKey] ? `${(s.metrics[errKey].values.rate * 100).toFixed(0)}%` : '-';
    rows.push(`| ${label} | ${fmt(v.med)} | ${fmt(v['p(95)'])} | ${fmt(v['p(99)'])} | ${fmt(v.max)} | ${v.count} | ${e} |`);
  };
  for (const [n, label] of ENDPOINTS) line(label, `http_req_duration{name:${n},step:0}`, `http_req_failed{name:${n},step:0}`);
  line('WebSocket: SockJS open + STOMP CONNECTED', 'stomp_connect_ms{step:0}');
  line('WebSocket: publish -> broker -> subscriber round trip', 'broker_rtt_ms{step:0}');
  const table = ['| Operation | p50 ms | p95 ms | p99 ms | max ms | n | errors |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
  return {
    [`${RESULTS_DIR}/01-baseline.json`]: JSON.stringify({ test: '01-baseline', table, summary: s }, null, 1),
    stdout: `\n=== 01-baseline (1 user, no contention) ===\n${table}\n`,
  };
}

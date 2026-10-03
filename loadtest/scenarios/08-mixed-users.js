// 08 — Concurrent active users (the headline number).
// Each VU is one logged-in user going through the same flow as the React app:
//   open app    -> GET profile, GET chat list, open SockJS/STOMP
//   open chat   -> SUBSCRIBE /group/{chatId}, GET message history
//   chat        -> every 10-20 s: POST /api/messages/create, then publish the
//                  saved message on /app/message (exactly what HomePage.jsx does)
//   now & then  -> search users, reopen the chat (history again)
// The two users of a seeded 1:1 chat are consecutive VUs, so each user's
// messages are delivered to a live peer. Delivery latency is measured from
// "user pressed send" to "peer's socket received it": REST persist + broker
// hop, the latency a real user feels.
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  BASE_URL, HTTP_TIMEOUT, parseList, vuStages, tags, rawStep, msUntilPlanEnd, stepThresholds, summarize,
  markSetupEnd, data, authHeaders, fakeCiphertext, HTTP_METRICS, SUMMARY_STATS,
} from '../lib/common.js';
import { stompConnect } from '../lib/stomp.js';

const LEVELS = parseList(__ENV.MIXED_LEVELS, [25, 50, 100, 200, 400, 700, 1000, 1500, 2000]);
const THINK_MIN = Number(__ENV.THINK_MIN_SEC || 10);
const THINK_MAX = Number(__ENV.THINK_MAX_SEC || 20);

const delivery = new Trend('e2e_delivery_ms', true);
const sendFail = new Counter('mixed_send_fail');
const connectMs = new Trend('stomp_connect_ms', true);
const connectFail = new Counter('ws_connect_fail');

const httpPlan = (name, label) => ({
  name, label, levels: LEVELS, unit: 'concurrent users', startOffsetSec: 0,
  latency: 'http_req_duration', errors: 'http_req_failed', count: 'http_reqs', metrics: HTTP_METRICS,
});

const plans = [
  { name: 'mixed_delivery', label: 'Send -> delivered to peer (REST persist + broker), end to end',
    levels: LEVELS, unit: 'concurrent users', startOffsetSec: 0, sloP95Ms: 1000,
    latency: 'e2e_delivery_ms', count: 'e2e_delivery_ms', errorsFromCount: 'mixed_send_fail',
    metrics: [{ metric: 'e2e_delivery_ms', kind: 'trend' }, { metric: 'mixed_send_fail', kind: 'counter' }] },
  httpPlan('mixed_send', 'POST /api/messages/create'),
  httpPlan('mixed_history', 'GET /api/messages/chat/{id} (open chat)'),
  httpPlan('mixed_chats', 'GET /api/chats/user (app open)'),
  httpPlan('mixed_profile', 'GET /api/users/profile (app open)'),
  httpPlan('mixed_search', 'GET /api/users/query'),
  { name: 'mixed_ws_connect', label: 'WebSocket connect (SockJS + STOMP) at app open',
    levels: LEVELS, unit: 'concurrent users', startOffsetSec: 0, sloP95Ms: 1000,
    latency: 'stomp_connect_ms', count: 'stomp_connect_ms', errorsFromCount: 'ws_connect_fail',
    metrics: [{ metric: 'stomp_connect_ms', kind: 'trend' }, { metric: 'ws_connect_fail', kind: 'counter' }] },
];

export const options = {
  scenarios: {
    users: { executor: 'ramping-vus', startVUs: 0, stages: vuStages(LEVELS), gracefulRampDown: '5s', gracefulStop: '20s' },
  },
  thresholds: stepThresholds(plans),
  summaryTrendStats: SUMMARY_STATS,
  discardResponseBodies: true,
};

export const handleSummary = summarize('08-mixed-users', plans);
export function setup() { return markSetupEnd(); }

function req(method, path, token, name, body, keepBody) {
  const params = { headers: authHeaders(token), tags: tags(name), timeout: HTTP_TIMEOUT };
  if (keepBody) params.responseType = 'text';
  return http.asyncRequest(method, `${BASE_URL}${path}`, body || null, params);
}

let wsFailed = false;

export default async function () {
  if (wsFailed) sleep(1 + Math.random() * 2); // a real client backs off before reconnecting
  wsFailed = false;
  const d = data();
  const idx = (__VU - 1) % d.users.length;
  const me = d.users[idx];
  const pair = d.pairs[Math.floor(idx / 2) % d.pairs.length];
  const holdMs = msUntilPlanEnd(LEVELS);
  if (holdMs < 3000) { sleep(holdMs > 0 ? holdMs / 1000 + 1 : 1); return; }
  const cipher = fakeCiphertext(300);

  await req('GET', '/api/users/profile', me.token, 'mixed_profile');
  await req('GET', '/api/chats/user', me.token, 'mixed_chats');

  await new Promise((resolveOnce) => {
    // If the server dies mid-test its sockets never close; don't let that hang k6.
    let settled = false;
    const resolve = () => { if (!settled) { settled = true; resolveOnce(); } };
    setTimeout(resolve, holdMs + 8000);
    let connected = false;
    let stopped = false;
    let nextTimer = null;
    const think = () => (THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN)) * 1000;
    const stop = () => { stopped = true; if (nextTimer) clearTimeout(nextTimer); resolve(); };

    async function act(c) {
      if (stopped || c.isClosed) return;
      const roll = Math.random();
      if (roll < 0.1) {
        await req('GET', `/api/users/query?query=${encodeURIComponent('user ' + Math.floor(Math.random() * 200))}`, me.token, 'mixed_search');
      } else if (roll < 0.15) {
        await req('GET', `/api/messages/chat/${pair.chatId}`, me.token, 'mixed_history');
      }
      const t0 = Date.now();
      const res = await req('POST', '/api/messages/create', me.token, 'mixed_send',
        JSON.stringify({ chatId: pair.chatId, content: `m:${t0}:${me.id}:${cipher}`, encrypted: true }), true);
      if (res.status === 200 && !c.isClosed) {
        c.send('/app/message', res.body);
      } else {
        sendFail.add(1, { name: 'mixed_delivery', step: tags('x').step });
      }
      if (!stopped) nextTimer = setTimeout(() => act(c), think());
    }

    const client = stompConnect({
      onConnected(c, ms) {
        connected = true;
        connectMs.add(ms, { name: 'mixed_ws_connect', step: rawStep() });
        c.subscribe(`/group/${pair.chatId}`);
        setTimeout(() => { stop(); c.close(); }, holdMs);
        req('GET', `/api/messages/chat/${pair.chatId}`, me.token, 'mixed_history').then(() => {
          nextTimer = setTimeout(() => act(c), Math.random() * THINK_MAX * 1000);
        });
      },
      onMessage(f) {
        const i = f.body.indexOf('"content":"m:');
        if (i < 0) return;
        const parts = f.body.slice(i + 13, i + 60).split(':');
        if (parts[1] === String(me.id)) return; // our own echo
        delivery.add(Date.now() - Number(parts[0]), tags('mixed_delivery'));
      },
      onError() {
        if (!connected) {
          connectFail.add(1, { name: 'mixed_ws_connect', step: rawStep() });
          wsFailed = true;
        }
        client.close();
        stop();
      },
      onClose() { stop(); },
    }, { name: 'ws' });
  });
}

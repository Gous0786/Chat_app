// 06 — How many open WebSocket connections the backend can hold.
// Each VU is one browser tab: it opens SockJS, does the STOMP handshake,
// subscribes to a chat topic and stays connected. Every few seconds it sends a
// ping through the broker to its own topic, to check the server still answers
// promptly with N sockets open. VUs are only added, never removed, so step k
// has levels[k] concurrent connections.
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  parseList, vuStages, tags, rawStep, msUntilPlanEnd, stepThresholds, summarize, markSetupEnd, SUMMARY_STATS,
} from '../lib/common.js';
import { stompConnect } from '../lib/stomp.js';

const LEVELS = parseList(__ENV.WS_CONN_LEVELS, [100, 250, 500, 1000, 2000, 3000, 4000]);
const PING_SEC = Number(__ENV.PING_SEC || 5);
const CONNECT_TIMEOUT_MS = 10000;

const connectMs = new Trend('stomp_connect_ms', true);
const connectFail = new Counter('ws_connect_fail');
const pingRtt = new Trend('ws_ping_rtt_ms', true);
const pingLost = new Counter('ws_ping_lost');

const plans = [
  { name: 'ws_connect', label: 'New connection (SockJS + STOMP CONNECTED) while N are already open',
    levels: LEVELS, unit: 'open connections', startOffsetSec: 0,
    latency: 'stomp_connect_ms', count: 'stomp_connect_ms', errorsFromCount: 'ws_connect_fail', sloP95Ms: 1000,
    metrics: [{ metric: 'stomp_connect_ms', kind: 'trend' }, { metric: 'ws_connect_fail', kind: 'counter' }] },
  { name: 'ws_ping', label: 'Broker round trip (publish -> subscriber) with N connections open',
    levels: LEVELS, unit: 'open connections', startOffsetSec: 0,
    latency: 'ws_ping_rtt_ms', count: 'ws_ping_rtt_ms', errorsFromCount: 'ws_ping_lost',
    metrics: [{ metric: 'ws_ping_rtt_ms', kind: 'trend' }, { metric: 'ws_ping_lost', kind: 'counter' }] },
];

export const options = {
  scenarios: {
    connections: { executor: 'ramping-vus', startVUs: 0, stages: vuStages(LEVELS), gracefulRampDown: '5s', gracefulStop: '15s' },
  },
  thresholds: stepThresholds(plans),
  summaryTrendStats: SUMMARY_STATS,
};

export const handleSummary = summarize('06-ws-connections', plans);
export function setup() { return markSetupEnd(); }

let lastFailed = false;

export default async function () {
  if (lastFailed) sleep(1); // back off instead of hammering a refusing server
  lastFailed = false;
  // Fake chat ids, far from real ones; two VUs share each topic like a 1:1 chat.
  const chatId = 900000 + Math.floor((__VU - 1) / 2);
  const topic = `/group/${chatId}`;
  const holdMs = msUntilPlanEnd(LEVELS);
  if (holdMs < 2000) { sleep(holdMs > 0 ? holdMs / 1000 + 1 : 1); return; }

  await new Promise((resolveOnce) => {
    // If the server dies mid-test its sockets never close; don't let that hang k6.
    let settled = false;
    const resolve = () => { if (!settled) { settled = true; resolveOnce(); } };
    setTimeout(resolve, holdMs + 8000);
    let connected = false;
    let failed = false;
    let pingTimer = null;
    let outstanding = null; // { sentAt, step }
    const finish = () => { if (pingTimer) clearInterval(pingTimer); resolve(); };
    const fail = () => {
      if (connected || failed) return;
      failed = true;
      lastFailed = true;
      connectFail.add(1, { name: 'ws_connect', step: rawStep() });
    };

    const client = stompConnect({
      onConnected(c, ms) {
        connected = true;
        connectMs.add(ms, { name: 'ws_connect', step: rawStep() });
        c.subscribe(topic);
        setTimeout(() => c.close(), holdMs);
        // Desynchronise pings so they don't all land on the same tick.
        setTimeout(() => {
          pingTimer = setInterval(() => {
            if (c.isClosed) return;
            if (outstanding) pingLost.add(1, { name: 'ws_ping', step: outstanding.step });
            const step = tags('ws_ping').step;
            outstanding = { sentAt: Date.now(), step };
            c.send('/app/message', JSON.stringify({ content: `ping:${outstanding.sentAt}:${__VU}`, chat: { id: chatId } }));
          }, PING_SEC * 1000);
        }, Math.random() * PING_SEC * 1000);
      },
      onMessage(f) {
        let content;
        try { content = JSON.parse(f.body).content; } catch (_) { return; }
        if (!content || !outstanding) return;
        const parts = content.split(':');
        if (parts[0] === 'ping' && parts[2] === String(__VU) && Number(parts[1]) === outstanding.sentAt) {
          pingRtt.add(Date.now() - outstanding.sentAt, { name: 'ws_ping', step: outstanding.step });
          outstanding = null;
        }
      },
      onError() {
        fail();
        client.close();
        finish();
      },
      onClose() { finish(); },
    }, { name: 'ws' });

    setTimeout(() => {
      if (!connected && !client.isClosed) {
        fail();
        client.close();
        finish();
      }
    }, CONNECT_TIMEOUT_MS);
  });
}

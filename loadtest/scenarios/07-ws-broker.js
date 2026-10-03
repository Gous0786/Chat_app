// 07 — Realtime broker throughput (no REST, no DB).
// A fixed set of connected pairs push chat-sized messages straight through the
// STOMP broker (/app/message -> /group/{chatId}) at a rising total rate. This
// isolates Spring's in-memory SimpleBroker: JSON (de)serialisation of the
// Message entity plus fan-out to both subscribers of the chat.
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  parseList, tags, rawStep, planSeconds, msUntilPlanEnd, stepThresholds, summarize,
  markSetupEnd, fakeCiphertext, SUMMARY_STATS,
} from '../lib/common.js';
import { stompConnect } from '../lib/stomp.js';

const PAIRS = Number(__ENV.BROKER_PAIRS || 100);
const VUS = PAIRS * 2;
const LEVELS = parseList(__ENV.BROKER_RATES, [100, 250, 500, 1000, 2000, 3000, 4000, 6000]);
const TICK_MS = 50;

const delivery = new Trend('ws_delivery_ms', true);
const sent = new Counter('broker_msgs_sent');
const received = new Counter('broker_msgs_received');

const plans = [
  { name: 'ws_broker', label: `Broker delivery latency, ${VUS} connected users in ${PAIRS} chats (each message fans out to 2 subscribers)`,
    levels: LEVELS, unit: 'rps', openLoop: true, startOffsetSec: 0,
    latency: 'ws_delivery_ms', count: 'ws_delivery_ms',
    metrics: [{ metric: 'ws_delivery_ms', kind: 'trend' }] },
];

export const options = {
  scenarios: {
    broker: { executor: 'constant-vus', vus: VUS, duration: `${planSeconds(LEVELS)}s`, gracefulStop: '10s' },
  },
  thresholds: {
    ...stepThresholds(plans),
    broker_msgs_sent: ['count>=0'],
    broker_msgs_received: ['count>=0'],
  },
  summaryTrendStats: SUMMARY_STATS,
};

export const handleSummary = summarize('07-ws-broker', plans);
export function setup() { return markSetupEnd(); }

// Shape of what the browser publishes: the full Message entity returned by
// POST /api/messages/create, including the embedded chat with its members.
function messageTemplate(chatId, userId) {
  const user = (id) => ({ id, full_name: `Load User ${id}`, email: `loaduser${id}@load.test`, profile_picture: null });
  return {
    id: 0, content: '__CONTENT__', encrypted: true, timestamp: '2026-01-01T00:00:00',
    user: user(userId),
    chat: { id: chatId, chat_name: null, chat_image: null, admins: [], group: false,
      createdBy: user(userId), users: [user(userId), user(userId + 1)], messages: [] },
  };
}

export default async function () {
  const pair = Math.floor((__VU - 1) / 2);
  const chatId = 800000 + pair;
  const [before, after] = JSON.stringify(messageTemplate(chatId, __VU)).split('__CONTENT__');
  const cipher = fakeCiphertext(300);
  const holdMs = msUntilPlanEnd(LEVELS);
  if (holdMs < 2000) { sleep(holdMs > 0 ? holdMs / 1000 + 1 : 1); return; }

  await new Promise((resolveOnce) => {
    // If the server dies mid-test its sockets never close; don't let that hang k6.
    let settled = false;
    const resolve = () => { if (!settled) { settled = true; resolveOnce(); } };
    setTimeout(resolve, holdMs + 8000);
    let timer = null;
    let credit = 0;
    const client = stompConnect({
      onConnected(c) {
        c.subscribe(`/group/${chatId}`);
        setTimeout(() => { if (timer) clearInterval(timer); c.close(); }, holdMs);
        // Let every VU connect and subscribe before the clock-driven send loop starts.
        setTimeout(() => {
          timer = setInterval(() => {
            if (c.isClosed) return;
            const idx = Math.min(LEVELS.length - 1, Number(rawStep()));
            credit += (LEVELS[idx] / VUS) * (TICK_MS / 1000);
            while (credit >= 1) {
              credit -= 1;
              const now = Date.now();
              c.send('/app/message', `${before}m:${now}:${__VU}:${cipher}${after}`);
              sent.add(1);
            }
          }, TICK_MS);
        }, Math.random() * TICK_MS);
      },
      onMessage(f) {
        // Body is the re-serialised Message; pull the marker out of "content".
        const i = f.body.indexOf('"content":"m:');
        if (i < 0) return;
        const parts = f.body.slice(i + 13, i + 60).split(':');
        if (parts[1] === String(__VU)) return; // our own echo; count peer deliveries only
        received.add(1);
        delivery.add(Date.now() - Number(parts[0]), tags('ws_broker'));
      },
      onError() { if (timer) clearInterval(timer); client.close(); resolve(); },
      onClose() { if (timer) clearInterval(timer); resolve(); },
    }, { name: 'ws' });
  });
}


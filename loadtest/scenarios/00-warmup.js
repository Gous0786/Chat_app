// 00 — Warm-up, not a measurement.
// run.sh restarts the backend before every test so one test's damage can't
// leak into the next. A fresh JVM is interpreted and slow for its first few
// thousand requests, so this exercises every code path gently before
// measuring starts.
import http from 'k6/http';
import { BASE_URL, data, pick, authHeaders, fakeCiphertext } from '../lib/common.js';
import { stompConnect } from '../lib/stomp.js';

export const options = {
  scenarios: {
    // At most 4 concurrent users: a cold JVM is slow, and 10+ overlapping
    // inserts can deadlock the 10-connection pool (see REPORT.md), which would
    // wreck the test before it starts.
    warm: { executor: 'constant-arrival-rate', rate: 3, timeUnit: '1s', duration: __ENV.WARMUP_DURATION || '40s', preAllocatedVUs: 4, maxVUs: 4 },
  },
  discardResponseBodies: true,
};

export default async function () {
  const d = data();
  const p = pick(d.pairs);
  const u = d.users[p.a];
  const h = { headers: authHeaders(u.token), timeout: '10s' };
  http.get(`${BASE_URL}/api/users/profile`, h);
  http.get(`${BASE_URL}/api/chats/user`, h);
  http.get(`${BASE_URL}/api/messages/chat/${p.chatId}`, h);
  http.get(`${BASE_URL}/api/users/query?query=user%20${Math.floor(Math.random() * 200)}`, h);
  http.post(`${BASE_URL}/api/messages/create`, JSON.stringify({ chatId: p.chatId, content: fakeCiphertext(), encrypted: true }), h);
  http.get(`${BASE_URL}/api/keys/count`, h);
  if (Math.random() < 0.1) {
    http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: u.email, password: 'Passw0rd!load' }),
      { headers: { 'Content-Type': 'application/json' }, timeout: '10s' });
  }
  await new Promise((resolve) => {
    const c = stompConnect({
      onConnected(client) {
        client.subscribe(`/group/${p.chatId}`);
        client.send('/app/message', JSON.stringify({ content: 'warm', chat: { id: p.chatId } }));
      },
      onMessage() { c.close(); },
      onError() { c.close(); resolve(); },
      onClose() { resolve(); },
    });
    setTimeout(() => { c.close(); resolve(); }, 3000);
  });
}

export function handleSummary() {
  return { stdout: '   (warm-up done)\n' };
}

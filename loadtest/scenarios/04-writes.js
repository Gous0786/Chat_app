// 04 — Write API capacity.
// message_send is the hot path of the product: every chat message is
// persisted over REST before it is pushed over the socket.
import http from 'k6/http';
import {
  BASE_URL, HTTP_TIMEOUT, data, pick, tags, parseList, authHeaders, fakeCiphertext,
  httpStaircases, summarize, markSetupEnd,
} from '../lib/common.js';

const ENDPOINTS = [
  { name: 'message_send', exec: 'messageSend', label: 'POST /api/messages/create (persist one E2E message)',
    levels: parseList(__ENV.SEND_RATES, [25, 50, 100, 200, 300, 450, 600, 800]) },
  { name: 'chat_create', exec: 'chatCreate', label: 'POST /api/chats/single (open/create a 1:1 chat)',
    levels: parseList(__ENV.CHAT_CREATE_RATES, [25, 50, 100, 200, 300, 450]) },
];

const built = httpStaircases(ENDPOINTS);
export const options = built.options;
export const handleSummary = summarize('04-writes', built.plans);
export function setup() { return markSetupEnd(); }

export function messageSend() {
  const d = data();
  const p = pick(d.pairs);
  const sender = d.users[Math.random() < 0.5 ? p.a : p.b];
  http.post(`${BASE_URL}/api/messages/create`,
    JSON.stringify({ chatId: p.chatId, content: fakeCiphertext(), encrypted: true }),
    { headers: authHeaders(sender.token), tags: tags('message_send'), timeout: HTTP_TIMEOUT });
}

export function chatCreate() {
  const d = data();
  const a = pick(d.users);
  let b = pick(d.users);
  while (b.id === a.id) b = pick(d.users);
  http.post(`${BASE_URL}/api/chats/single`, JSON.stringify({ userId: b.id }),
    { headers: authHeaders(a.token), tags: tags('chat_create'), timeout: HTTP_TIMEOUT });
}

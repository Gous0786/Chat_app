// 03 — Read API capacity, one endpoint at a time.
// Every authenticated call first resolves the JWT to a user via
// findByEmail (an unindexed column), so even "cheap" reads hit MySQL.
import http from 'k6/http';
import {
  BASE_URL, HTTP_TIMEOUT, data, pick, tags, parseList, authHeaders, httpStaircases, summarize, markSetupEnd,
} from '../lib/common.js';

const ENDPOINTS = [
  { name: 'profile', exec: 'profile', label: 'GET /api/users/profile (JWT -> user lookup only)',
    levels: parseList(__ENV.PROFILE_RATES, [50, 100, 200, 400, 600, 800, 1200]) },
  { name: 'chats', exec: 'chats', label: 'GET /api/chats/user (chat list with members)',
    levels: parseList(__ENV.CHATS_RATES, [50, 100, 200, 400, 600, 800, 1200]) },
  { name: 'history', exec: 'history', label: 'GET /api/messages/chat/{id} (typical chat, ~10-30 msgs)',
    levels: parseList(__ENV.HISTORY_RATES, [25, 50, 100, 200, 300, 450, 600]) },
  { name: 'search', exec: 'search', label: 'GET /api/users/query (LIKE %q% over all users)',
    levels: parseList(__ENV.SEARCH_RATES, [10, 25, 50, 100, 200, 300, 450]) },
];

const built = httpStaircases(ENDPOINTS);
export const options = built.options;
export const handleSummary = summarize('03-reads', built.plans);
export function setup() { return markSetupEnd(); }

const opts = (token, name) => ({ headers: authHeaders(token), tags: tags(name), timeout: HTTP_TIMEOUT });

export function profile() {
  http.get(`${BASE_URL}/api/users/profile`, opts(pick(data().users).token, 'profile'));
}

export function chats() {
  http.get(`${BASE_URL}/api/chats/user`, opts(pick(data().users).token, 'chats'));
}

export function history() {
  const d = data();
  const p = pick(d.pairs);
  http.get(`${BASE_URL}/api/messages/chat/${p.chatId}`, opts(d.users[p.a].token, 'history'));
}

export function search() {
  // Realistic partial names: "user 13" matches ~111 of 2000 users (13, 130-139, 1300-1399).
  const q = `user ${Math.floor(Math.random() * 200)}`;
  http.get(`${BASE_URL}/api/users/query?query=${encodeURIComponent(q)}`, opts(pick(data().users).token, 'search'));
}

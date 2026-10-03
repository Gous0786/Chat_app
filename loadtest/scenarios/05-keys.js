// 05 — E2E key directory (Signal prekeys).
// key_publish inserts 101 rows one save() at a time.
// key_fetch claims one prekey under a pessimistic row lock (SELECT ... FOR UPDATE).
// key_fetch_hot points every request at the same user, which is what happens
// when one popular account gets messaged by many new contacts at once. That
// serialises on the lock.
import http from 'k6/http';
import {
  BASE_URL, HTTP_TIMEOUT, data, pick, tags, parseList, authHeaders, fakeCiphertext,
  httpStaircases, summarize, markSetupEnd,
} from '../lib/common.js';

const ENDPOINTS = [
  { name: 'key_publish', exec: 'publish', label: 'POST /api/keys/bundle (identity + 100 prekeys)',
    levels: parseList(__ENV.PUBLISH_RATES, [2, 5, 10, 20, 30, 45, 60]) },
  { name: 'key_fetch', exec: 'fetchSpread', label: 'GET /api/keys/bundle/{id} (random recipients)',
    levels: parseList(__ENV.FETCH_RATES, [25, 50, 100, 200, 300, 450, 600]) },
  { name: 'key_fetch_hot', exec: 'fetchHot', label: 'GET /api/keys/bundle/{id} (one hot recipient, lock contention)',
    levels: parseList(__ENV.FETCH_HOT_RATES, [10, 25, 50, 100, 200, 300, 450]) },
];

const built = httpStaircases(ENDPOINTS);
export const options = built.options;
export const handleSummary = summarize('05-keys', built.plans);

function preKeys(n) {
  const start = Math.floor(Math.random() * 1e6);
  const keys = [];
  for (let i = 0; i < n; i++) keys.push({ id: start + i, publicKey: fakeCiphertext(44) });
  return keys;
}

// The hot user needs enough prekeys that the pool does not run dry mid-test,
// otherwise the test would measure "empty pool" instead of lock contention.
export function setup() {
  const d = data();
  const hot = d.users[0];
  const total = Number(__ENV.HOT_PREKEYS || 8000);
  for (let i = 0; i < total / 200; i++) {
    http.post(`${BASE_URL}/api/keys/prekeys`, JSON.stringify({ oneTimePreKeys: preKeys(200) }),
      { headers: authHeaders(hot.token), timeout: '120s', tags: { name: 'setup' } });
  }
  return markSetupEnd({ hotUserId: hot.id });
}

export function publish() {
  // Republishing replaces the identity row and appends 100 prekeys, like a reinstall.
  const d = data();
  const idx = Math.floor(Math.random() * d.keyUserIds.length);
  const u = d.users[idx];
  const body = JSON.stringify({
    registrationId: 4321, identityKey: fakeCiphertext(44), signedPreKeyId: 1,
    signedPreKeyPublic: fakeCiphertext(44), signedPreKeySignature: fakeCiphertext(88), oneTimePreKeys: preKeys(100),
  });
  http.post(`${BASE_URL}/api/keys/bundle`, body,
    { headers: authHeaders(u.token), tags: tags('key_publish'), timeout: HTTP_TIMEOUT });
}

export function fetchSpread() {
  const d = data();
  // Skip index 0: that is the hot user, reserved for the contention test.
  const target = d.keyUserIds[1 + Math.floor(Math.random() * (d.keyUserIds.length - 1))];
  http.get(`${BASE_URL}/api/keys/bundle/${target}`,
    { headers: authHeaders(pick(d.users).token), tags: tags('key_fetch'), timeout: HTTP_TIMEOUT });
}

export function fetchHot(setupData) {
  const d = data();
  http.get(`${BASE_URL}/api/keys/bundle/${setupData.hotUserId}`,
    { headers: authHeaders(pick(d.users).token), tags: tags('key_fetch_hot'), timeout: HTTP_TIMEOUT });
}

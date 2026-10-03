// Seeds the load-test database through the public API (same path real clients
// use) and writes loadtest/data/seed.json for the k6 scenarios to read.
//
//   node seed/seed.mjs
//
// Env: BASE_URL (default http://localhost:15454), SEED_USERS (2000),
//      SEED_MSGS_PER_PAIR (10), SEED_KEY_USERS (100), SEED_CONCURRENCY (8)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL || 'http://localhost:15454';
const USERS = Number(process.env.SEED_USERS || 2000);
const MSGS_PER_PAIR = Number(process.env.SEED_MSGS_PER_PAIR || 10);
const KEY_USERS = Number(process.env.SEED_KEY_USERS || 100);
const CONC = Number(process.env.SEED_CONCURRENCY || 8);
const HISTORY_SIZES = [10, 100, 1000, 5000];
const PASSWORD = 'Passw0rd!load';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'data', 'seed.json');

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  let text;
  // Docker Desktop's port forward occasionally resets a reused socket; retry those.
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      text = await res.text();
      break;
    } catch (e) {
      if (attempt >= 5) throw e;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}
  return { status: res.status, json, text };
}

async function pool(items, worker, label) {
  let next = 0;
  let done = 0;
  const started = Date.now();
  const results = new Array(items.length);
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      done++;
      if (done % 200 === 0 || done === items.length) {
        const rate = done / ((Date.now() - started) / 1000);
        process.stdout.write(`\r  ${label}: ${done}/${items.length} (${rate.toFixed(0)}/s)   `);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length) }, run));
  process.stdout.write('\n');
  return results;
}

async function waitForBackend() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(BASE + '/');
      if (r.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`backend not reachable at ${BASE}`);
}

// Signup, or login if the user already exists from an earlier seed.
async function ensureUser(email, fullName) {
  let r = await api('POST', '/auth/signup', { body: { email, full_name: fullName, password: PASSWORD } });
  if (r.status !== 201) {
    r = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
    if (r.status !== 200) throw new Error(`cannot create/login ${email}: ${r.status} ${r.text}`);
  }
  const token = r.json.jwt;
  const p = await api('GET', '/api/users/profile', { token });
  return { id: p.json.id, email, token };
}

function b64(n) {
  return Buffer.from(Array.from({ length: n }, () => Math.floor(Math.random() * 256))).toString('base64');
}

function fakeBundle() {
  const startId = Math.floor(Math.random() * 100000) + 1;
  return {
    registrationId: Math.floor(Math.random() * 16380) + 1,
    identityKey: b64(33),
    signedPreKeyId: 1,
    signedPreKeyPublic: b64(33),
    signedPreKeySignature: b64(64),
    oneTimePreKeys: Array.from({ length: 100 }, (_, i) => ({ id: startId + i, publicKey: b64(33) })),
  };
}

async function sendMessages(chatId, a, b, count) {
  const items = Array.from({ length: count }, (_, i) => i);
  await pool(
    items,
    async (i) => {
      const sender = i % 2 === 0 ? a : b;
      const r = await api('POST', '/api/messages/create', {
        token: sender.token,
        body: { chatId, content: b64(240), encrypted: true },
      });
      if (r.status !== 200) throw new Error(`message create failed ${r.status} ${r.text}`);
    },
    `history chat ${chatId} (${count} msgs)`
  );
}

async function main() {
  console.log(`Seeding ${BASE}: ${USERS} users, ${MSGS_PER_PAIR} msgs/pair, ${KEY_USERS} key bundles`);
  await waitForBackend();
  const t0 = Date.now();

  const idx = Array.from({ length: USERS }, (_, i) => i);
  const users = await pool(idx, (i) => ensureUser(`loaduser${i}@load.test`, `Load User ${i}`), 'users');

  // Pair users (0,1), (2,3), ... into one-to-one chats, like two friends talking.
  const pairIdx = Array.from({ length: Math.floor(USERS / 2) }, (_, i) => i);
  const pairs = await pool(
    pairIdx,
    async (p) => {
      const a = users[2 * p];
      const b = users[2 * p + 1];
      const r = await api('POST', '/api/chats/single', { token: a.token, body: { userId: b.id } });
      if (r.status !== 200) throw new Error(`chat create failed ${r.status} ${r.text}`);
      return { a: 2 * p, b: 2 * p + 1, chatId: r.json.id };
    },
    'chats'
  );

  if (MSGS_PER_PAIR > 0) {
    // Resumable: only top up chats that are short of MSGS_PER_PAIR.
    const have = await pool(
      pairs,
      async (p) => {
        const r = await api('GET', `/api/messages/chat/${p.chatId}`, { token: users[p.a].token });
        return Array.isArray(r.json) ? r.json.length : 0;
      },
      'existing history'
    );
    const msgItems = [];
    pairs.forEach((p, i) => {
      for (let m = have[i]; m < MSGS_PER_PAIR; m++) msgItems.push({ p, m });
    });
    await pool(
      msgItems,
      async ({ p, m }) => {
        const sender = users[m % 2 === 0 ? p.a : p.b];
        const r = await api('POST', '/api/messages/create', {
          token: sender.token,
          body: { chatId: p.chatId, content: b64(240), encrypted: true },
        });
        if (r.status !== 200) throw new Error(`message create failed ${r.status} ${r.text}`);
      },
      'pair history'
    );
  }

  // Dedicated chats with fixed history sizes: the history endpoint has no
  // pagination, so its cost should scale with chat length. These measure that.
  const history = {};
  for (let h = 0; h < HISTORY_SIZES.length; h++) {
    const size = HISTORY_SIZES[h];
    const a = await ensureUser(`hist${size}a@load.test`, `History ${size} A`);
    const b = await ensureUser(`hist${size}b@load.test`, `History ${size} B`);
    const r = await api('POST', '/api/chats/single', { token: a.token, body: { userId: b.id } });
    const chatId = r.json.id;
    const existing = await api('GET', `/api/messages/chat/${chatId}`, { token: a.token });
    const have = Array.isArray(existing.json) ? existing.json.length : 0;
    if (have < size) await sendMessages(chatId, a, b, size - have);
    history[size] = { chatId, token: a.token };
  }

  // Signal key bundles (identity + signed prekey + 100 one-time prekeys) for a subset.
  const keyIdx = Array.from({ length: Math.min(KEY_USERS, USERS) }, (_, i) => i);
  await pool(
    keyIdx,
    async (i) => {
      const r = await api('POST', '/api/keys/bundle', { token: users[i].token, body: fakeBundle() });
      if (r.status !== 200) throw new Error(`bundle publish failed ${r.status} ${r.text}`);
    },
    'key bundles'
  );

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({
      seededAt: new Date().toISOString(),
      params: { USERS, MSGS_PER_PAIR, KEY_USERS },
      users,
      pairs,
      history,
      keyUserIds: keyIdx.map((i) => users[i].id),
    })
  );
  console.log(`Seed done in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

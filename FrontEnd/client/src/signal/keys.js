import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { signalStore } from './store';
import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';
import { BASE_API_URL } from '../config/api';

const ONE_TIME_PREKEY_COUNT = 100;
const SIGNED_PREKEY_ID = 1;
const REPLENISH_THRESHOLD = 20;

// A module-level counter base for one-time prekey ids. We persist the next id in
// the store's registrationId-adjacent slot is overkill for v1; use a growing id
// derived from a random start so re-runs don't collide within a session.
function randomStartId() {
  // ids are 14-bit-ish in Signal; keep them comfortably in range and unique-ish
  return Math.floor(Math.random() * 100000) + 1;
}

/**
 * Generate a full identity + prekeys, persist them locally, and return the
 * public bundle payload (base64) ready to POST to the server. Pure local crypto
 * — no network. Idempotent: if an identity already exists, returns null.
 */
export async function generateAndStoreIdentity() {
  if (await signalStore.hasIdentity()) {
    return null; // already set up on this device
  }

  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = KeyHelper.generateRegistrationId(); // synchronous

  await signalStore.storeIdentityKeyPair(identityKeyPair);
  await signalStore.storeLocalRegistrationId(registrationId);

  const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, SIGNED_PREKEY_ID);
  await signalStore.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

  const startId = randomStartId();
  const oneTimePreKeys = [];
  for (let i = 0; i < ONE_TIME_PREKEY_COUNT; i++) {
    const preKey = await KeyHelper.generatePreKey(startId + i);
    await signalStore.storePreKey(preKey.keyId, preKey.keyPair);
    oneTimePreKeys.push({
      id: preKey.keyId,
      publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
    });
  }

  return {
    registrationId,
    identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
    signedPreKeyId: signedPreKey.keyId,
    signedPreKeyPublic: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
    signedPreKeySignature: arrayBufferToBase64(signedPreKey.signature),
    oneTimePreKeys,
  };
}

/** POST a bundle payload to the server. */
export async function publishBundle(bundle, token) {
  const res = await fetch(`${BASE_API_URL}/api/keys/bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) throw new Error(`publishBundle failed: ${res.status}`);
}

/**
 * Ensure this device has a Signal identity and the server has our bundle.
 * Safe to call on every login — generation is skipped if already present.
 */
export async function initSignalIdentity(token) {
  const bundle = await generateAndStoreIdentity();
  if (bundle) {
    await publishBundle(bundle, token);
  }
}

/** Top up the server's one-time prekey pool when it runs low. */
export async function replenishPreKeys(token) {
  const countRes = await fetch(`${BASE_API_URL}/api/keys/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!countRes.ok) return;
  const { oneTimePreKeyCount } = await countRes.json();
  if (oneTimePreKeyCount >= REPLENISH_THRESHOLD) return;

  const startId = randomStartId();
  const oneTimePreKeys = [];
  for (let i = 0; i < ONE_TIME_PREKEY_COUNT; i++) {
    const preKey = await KeyHelper.generatePreKey(startId + i);
    await signalStore.storePreKey(preKey.keyId, preKey.keyPair);
    oneTimePreKeys.push({
      id: preKey.keyId,
      publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
    });
  }

  await fetch(`${BASE_API_URL}/api/keys/prekeys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ oneTimePreKeys }),
  });
}

// re-export for tests / other modules
export { base64ToArrayBuffer };

import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
} from '@privacyresearch/libsignal-protocol-typescript';
import { signalStore } from './store';
import {
  base64ToArrayBuffer,
  arrayBufferToBase64,
  stringToArrayBuffer,
  arrayBufferToString,
} from './encoding';
import { BASE_API_URL } from '../config/api';

// v1 is single-device: every user is device 1.
const DEVICE_ID = 1;

// Cache SessionCipher per peer address so we reuse ratchet state within a session.
const cipherCache = new Map();

function addressFor(peerUserId) {
  return new SignalProtocolAddress(String(peerUserId), DEVICE_ID);
}

/**
 * Ensure a Signal session exists with the peer. If not, fetch their prekey
 * bundle from the server and run X3DH (processPreKey). Safe to call repeatedly.
 */
export async function ensureSession(peerUserId, token) {
  const address = addressFor(peerUserId);
  const existing = await signalStore.loadSession(address.toString());
  if (existing) return;

  const res = await fetch(`${BASE_API_URL}/api/keys/bundle/${peerUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetch bundle failed for ${peerUserId}: ${res.status}`);
  const b = await res.json();

  // Build the DeviceType the library expects — all key material as ArrayBuffers.
  const device = {
    registrationId: b.registrationId,
    identityKey: base64ToArrayBuffer(b.identityKey),
    signedPreKey: {
      keyId: b.signedPreKeyId,
      publicKey: base64ToArrayBuffer(b.signedPreKeyPublic),
      signature: base64ToArrayBuffer(b.signedPreKeySignature),
    },
  };
  // One-time prekey is optional — server returns null fields when the pool is empty.
  if (b.preKeyId != null && b.preKeyPublic != null) {
    device.preKey = {
      keyId: b.preKeyId,
      publicKey: base64ToArrayBuffer(b.preKeyPublic),
    };
  }

  const builder = new SessionBuilder(signalStore, address);
  await builder.processPreKey(device);
}

/** Get (and cache) a SessionCipher for a peer. */
export function getCipher(peerUserId) {
  const address = addressFor(peerUserId);
  const key = address.toString();
  if (!cipherCache.has(key)) {
    cipherCache.set(key, new SessionCipher(signalStore, address));
  }
  return cipherCache.get(key);
}

/**
 * Encrypt plaintext for a peer. Returns a self-describing JSON envelope string
 * to store as the message `content`: {v, type, body(base64)}.
 * `type` is 3 (PreKeyWhisperMessage) for the first message, 1 afterwards.
 */
export async function encryptForPeer(peerUserId, plaintext) {
  const cipher = getCipher(peerUserId);
  const ciphertext = await cipher.encrypt(stringToArrayBuffer(plaintext));
  // `body` is a binary string; base64 it so it survives JSON + a TEXT column.
  return JSON.stringify({
    v: 1,
    type: ciphertext.type,
    body: btoa(ciphertext.body),
  });
}

/**
 * Decrypt an envelope produced by encryptForPeer. `senderUserId` is the peer.
 * Throws on auth failure / malformed input — callers should catch and fall back.
 */
export async function decryptFromPeer(senderUserId, envelopeString) {
  const cipher = getCipher(senderUserId);
  const env = JSON.parse(envelopeString);
  const body = atob(env.body); // back to binary string
  const plaintextBuf =
    env.type === 3
      ? await cipher.decryptPreKeyWhisperMessage(body, 'binary')
      : await cipher.decryptWhisperMessage(body, 'binary');
  return arrayBufferToString(plaintextBuf);
}

// re-exported for callers that need raw encoding helpers
export { arrayBufferToBase64 };

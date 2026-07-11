import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
} from '@privacyresearch/libsignal-protocol-typescript';
import { signalStore } from './store';
import { base64ToArrayBuffer } from './encoding';
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

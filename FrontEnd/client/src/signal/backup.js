import { signalStore } from './store';
import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';
import { BASE_API_URL } from '../config/api';

/**
 * Password-encrypted backup of this device's Signal identity.
 *
 * We serialize the store's identity material (identity keypair, registrationId,
 * signed prekeys), encrypt it with a key derived from the user's password via
 * PBKDF2, and upload the opaque blob. The server can never decrypt it.
 *
 * Honest limitation: the backup has NO forward secrecy — a stolen blob plus the
 * password reveals the long-term identity key. Use a strong password.
 */

const PBKDF2_ITERATIONS = 200000;

// ---- ArrayBuffer-aware JSON codec (JSON.stringify can't handle ArrayBuffers) ----
// We tag encoded buffers so the reviver can rebuild them on restore.
function encodeBuffers(value) {
  if (value instanceof ArrayBuffer) {
    return { __ab: arrayBufferToBase64(value) };
  }
  if (Array.isArray(value)) {
    return value.map(encodeBuffers);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = encodeBuffers(value[k]);
    return out;
  }
  return value;
}

function decodeBuffers(value) {
  if (value && typeof value === 'object') {
    if (typeof value.__ab === 'string' && Object.keys(value).length === 1) {
      return base64ToArrayBuffer(value.__ab);
    }
    if (Array.isArray(value)) return value.map(decodeBuffers);
    const out = {};
    for (const k of Object.keys(value)) out[k] = decodeBuffers(value[k]);
    return out;
  }
  return value;
}

async function deriveKey(password, salt, iterations) {
  const pwKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Serialize + encrypt the store with the password, and upload it.
 * Call after the identity is set up (password is available at signup/login).
 */
export async function backupIdentity(password, token) {
  const data = await signalStore.exportForBackup();
  if (!data.identityKeyPair) return; // nothing to back up yet

  const plaintext = new TextEncoder().encode(JSON.stringify(encodeBuffers(data)));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  await fetch(`${BASE_API_URL}/api/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ciphertext: arrayBufferToBase64(ciphertext),
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      iterations: PBKDF2_ITERATIONS,
    }),
  });
}

/** True if the server has a backup for this user. */
export async function hasServerBackup(token) {
  const res = await fetch(`${BASE_API_URL}/api/backup`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

/**
 * Download + decrypt the backup with the password and repopulate the store.
 * Returns true on success; throws 'incorrect password' on a wrong password
 * (AES-GCM auth failure) or if no backup exists.
 */
export async function restoreIdentity(password, token) {
  const res = await fetch(`${BASE_API_URL}/api/backup`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No backup found');
  const blob = await res.json();

  const salt = new Uint8Array(base64ToArrayBuffer(blob.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(blob.iv));
  const key = await deriveKey(password, salt, blob.iterations || PBKDF2_ITERATIONS);

  let plaintextBuf;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      base64ToArrayBuffer(blob.ciphertext)
    );
  } catch (e) {
    throw new Error('Incorrect password');
  }

  const data = decodeBuffers(JSON.parse(new TextDecoder().decode(plaintextBuf)));
  await signalStore.importFromBackup(data);
  return true;
}

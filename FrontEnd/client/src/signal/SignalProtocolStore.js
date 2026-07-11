import { openDB } from 'idb';

/**
 * IndexedDB-backed implementation of the library's StorageType interface.
 *
 * The Signal library is storage-agnostic — it calls these exact method names
 * for every read/write of identity keys, prekeys, signed prekeys, sessions, and
 * trusted identities. Key material is ArrayBuffer; session records are strings.
 * IndexedDB stores both natively, so we persist them as-is.
 *
 * Private keys live here and NEVER leave the device.
 */

const DB_NAME = 'aura-signal';
const DB_VERSION = 1;

// Object stores
const S_IDENTITY = 'identityKey';      // { id: 'self', keyPair }  + { id: 'registrationId', value }
const S_PREKEYS = 'preKeys';           // key: preKeyId -> KeyPairType
const S_SIGNED = 'signedPreKeys';      // key: signedPreKeyId -> KeyPairType
const S_SESSIONS = 'sessions';         // key: address string -> session record (string)
const S_IDENTITIES = 'identities';     // key: address string -> identity public key (ArrayBuffer)
const S_PLAINTEXT = 'plaintextCache';  // key: server message id -> { text } (used in Stage 5)

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore(S_IDENTITY);
        database.createObjectStore(S_PREKEYS);
        database.createObjectStore(S_SIGNED);
        database.createObjectStore(S_SESSIONS);
        database.createObjectStore(S_IDENTITIES);
        database.createObjectStore(S_PLAINTEXT);
      },
    });
  }
  return dbPromise;
}

// Direction enum mirrors the library (SENDING=1, RECEIVING=2); unused values are fine.

export class SignalProtocolStore {
  // ---- our own helpers (not part of StorageType) ----

  async storeIdentityKeyPair(keyPair) {
    return (await db()).put(S_IDENTITY, keyPair, 'self');
  }

  async storeLocalRegistrationId(id) {
    return (await db()).put(S_IDENTITY, id, 'registrationId');
  }

  async hasIdentity() {
    const kp = await (await db()).get(S_IDENTITY, 'self');
    return !!kp;
  }

  // ---- StorageType interface (names must match exactly) ----

  async getIdentityKeyPair() {
    return (await db()).get(S_IDENTITY, 'self');
  }

  async getLocalRegistrationId() {
    return (await db()).get(S_IDENTITY, 'registrationId');
  }

  // TOFU: trust an unknown identifier on first sight; only distrust if a
  // DIFFERENT key later appears for a known identifier (key-change detection).
  async isTrustedIdentity(identifier, identityKey /*, direction */) {
    const trusted = await (await db()).get(S_IDENTITIES, identifier);
    if (trusted === undefined) return true;
    return buffersEqual(trusted, identityKey);
  }

  async saveIdentity(encodedAddress, publicKey /*, nonblockingApproval */) {
    const existing = await (await db()).get(S_IDENTITIES, encodedAddress);
    await (await db()).put(S_IDENTITIES, publicKey, encodedAddress);
    // return true if the identity CHANGED (existed and differs)
    return existing !== undefined && !buffersEqual(existing, publicKey);
  }

  async loadIdentityKey(identifier) {
    return (await db()).get(S_IDENTITIES, identifier);
  }

  async loadPreKey(keyId) {
    return (await db()).get(S_PREKEYS, String(keyId));
  }

  async storePreKey(keyId, keyPair) {
    return (await db()).put(S_PREKEYS, keyPair, String(keyId));
  }

  async removePreKey(keyId) {
    // Must actually delete: a one-time prekey is consumed after first use.
    return (await db()).delete(S_PREKEYS, String(keyId));
  }

  async loadSignedPreKey(keyId) {
    return (await db()).get(S_SIGNED, String(keyId));
  }

  async storeSignedPreKey(keyId, keyPair) {
    return (await db()).put(S_SIGNED, keyPair, String(keyId));
  }

  async removeSignedPreKey(keyId) {
    return (await db()).delete(S_SIGNED, String(keyId));
  }

  async loadSession(encodedAddress) {
    return (await db()).get(S_SESSIONS, encodedAddress);
  }

  async storeSession(encodedAddress, record) {
    return (await db()).put(S_SESSIONS, record, encodedAddress);
  }

  async removeSession(encodedAddress) {
    return (await db()).delete(S_SESSIONS, encodedAddress);
  }

  async removeAllSessions() {
    return (await db()).clear(S_SESSIONS);
  }

  // ---- plaintext cache (Stage 5) ----

  async cachePlaintext(messageId, text) {
    return (await db()).put(S_PLAINTEXT, { text }, String(messageId));
  }

  async getCachedPlaintext(messageId) {
    const rec = await (await db()).get(S_PLAINTEXT, String(messageId));
    return rec ? rec.text : undefined;
  }

  // ---- backup support (Stage 6): dump/restore raw store contents ----

  async exportForBackup() {
    const d = await db();
    return {
      identityKeyPair: await d.get(S_IDENTITY, 'self'),
      registrationId: await d.get(S_IDENTITY, 'registrationId'),
      signedPreKeys: await dumpStore(d, S_SIGNED),
    };
  }

  async importFromBackup(data) {
    const d = await db();
    if (data.identityKeyPair) await d.put(S_IDENTITY, data.identityKeyPair, 'self');
    if (data.registrationId !== undefined) await d.put(S_IDENTITY, data.registrationId, 'registrationId');
    if (data.signedPreKeys) {
      for (const { key, value } of data.signedPreKeys) {
        await d.put(S_SIGNED, value, key);
      }
    }
  }
}

async function dumpStore(d, storeName) {
  const keys = await d.getAllKeys(storeName);
  const out = [];
  for (const key of keys) {
    out.push({ key, value: await d.get(storeName, key) });
  }
  return out;
}

function buffersEqual(a, b) {
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  if (av.byteLength !== bv.byteLength) return false;
  for (let i = 0; i < av.byteLength; i++) {
    if (av[i] !== bv[i]) return false;
  }
  return true;
}

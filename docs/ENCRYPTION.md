# How Aura's End-to-End Encryption Works

Aura encrypts **direct messages** with the **Signal Protocol** — the same design
behind Signal and WhatsApp. Keys are generated and kept in your browser; the
server only ever handles ciphertext it cannot decrypt.

> **Library:** [`@privacyresearch/libsignal-protocol-typescript`](https://github.com/privacyresearchgroup/libsignal-protocol-typescript)
> (Signal Protocol in the browser via WebCrypto — no WASM/eject needed).
> Backups use the browser-native `crypto.subtle`.

---

## The idea in one picture

When you send `let's meet at 5`, two things are true at the same time:

| What you & your recipient see | What the server stores (`message.content`) |
| --- | --- |
| `let's meet at 5` | `{"v":1,"type":3,"body":"MyjpAgiRhAQwARIhBXPJy6…"}` |
| Decrypted in the browser with a key only the two of you hold | No words, ever — just ciphertext |

**End-to-end means end-to-end.** The server relays and stores your message but
never holds a key to open it. A database dump, a curious admin, or a subpoena
reveals only ciphertext.

---

## Step 1 · Identity — every device makes its own keys

The first time you log in, your browser generates **Curve25519** keys via
`KeyHelper`. The public halves are uploaded so others can reach you; the private
halves are written to **IndexedDB** and **never leave the device**.

Only the **public bundle** is sent to the server (`POST /api/keys/bundle`):

| Field | Purpose |
| --- | --- |
| Identity key | Long-term "who you are" |
| Signed prekey | Medium-term, signature-verified |
| One-time prekeys | Pool of ~100, one consumed per new chat |
| Registration ID | Identifies this install |

None of this can read messages — it only lets someone *start* a conversation
with you.

---

## Step 2 · The handshake (X3DH)

To message Bob — even if he's offline — Alice fetches his public bundle
(`GET /api/keys/bundle/{bob}`) and runs **X3DH** (Extended Triple
Diffie-Hellman). It mixes several key-agreement steps into one **shared secret**
only Alice and Bob can derive. In code:

```js
new SessionBuilder(store, bob).processPreKey(bundle)
```

The server hands out **one** one-time prekey per request and deletes it
immediately (an atomic, lock-protected operation), so no two conversations reuse
the same starter key. When Bob comes online he reconstructs the identical secret
from the header of Alice's first message — neither had to be online at once.

---

## Step 3 · Per-message keys (Double Ratchet)

Once a session exists, the **Double Ratchet** derives a brand-new key for each
message and **destroys it right after use**:

```
msg 1 · key₁ → burned → msg 2 · key₂ → burned → msg 3 · key₃ → burned → …
```

This gives **forward secrecy**: even if today's key is stolen, yesterday's
messages stay locked — their keys no longer exist. The chain also re-keys with
fresh randomness whenever the conversation changes direction, so a compromise can
even "heal" over time. All of it lives in one call per message:
`SessionCipher.encrypt()` to send, `decrypt…()` to receive.

---

## Step 4 · On the wire — what gets stored

The ciphertext is packaged into a small self-describing JSON envelope,
base64-encoded, and stored as the message's `content`:

```jsonc
{
  "v": 1,           // envelope format version
  "type": 3,        // 3 = first message (carries the X3DH setup)
                    // 1 = every message after (ratchet only)
  "body": "MyjpAgiRhAQwARIhB…"  // base64 ciphertext + auth tag
}
```

- **type 3 — `PreKeyWhisperMessage`**: the opening message that bootstraps the
  session on the recipient's side.
- **type 1 — `WhisperMessage`**: an ordinary ratcheted message once the session
  is running.

The recipient's browser reverses it: decode base64 → decrypt with the right
ratchet key → original text. If decryption fails (tampering, wrong key), it
shows `[unable to decrypt]` rather than guessing.

---

## Step 5 · Reading history — why old messages still open after a reload

The ratchet destroys each key after one use, so re-decrypting stored ciphertext
on every chat re-open would fail the second time. Aura's rule:

1. **Decrypt each message exactly once** — the first time it's seen on this
   device, using the live ratchet.
2. **Cache the plaintext locally** — stored in the browser's `plaintextCache`
   (IndexedDB), keyed by message id.
3. **Serve from cache on reload** — the ratchet is never re-run, so history is
   stable and error-free.

A natural (and correct) consequence: history lives on the device that decrypted
it. Real Signal behaves the same way — keys alone can't resurrect old messages.

---

## Step 6 · Changing devices — keys recoverable by password only

Because private keys live in the browser, clearing storage or switching devices
would normally lose your identity forever. Aura offers an **encrypted backup**:
your identity keys are encrypted **in your browser** with a key stretched from
your password, then the opaque blob is uploaded.

| Step | Mechanism |
| --- | --- |
| Derive key from password | PBKDF2-SHA-256 · 200,000 rounds |
| Encrypt the identity blob | AES-256-GCM |
| Server stores | ciphertext + salt + iv only |
| Restore on new device | re-enter password → decrypt |

A wrong password fails the AES-GCM integrity check — no guessing oracle, no
partial data. The server never sees the password or the keys.

---

## Honest about the edges

This is a learning implementation of a real protocol. It genuinely encrypts, but
it is **not** hardened to Signal-the-product's level.

| | |
| --- | --- |
| ✅ **Direct messages are E2E** | 1:1 chats use full X3DH + Double Ratchet with forward secrecy. |
| ✕ **Group chats are disabled** | Group E2E needs a different scheme (sender keys), so groups are turned off rather than sent in the clear. |
| ⚠ **Trust on first use (TOFU)** | Keys aren't verified via safety numbers yet, so a malicious server could attempt a key swap. |
| ⚠ **Backup ≠ forward secrecy** | A stolen backup blob + the password recovers the identity key — use a strong password. |
| ⚠ **Needs HTTPS in production** | Web Crypto requires a secure context; localhost is fine for dev, real deploys need TLS / `wss://`. |
| ✅ **Server stays blind** | It relays and stores ciphertext + public keys only — never plaintext or private keys. |

---

## Where it lives in the code

**Backend** (key directory + blind relay — no crypto):
- `model/SignalIdentity.java`, `OneTimePreKey.java`, `KeyBackup.java` — schema
- `controller/KeyController.java` — `/api/keys/**` (publish/fetch bundles, atomic prekey handout)
- `controller/BackupController.java` — `/api/backup` (opaque blob store)
- `model/Message.java` — `content` widened to `TEXT` + `encrypted` flag

**Frontend** (all crypto happens here):
- `src/signal/SignalProtocolStore.js` — IndexedDB-backed Signal store
- `src/signal/keys.js` — key generation, publish, `setupIdentity` lifecycle
- `src/signal/session.js` — `ensureSession` (X3DH), `encryptForPeer` / `decryptFromPeer`
- `src/signal/backup.js` — PBKDF2 + AES-GCM password backup
- `src/Components/HomePage.jsx` — send/receive wiring, `plaintextCache`, lock indicator

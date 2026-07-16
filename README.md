# Aura — an end-to-end encrypted chat app

A real-time chat application built with React and Spring Boot: WebSocket messaging,
a dark/gold "liquid glass" interface, and genuine **Signal Protocol end-to-end
encryption** for direct messages.

## Features

- 🔐 **End-to-end encryption** — direct messages use the real Signal Protocol
  (X3DH handshake + Double Ratchet). The server stores and relays only
  ciphertext; private keys never leave the browser. See
  [docs/ENCRYPTION.md](docs/ENCRYPTION.md) for how it works.
- ✨ **Real-time messaging** — instant delivery over WebSocket (STOMP/SockJS)
- 👥 **JWT authentication** — signup/login with BCrypt password hashing
- 💬 **Direct chat** — one-on-one conversations
- 🔑 **Password-protected key backup** — recover your encryption identity on a
  new device by re-entering your password (PBKDF2 + AES-GCM)
- 🎨 **Custom dark UI** — all-black canvas, muted-gold accent, Playfair Display
  headings, and a real Apple-style "liquid glass" effect on floating panels
  (Chromium; degrades gracefully elsewhere)
- 🐳 **Dockerized** — the whole stack (frontend, backend, MySQL) runs with one
  command

> **Note:** group chat exists in the data model but is currently disabled in
> the UI — group messages aren't end-to-end encrypted yet (see
> [docs/ENCRYPTION.md](docs/ENCRYPTION.md#honest-about-the-edges)), so it's
> hidden rather than silently sending plaintext.

## Tech Stack

### Frontend (`FrontEnd/client`)
- **React 18** + **Redux** — UI and state
- **Tailwind CSS** — styling, with a custom dark/gold theme
- **Radix UI** + **class-variance-authority** + **Framer Motion** — accessible
  primitives, variants, and animation (the "shadcn stack," hand-wired for
  Create React App)
- **`@privacyresearch/libsignal-protocol-typescript`** — Signal Protocol
  (X3DH + Double Ratchet) in the browser via WebCrypto
- **`idb`** — IndexedDB wrapper for the local key store
- **`sockjs-client` + `stompjs`** — WebSocket/STOMP client
- **`@fontsource-variable/*`** — self-hosted Playfair Display, DM Sans,
  JetBrains Mono (no font CDN)

### Backend (`Backend`)
- **Spring Boot 3.0.5** (Java 17)
- **Spring Security** + **JWT** — stateless authentication
- **Spring Data JPA** + **MySQL 8** — persistence
- **Spring WebSocket (STOMP)** — real-time relay (the server never inspects
  message content — it's a blind relay for direct messages)

## Getting Started

The fastest way to run everything is **Docker Compose** — it builds and starts
the frontend, backend, and MySQL together.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run it

```bash
git clone <this-repo>
cd Chat_app
cp .env.example .env
# edit .env: set a real JWT_SECRET_KEY (see below)
docker compose up -d --build
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5454
- **MySQL:** localhost:3306

Generate a secret for `JWT_SECRET_KEY` in `.env`:
```bash
openssl rand -base64 32
```

Full details: [QUICK_START.md](QUICK_START.md). Running the pieces individually
without Docker (Java/Maven/Node/MySQL installed locally) is also documented
there.

## Documentation

- **[QUICK_START.md](QUICK_START.md)** — get running in 5 minutes (Docker or manual)
- **[ENV_CONFIGURATION.md](ENV_CONFIGURATION.md)** — every environment variable explained
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — deploying beyond localhost, including free-tier options
- **[docs/ENCRYPTION.md](docs/ENCRYPTION.md)** — how the end-to-end encryption works
- **[.gitignore](.gitignore)** — what's excluded from git

## Project Structure

```
Chat_app/
├── Backend/                        # Spring Boot API
│   ├── src/main/java/…/controller/ # REST + WebSocket endpoints
│   ├── src/main/java/…/model/      # JPA entities (User, Chat, Message, Signal keys)
│   ├── src/main/resources/
│   │   └── application.properties  # env-var-driven config
│   ├── Dockerfile
│   └── .env.example
├── FrontEnd/client/                 # React app
│   ├── src/Components/             # screens + ui/ primitives
│   ├── src/signal/                 # Signal Protocol store, keys, sessions, backup
│   ├── src/Redux/                  # auth/chat/message state
│   ├── Dockerfile
│   └── .env.example
├── docs/
│   └── ENCRYPTION.md               # E2E encryption explainer
├── docker-compose.yml               # full stack: mysql + backend + frontend
├── .env.example                     # root env for docker-compose
└── README.md
```

## Authentication

JWT-based, stateless:

1. **Sign up** (`POST /auth/signup`) or **sign in** (`POST /auth/login`) → receive a JWT
2. The frontend stores the token and attaches it as `Authorization: Bearer <token>`
   on every API request and the WebSocket connection
3. Passwords are hashed with BCrypt server-side; the hash is never sent back to clients

## Real-time messaging

STOMP over SockJS. The server relays direct-message payloads verbatim — for
encrypted messages, it never sees plaintext, only the ciphertext envelope. See
[docs/ENCRYPTION.md](docs/ENCRYPTION.md) for the full mechanism.

## API Overview

| Area | Endpoint | Notes |
|---|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login` | Returns `{ jwt, status }` |
| Users | `GET /api/users/profile`, `GET /api/users/query`, `PUT /api/users/update/{id}` | JWT required |
| Chats | `POST /api/chats/single`, `POST /api/chats/group`, `GET /api/chats/user` | JWT required |
| Messages | `POST /api/messages/create`, `GET /api/messages/chat/{chatId}` | Content may be an encrypted envelope |
| Signal keys | `POST /api/keys/bundle`, `GET /api/keys/bundle/{userId}`, `GET /api/keys/count` | Public key material only — see [docs/ENCRYPTION.md](docs/ENCRYPTION.md) |
| Key backup | `POST /api/backup`, `GET /api/backup` | Opaque, password-encrypted blob |
| WebSocket | `/websocket` (SockJS), app prefix `/app`, broker `/group` | Real-time relay |

## Security notes

- 🔐 **End-to-end encryption** for direct messages (Signal Protocol) — see [docs/ENCRYPTION.md](docs/ENCRYPTION.md)
- 🔑 Password hashing with BCrypt; password hashes are never serialized to clients
- 🛡️ CORS restricted to the configured frontend origin
- ✅ Server-side request validation
- 🚫 React's automatic output escaping mitigates XSS
- ⚠️ **HTTPS/WSS is required for E2E encryption in production** — the browser's
  Web Crypto API only runs in a secure context. `localhost` counts as secure
  for local dev; a real deployment needs TLS. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

See [QUICK_START.md](QUICK_START.md#troubleshooting) and
[ENV_CONFIGURATION.md](ENV_CONFIGURATION.md#common-issues).

## Contributing

Contributions are welcome:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

## Ideas for further work

- [ ] Group chat end-to-end encryption (Sender Keys)
- [ ] Safety-number / key-fingerprint verification (mitigate TOFU trust)
- [ ] Message reactions/emojis
- [ ] Message search
- [ ] Read receipts
- [ ] File/image sharing
- [ ] Voice and video calls

## License

MIT — this is a learning project. Contributions and suggestions are welcome.

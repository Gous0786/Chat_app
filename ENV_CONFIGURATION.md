# Environment Configuration Guide

This project has **three** `.env` files, one per place that needs configuration:

| File | Used by | Copy from |
|---|---|---|
| `Backend/.env` | Spring Boot (manual/non-Docker runs) | `Backend/.env.example` |
| `FrontEnd/client/.env.local` | Create React App (manual/non-Docker runs) | `FrontEnd/client/.env.example` |
| `.env` (repo root) | `docker-compose.yml` | `.env.example` (repo root) |

All three are gitignored — never commit real secrets.

## Quick Start

### Docker (recommended)
```bash
cp .env.example .env
# edit .env: set JWT_SECRET_KEY
docker compose up -d --build
```
The compose file wires `SPRING_DATASOURCE_URL` etc. to the `mysql` container for
you — you don't set those yourself for Docker runs.

### Manual (no Docker)
```bash
cd Backend && cp .env.example .env       # edit with your local DB creds + JWT secret
cd ../FrontEnd/client && cp .env.example .env.local
```

---

## Root `.env` (docker-compose only)

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | *(none — required)* | Signs/validates JWTs. **The app refuses to start without this set.** Generate with `openssl rand -base64 32`. |
| `MYSQL_ROOT_PASSWORD` | `root` | Root password for the MySQL container. |

These two values are injected into the `backend` and `mysql` services by
`docker-compose.yml`; you don't need to set `SPRING_DATASOURCE_URL` etc.
yourself for a Docker run — compose points the backend at the `mysql` service
by hostname already.

---

## Backend Environment Variables (`Backend/.env`, manual runs only)

### Server

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_APPLICATION_NAME` | `Web` | Application name |
| `SERVER_PORT` | `5454` | HTTP port |

### Database

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/whatsapp` | JDBC connection string |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | `com.mysql.cj.jdbc.Driver` | JDBC driver |
| `SPRING_DATASOURCE_USERNAME` | `root` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `root` | DB password |

**Never use `root`/`root` outside local development.**

### Hibernate

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Schema management: `update` auto-adds columns/tables but **will not widen an existing column type** (e.g. `VARCHAR` → `TEXT`) — see the note below. Use `validate` in a real production deployment once the schema is stable. |
| `SPRING_JPA_SHOW_SQL` | `true` | Log SQL statements. Set `false` in production. |

> **Schema migration note:** this project has run at least one migration that
> `ddl-auto=update` cannot apply automatically — widening `message.content`
> from `VARCHAR(255)` to `TEXT` to hold encrypted message envelopes. If you're
> upgrading an existing database rather than starting fresh, run once:
> ```sql
> ALTER TABLE message MODIFY COLUMN content TEXT;
> ```
> A fresh database (new Docker volume, or a new `CREATE DATABASE`) doesn't need
> this — Hibernate creates the column correctly from the start.

### JWT

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | *(none — required)* | **No fallback.** The app fails to start without this set, by design — an earlier version of this project shipped with a hardcoded fallback secret, which is a real security hole (anyone who read the source could forge tokens). Must be 32+ characters. |
| `JWT_EXPIRATION_TIME` | `85400000` | Token lifetime in milliseconds (~24 hours). |

Generate a secret:
```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

---

## Frontend Environment Variables (`FrontEnd/client/.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_API_BASE_URL` | `http://localhost:5454` | Base URL for REST calls **and** the WebSocket (`${REACT_APP_API_BASE_URL}/websocket`). Set this to your deployed backend's HTTPS URL in production — see [DEPLOYMENT.md](DEPLOYMENT.md) for why HTTPS specifically matters here (the Signal encryption library requires a secure browser context). |

Notes:
- Frontend env vars must be prefixed `REACT_APP_` (a Create React App requirement).
- Changes require a rebuild (`npm start` restart, or `npm run build` / a Docker rebuild).
- There is no separate WebSocket URL variable — the socket URL is derived from
  `REACT_APP_API_BASE_URL`.

---

## Security Best Practices

**Do:**
- Generate a strong JWT secret (`openssl rand -base64 32`) and keep it out of git
- Use a unique database password outside local dev
- Use HTTPS/WSS in any real deployment (required for the encryption to initialize at all)
- Rotate the JWT secret periodically

**Don't:**
- Commit `.env`, `.env.local`, or any file with real credentials
- Reuse the `root`/`root` MySQL defaults anywhere but local dev
- Set `ddl-auto=update` (or `create`) against a production database you care about
- Assume a missing `JWT_SECRET_KEY` will fall back to something safe — it won't start at all

---

## Common Issues

### "Required property 'JWT_SECRET_KEY' not found" / app won't start
Set `JWT_SECRET_KEY` in `Backend/.env` (manual) or the root `.env` (Docker). This
is intentional — the app has no fallback secret.

### JWT secret key too short
```
java.lang.IllegalArgumentException: Key size must be at least...
```
Generate a proper 32+ character key (see above).

### Database connection refused
1. Confirm MySQL is running (`docker compose ps` if using Docker)
2. Confirm host/port in `SPRING_DATASOURCE_URL`
3. Confirm username/password
4. Confirm the database exists

### CORS errors in the frontend
Confirm `REACT_APP_API_BASE_URL` matches where the backend actually runs.

### Encryption doesn't seem to work / keys never generate
Open devtools → Console for errors from `src/signal/*`. The most common cause
in production is **not running over HTTPS** — the browser's Web Crypto API
silently requires a secure context (`localhost` counts as one; a plain `http://`
production domain does not).

---

## Additional Resources

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [MySQL Connector/J URL format](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-jdbc-url-format.html)

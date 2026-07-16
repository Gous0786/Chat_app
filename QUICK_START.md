# Quick Start Guide

Get the app running in a few minutes. Two paths: **Docker** (recommended,
matches how the app is actually built and run) or **manual** (install each
piece yourself).

## Option A: Docker (recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Steps

```bash
git clone <this-repo>
cd Chat_app

# 1. Root env (used by docker-compose for the JWT secret + MySQL root password)
cp .env.example .env
```

Edit `.env` and set a real `JWT_SECRET_KEY`:
```bash
openssl rand -base64 32
```
(PowerShell equivalent: `[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))`)

```bash
# 2. Build and start everything
docker compose up -d --build
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5454
- **MySQL:** localhost:3306 (root / whatever you set in `.env`)

Check logs while it starts:
```bash
docker compose logs -f backend
```

Stop everything (keeps the MySQL data volume):
```bash
docker compose down
```

That's it — sign up, open a second browser (or incognito window) as a second
user, and start a direct chat. See [docs/ENCRYPTION.md](docs/ENCRYPTION.md) for
how to verify the messages are actually end-to-end encrypted.

## Option B: Manual (no Docker)

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.0+
- Maven 3.8+ (or use the included `mvnw` wrapper)

### 1. Database

```bash
mysql -u root -p
```
```sql
CREATE DATABASE whatsapp;
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'chat_password_123';
GRANT ALL PRIVILEGES ON whatsapp.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

```bash
cd Backend
cp .env.example .env
# edit .env — at minimum set JWT_SECRET_KEY (32+ chars) and your DB credentials
mvn clean package -DskipTests
mvn spring-boot:run
```
Backend runs at **http://localhost:5454**. Note: unlike some past versions of
this project, there is **no fallback JWT secret** — the app refuses to start
without `JWT_SECRET_KEY` set. This is intentional (see
[ENV_CONFIGURATION.md](ENV_CONFIGURATION.md)).

### 3. Frontend

```bash
cd FrontEnd/client
npm install
cp .env.example .env.local
npm start
```
Frontend opens at **http://localhost:3000**.

### 4. Try it

1. Open **http://localhost:3000**
2. Sign up
3. Sign up a second account in an incognito window (encryption keys are
   per-browser-profile, so two real accounts need two separate profiles)
4. Start a direct chat and send messages between them

## Troubleshooting

### Backend won't start
- **"required property 'JWT_SECRET_KEY' not found"** — set it in `Backend/.env`
  (manual) or the root `.env` (Docker). See above.
- **Port 5454 in use:**
  ```bash
  # Windows (PowerShell)
  Get-NetTCPConnection -LocalPort 5454
  # macOS/Linux
  lsof -i :5454
  ```
- **Database connection error** — confirm MySQL is running and the credentials
  in `Backend/.env` are correct.

### Frontend won't connect to backend
- Check `REACT_APP_API_BASE_URL` in `FrontEnd/client/.env.local`
- Check the browser console (F12) for errors
- If running via Docker, the frontend and backend are separate containers —
  confirm both are `Up`: `docker compose ps`

### "Nothing happens" when sending a message
- Open devtools → Console. Signal key generation runs once per new
  browser/account and can take a moment; check for errors there first.
- Confirm the WebSocket connected — look for `WebSocket connected` in the console.

### Docker-specific
- **`docker compose up` hangs on mysql** — first boot can take ~30–60s while
  MySQL initializes; the backend waits for a healthcheck before starting.
- **Rebuilding after a code change:** `docker compose up -d --build <service>`
  (e.g. `frontend` or `backend`) rebuilds just that service.

## What's Next?

- [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) — every environment variable explained
- [DEPLOYMENT.md](DEPLOYMENT.md) — running this somewhere other than localhost
- [docs/ENCRYPTION.md](docs/ENCRYPTION.md) — how the end-to-end encryption works

## Common Commands

### Docker
```bash
docker compose up -d --build     # build + start everything
docker compose logs -f backend   # tail backend logs
docker compose down              # stop (keeps DB volume)
docker compose down -v           # stop and WIPE the DB volume
```

### Backend (manual)
```bash
mvn clean package     # build
mvn spring-boot:run   # run
mvn test               # run tests
```

### Frontend (manual)
```bash
npm install    # install dependencies
npm start      # dev server
npm run build  # production build
```

---

**Happy coding!**

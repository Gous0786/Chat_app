# Deployment Guide

This app ships as three Docker services (`docker-compose.yml`): MySQL,
Spring Boot backend, and an nginx-served React build. Any deployment target
just needs to run those three pieces — the compose file is the reference.

## ⚠️ HTTPS is not optional

**End-to-end encryption requires a secure browser context.** The frontend uses
the Web Crypto API (`crypto.subtle`) to run the Signal Protocol, and browsers
refuse to expose it outside `https://` or `localhost`. If you deploy this app
over plain `http://`, encryption key generation will silently fail.

This means, unlike a typical "get it online" checklist, **TLS is a functional
requirement here, not a nice-to-have**. Every option below either gives you
HTTPS automatically or is called out where it doesn't.

## Choosing a target

| You want... | Use |
|---|---|
| A free demo/portfolio link, don't mind occasional cold starts | [Render](#option-1-render--vercel-free-demo) + Vercel |
| A permanently free, always-on box you fully control | [Oracle Cloud Free Tier](#option-2-oracle-cloud-always-free-vm) |
| The absolute least effort, small ongoing cost | [Railway](#option-3-railway-paid-easiest) |
| To self-host on your own hardware | [Self-hosting](#option-4-self-hosting-your-own-machine) |

---

## Option 1: Render + Vercel (free demo)

Good for a portfolio link. **Caveats:** Render's free web services sleep after
~15 minutes of inactivity (first request after sleeping takes 30–60s to wake),
and Render's own free database has a ~30-day expiry — use a free external
MySQL instead (e.g. [Aiven](https://aiven.io)) to avoid recreating it monthly.

1. **Database** — create a free MySQL instance (Aiven or similar). Note the
   host, port, username, password.
2. **Backend** on [Render](https://render.com):
   - New → Web Service → connect this repo, root directory `Backend`
   - Environment: **Docker** (it will use `Backend/Dockerfile`)
   - Environment variables:
     ```
     SPRING_DATASOURCE_URL=jdbc:mysql://<your-mysql-host>:<port>/whatsapp
     SPRING_DATASOURCE_USERNAME=<user>
     SPRING_DATASOURCE_PASSWORD=<password>
     JWT_SECRET_KEY=<openssl rand -base64 32>
     SPRING_JPA_HIBERNATE_DDL_AUTO=update
     ```
   - Render provisions HTTPS automatically — note the `https://…onrender.com` URL
3. **Frontend** on [Vercel](https://vercel.com):
   - Import this repo, set the root directory to `FrontEnd/client`
   - Build command: `npm run build`, output directory: `build`
   - Environment variable: `REACT_APP_API_BASE_URL=https://<your-render-backend-url>`
   - Vercel provisions HTTPS automatically

## Option 2: Oracle Cloud Always-Free VM

The most generous permanently-free option: an always-free ARM VM (4 CPUs,
24GB RAM at time of writing) where you run the existing `docker-compose.yml`
as-is, no sleeping, no expiring database. More setup than Option 1 — you
manage the server and its TLS certificate yourself.

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) (requires a card; the Always Free tier itself doesn't charge)
2. Create an Ampere (ARM) compute instance, Ubuntu 22.04, Always Free shape
3. SSH in, install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER
   ```
4. Clone the repo, set up `.env` as in [QUICK_START.md](QUICK_START.md), then:
   ```bash
   docker compose up -d --build
   ```
5. **Put a reverse proxy with TLS in front of it.** The simplest option is
   [Caddy](https://caddyserver.com/) — it gets a free Let's Encrypt certificate
   automatically for a domain you point at the VM:
   ```
   your-domain.com {
       reverse_proxy /api/* localhost:5454
       reverse_proxy /auth/* localhost:5454
       reverse_proxy /websocket localhost:5454
       reverse_proxy localhost:3000
   }
   ```
6. Open ports 80/443 in the Oracle Cloud instance's security list.
7. Rebuild the frontend with `REACT_APP_API_BASE_URL=https://your-domain.com`
   so it calls the proxy, not `localhost:5454` directly.

## Option 3: Railway (paid, easiest)

Railway no longer has a meaningful free tier, but it's the least amount of
manual work if you don't mind a small monthly cost (~$5): connect the repo, it
detects the `docker-compose.yml`/Dockerfiles, add a MySQL plugin, set the same
environment variables as Option 1, deploy. HTTPS is automatic on the generated
domain.

## Option 4: Self-hosting (your own machine)

If you have hardware that can stay powered on, this is genuinely the best
long-term option — no free-tier limits, no sleeping, full control, and it's
the exact `docker-compose.yml` you already have.

1. Install Docker on the machine.
2. Clone the repo, set up `.env`.
3. `docker compose up -d --build`.
4. **Get HTTPS**: the easiest path is [Caddy](https://caddyserver.com/) (see
   the Oracle Cloud steps above) or a tunnel service like
   [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
   / [Tailscale Funnel](https://tailscale.com/kb/1223/funnel), which both give
   you a public HTTPS URL without opening ports on your router.
5. If your ISP gives you a dynamic IP, pair this with a dynamic DNS service, or
   use one of the tunnel options above (they don't need a static IP at all).

---

## Production Checklist

- [ ] `JWT_SECRET_KEY` is a freshly generated 32+ character secret (not a value
      that ever appeared in this repo's git history)
- [ ] Database password is not `root`/`root`
- [ ] `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` once the schema is stable (see
      the migration note in [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) — you
      may need one manual `ALTER TABLE` first if migrating an existing DB)
- [ ] `SPRING_JPA_SHOW_SQL=false`
- [ ] Serving over **HTTPS** (required for encryption — see above) and the
      WebSocket accordingly upgrades to `wss://` automatically once the page is
      loaded over HTTPS
- [ ] `REACT_APP_API_BASE_URL` points at the real HTTPS backend URL
- [ ] Database backups configured (`mysqldump` on a schedule, or your host's
      managed backup feature)
- [ ] CORS origin in `AppConfig.java` matches your real frontend domain (it's
      currently set for local development)

## Database Backup & Restore

```bash
# Backup
docker exec chat_app-mysql-1 mysqldump -uroot -p<password> whatsapp > backup.sql

# Restore
docker exec -i chat_app-mysql-1 mysql -uroot -p<password> whatsapp < backup.sql
```

## Troubleshooting

**CORS errors** — the backend's allowed origin is configured in
`Backend/src/main/java/com/whatsapp/Web/config/AppConfig.java`; update it to
match your deployed frontend URL.

**WebSocket fails behind a reverse proxy** — make sure your proxy config
upgrades `Connection`/`Upgrade` headers for the `/websocket` path (the Caddy
and nginx examples above already do this correctly for their respective tools).

**Encryption silently doesn't initialize** — you're very likely serving over
plain HTTP. Confirm the address bar shows `https://` (or you're on `localhost`).

**JWT secret errors** — see [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md#jwt).

---

## Related Documentation

- [QUICK_START.md](QUICK_START.md) — local development setup
- [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) — every environment variable explained
- [docs/ENCRYPTION.md](docs/ENCRYPTION.md) — why HTTPS matters for this app specifically

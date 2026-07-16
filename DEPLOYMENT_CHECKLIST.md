# Pre-Deployment Checklist

Use this before deploying anywhere beyond localhost. See
[DEPLOYMENT.md](DEPLOYMENT.md) for the actual deployment steps and
[ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) for every variable referenced here.

## Code & Security

- [ ] All code committed
- [ ] No hardcoded credentials or secrets in source
- [ ] `JWT_SECRET_KEY` is a fresh 32+ char secret — **not** any value that has
      ever appeared in this repo's git history
- [ ] Database password is not `root`/`root`
- [ ] `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` (not `update`/`create`) once the
      schema is stable — see the migration note in
      [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md#hibernate)
- [ ] `SPRING_JPA_SHOW_SQL=false`
- [ ] CORS origin in `Backend/.../config/AppConfig.java` matches the real
      deployed frontend domain

## The encryption-specific requirement

- [ ] **The whole app is served over HTTPS** (or you're testing on `localhost`).
      This isn't a general best practice here — it's a hard requirement. The
      Signal Protocol library needs the browser's Web Crypto API, which
      browsers only expose in a secure context. Over plain HTTP, key
      generation silently fails and messaging breaks. See
      [docs/ENCRYPTION.md](docs/ENCRYPTION.md).
- [ ] `REACT_APP_API_BASE_URL` points at the `https://` backend URL (the
      WebSocket URL is derived from this automatically)
- [ ] Reverse proxy (if any) forwards `Connection`/`Upgrade` headers so the
      `/websocket` STOMP endpoint survives the proxy

## Database

- [ ] Database exists on the target server (or managed DB is provisioned)
- [ ] Connection tested from the app's environment
- [ ] Backup strategy defined (`mysqldump` on a schedule, or the host's managed backups)

## Build Verification

- [ ] `docker compose up -d --build` succeeds locally with production-like env vars, **or**
- [ ] `mvn clean package` (backend) and `npm run build` (frontend) both succeed

## Functional Smoke Test (after deploying)

- [ ] Sign up a new user
- [ ] Sign in
- [ ] Sign up a second user in a private/incognito window
- [ ] Start a direct chat between the two
- [ ] Send a message, confirm it arrives in real time
- [ ] Confirm the database stores an encrypted envelope, not plaintext, for
      that message (see [docs/ENCRYPTION.md](docs/ENCRYPTION.md) for the
      exact query)
- [ ] Reload the chat — history should still decrypt correctly
- [ ] Log out / log back in

## Rollback Plan

- [ ] Previous Docker image tag (or JAR) available to redeploy
- [ ] Database backup from immediately before this deployment
- [ ] Know how to restart/redeploy each service quickly

```
Deployment date: _______________
Deployed by:     _______________
Target:          _______________
Status:          [ ] Success  [ ] Rolled back
Notes:           _____________________________________
```

# Deploying to Kubernetes (k3s, on-prem)

A single-node **k3s** cluster on your own hardware — the same manifests would
apply to a "real" managed cluster with only the storage class and Ingress
controller specifics changing. Manifests live in [`k8s/`](../k8s/), numbered
in apply order.

## Architecture

```
                          ┌─────────────────────────────┐
  Internet / LAN ───────▶ │   Ingress (Traefik, in k3s)  │
                          │   host: chat.example.local   │
                          └───────────┬──────────────────┘
                       /auth /api /websocket      /
                                  │               │
                          ┌───────▼──────┐  ┌─────▼──────┐
                          │   backend    │  │  frontend  │
                          │  (Spring     │  │  (nginx +  │
                          │   Boot)      │  │  React     │
                          │  Service     │  │  build)    │
                          │  :5454       │  │  Service   │
                          └───────┬──────┘  │  :80       │
                                  │         └────────────┘
                          ┌───────▼──────┐
                          │    mysql     │
                          │  Service     │
                          │  :3306       │
                          │  + PVC       │
                          └──────────────┘
```

One Ingress hostname routes to both services by path, so the browser talks to
a single origin — no CORS preflight, and only one value (`FRONTEND_ORIGIN`) to
keep in sync.

## Prerequisites on the box

- A Linux distro you're comfortable administering (Ubuntu Server / Debian are
  the least-friction choices for k3s)
- Docker (for *building* images — k3s itself uses containerd, not Docker, to
  *run* them)
- `kubectl` (k3s bundles its own, or install separately and point
  `KUBECONFIG` at `/etc/rancher/k3s/k3s.yaml`)

## 1. Install k3s

```bash
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes   # confirm the node is Ready
```

This single command gives you: the API server, containerd, Traefik (ingress
controller), CoreDNS, and the `local-path` storage provisioner — everything
the manifests in this repo assume. To use plain `kubectl` instead of
`k3s kubectl`:
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

## 2. Build & push images

k3s's containerd can't see images built by your local Docker daemon directly —
push them to a registry instead. **GitHub Container Registry (GHCR)** is free
and reuses the GitHub account this repo already lives on:

```bash
echo "<a GitHub PAT with write:packages>" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

docker build -t ghcr.io/YOUR_GITHUB_USERNAME/chat-app-backend:latest ./Backend
docker push ghcr.io/YOUR_GITHUB_USERNAME/chat-app-backend:latest

# NOTE the --build-arg: REACT_APP_API_BASE_URL is baked in at build time and
# must match the Ingress hostname you'll set in step 4.
docker build \
  --build-arg REACT_APP_API_BASE_URL=https://chat.example.local \
  -t ghcr.io/YOUR_GITHUB_USERNAME/chat-app-frontend:latest \
  ./FrontEnd/client
docker push ghcr.io/YOUR_GITHUB_USERNAME/chat-app-frontend:latest
```

By default GHCR packages are private — either make them public, or create an
`imagePullSecret` and reference it from the Deployments:
```bash
kubectl create secret docker-registry ghcr-pull \
  --namespace chat-app \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=<the same PAT>
```
then add `imagePullSecrets: [{name: ghcr-pull}]` under each Deployment's `spec.template.spec`.

> **No registry / offline alternative:** build locally and import directly
> into k3s's containerd, skipping a registry entirely:
> ```bash
> docker build -t chat-app-backend:latest ./Backend
> docker save chat-app-backend:latest | sudo k3s ctr images import -
> ```
> Then reference the image as `chat-app-backend:latest` with
> `imagePullPolicy: Never`. Fine for a single-node learning box; a registry is
> the more realistic workflow if you plan to add CI later.

## 3. Create the namespace and secret

```bash
kubectl apply -f k8s/00-namespace.yaml

kubectl create secret generic chat-app-secrets \
  --namespace chat-app \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -base64 32)" \
  --from-literal=MYSQL_ROOT_PASSWORD="<pick-a-real-password>"
```

(See [`k8s/01-secret.example.yaml`](../k8s/01-secret.example.yaml) if you'd
rather apply a YAML file instead of the imperative command above.)

## 4. Fill in the placeholders

Before applying, replace in the manifests:
- `ghcr.io/YOUR_GITHUB_USERNAME/...` (03-backend.yaml, 04-frontend.yaml) → the
  images you pushed in step 2
- `chat.example.local` (02-mysql.yaml's `FRONTEND_ORIGIN`, 04-frontend.yaml's
  build-arg note, 05-ingress.yaml) → your real hostname

## 5. Apply everything

```bash
kubectl apply -f k8s/02-mysql.yaml
kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml

kubectl get pods -n chat-app -w   # wait for everything to be Running/Ready
```

## 6. Point a hostname at the cluster

`chat.example.local` needs to resolve somewhere. Options, roughly easiest first:

- **LAN-only testing:** add a line to `/etc/hosts` (or Windows'
  `C:\Windows\System32\drivers\etc\hosts`) on each client machine:
  `<laptop-LAN-IP>  chat.example.local`
- **Real domain you own:** point an A record at the laptop's public IP (needs
  port 80/443 forwarded from your router), or use a CNAME if you're fronting
  with a tunnel (next option)
- **No port forwarding / behind CGNAT:**
  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  or [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) — both give you
  a public HTTPS hostname without opening any router ports, and Cloudflare
  Tunnel additionally terminates TLS for you (see below).

## 7. TLS — required, not optional

**Why:** the Signal-protocol encryption in this app (see
[docs/ENCRYPTION.md](ENCRYPTION.md)) runs in the browser via the Web Crypto
API, which browsers only expose in a secure context. Serve this over plain
`http://` on a real hostname and key generation silently fails.

Pick one:

**A. cert-manager + Let's Encrypt** (the "real" way, good to learn regardless of this project):
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```
Then create a `ClusterIssuer` (HTTP01 challenge needs port 80 reachable from
the internet; DNS01 needs your DNS provider's API credentials — see
[cert-manager's docs](https://cert-manager.io/docs/configuration/acme/)) and
uncomment the `cert-manager.io/cluster-issuer` annotation in
`k8s/05-ingress.yaml`.

**B. Cloudflare Tunnel** — if you route through it (step 6), Cloudflare
terminates TLS at their edge and forwards plain HTTP to your Ingress over the
tunnel. Simplest option if you don't own a domain with API-accessible DNS.

**C. Self-signed / mkcert** — fastest way to get the whole pipeline working
end-to-end while you sort out A or B:
```bash
mkcert chat.example.local
kubectl create secret tls chat-app-tls --namespace chat-app \
  --cert=chat.example.local.pem --key=chat.example.local-key.pem
```
`mkcert -install` adds its CA to your local machine's trust store, so browsers
on that machine won't warn; other devices would need the CA installed too, or
will see a warning (fine for solo testing, not for sharing the link).

## Verifying it actually works

Same checks as the Docker Compose setup, just via `kubectl exec` instead of
`docker exec`:

```bash
# Tail backend logs
kubectl logs -n chat-app deploy/backend -f

# Confirm the DB stores ciphertext, not plaintext, for an encrypted DM
kubectl exec -n chat-app deploy/mysql -- \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" whatsapp \
  -e "SELECT content FROM message ORDER BY id DESC LIMIT 3;"
```

Full functional checklist: sign up two users (in separate browser
profiles — keys are per-browser), start a direct chat, send a message, confirm
it's ciphertext in the query above, reload and confirm history still decrypts.

## Common issues

| Symptom | Likely cause |
|---|---|
| `ImagePullBackOff` | Image name/tag wrong, or GHCR package is private without an `imagePullSecret` |
| Backend `CrashLoopBackOff` | Check `kubectl logs` — usually a missing/wrong Secret key, or MySQL not ready yet (the backend's Hikari pool retries, but give it a minute after first apply) |
| 404 from the Ingress | Hostname in the request doesn't match `spec.rules[].host` in `05-ingress.yaml` — check `/etc/hosts` or DNS |
| Encryption silently fails | Not actually being served over HTTPS — check the address bar, not just that a `tls:` block exists in the Ingress |
| `PersistentVolumeClaim` stuck `Pending` | k3s's `local-path` provisioner only binds a PVC once something tries to *use* it — this resolves itself once the MySQL pod schedules; if it doesn't, `kubectl get storageclass` to confirm `local-path` exists and is default |

## Where to go from here

This is deliberately raw manifests + `kubectl apply`, no Helm/Kustomize/GitOps
yet. Natural next steps, roughly in order of payoff:
- **Kustomize** — parameterize the hostname/image tags instead of hand-editing placeholders
- **Helm chart** — package this whole set of manifests with configurable `values.yaml`
- **A CI pipeline** (GitHub Actions) that builds + pushes images on every push to `main`
- **ArgoCD or Flux** (GitOps) — the cluster continuously reconciles to match this repo
- **Observability** — `kube-prometheus-stack` (Prometheus + Grafana) via Helm
- **A second node** — turns this into genuine multi-node cluster practice (scheduling, node affinity, real `Deployment` replica behavior across hosts)

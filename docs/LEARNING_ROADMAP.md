# On-Prem Deployment: Learning Roadmap

A staged path from "Docker Compose on Windows" (where this project is today)
to "this app running on a Linux box you administer, on a k3s cluster you set
up yourself." Split into **prep now** (no physical hardware needed) and
**execute later** (once you're at the machine), since that's the actual
situation right now.

Each stage names what you're learning, not just what to type — the goal is
understanding, not just a working deployment.

---

## Stage 0 — Prep now (no hardware needed) ✅ done in this pass

- [x] Made the backend's CORS + WebSocket allowed origin configurable
      (`FRONTEND_ORIGIN` env var) instead of hardcoded to `localhost:3000` —
      necessary once the frontend is served from a real hostname
- [x] Wrote [`k8s/`](../k8s/) manifests: namespace, secret template, MySQL
      (PVC + Deployment + Service), backend, frontend, Ingress
- [x] Wrote [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md) — the concrete runbook for
      applying all of the above

**What this teaches:** reading and writing raw Kubernetes manifests without a
cluster to test against yet — Deployments, Services, ConfigMaps, Secrets,
PVCs, Ingress path routing. This is a real skill: understanding *what* a
manifest declares is separate from *watching it run*, and being able to do the
former confidently makes the latter much faster once you do have a cluster.

## Stage 1 — Linux box setup (needs hardware)

- [ ] Install a server-oriented distro (Ubuntu Server or Debian — both are
      low-friction for k3s and have the biggest community for troubleshooting)
- [ ] Basic hardening: create a non-root sudo user, disable root SSH login,
      set up SSH key auth, enable a firewall (`ufw`)
- [ ] Set a static local IP (or a DHCP reservation on your router) so the
      machine's address doesn't change under you
- [ ] Install Docker — you'll need it to *build* images even though k3s runs
      them via containerd, not dockerd

**What this teaches:** basic Linux server administration — the stuff every
self-hosted project needs regardless of what's actually running on top.

## Stage 2 — Docker on Linux (needs hardware)

- [ ] `git clone` this repo onto the box
- [ ] Run the existing `docker-compose.yml` setup there exactly as documented
      in [QUICK_START.md](../QUICK_START.md) — confirm the app works before
      adding Kubernetes into the mix
- [ ] Compare: does anything behave differently on Linux vs. your Windows/Docker
      Desktop dev environment? (File permissions and line endings are the
      classic gotchas — you likely won't hit them here since it's all
      containerized, but worth knowing to check)

**What this teaches:** confirming your mental model of "the containers are the
same everywhere" is actually true, before you add a second orchestration layer
on top and have two things to debug instead of one.

## Stage 3 — k3s fundamentals (needs hardware)

- [ ] Install k3s (one command — see [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md#1-install-k3s))
- [ ] Before touching this app's manifests: deploy something trivial
      (`kubectl create deployment nginx --image=nginx`, expose it, curl it)
      just to confirm the cluster itself works
- [ ] Read through `kubectl get nodes -o wide`, `kubectl get pods -A`,
      `kubectl describe node` — get a feel for what k3s installed for you
      (Traefik, CoreDNS, local-path-provisioner) before you depend on any of it

**What this teaches:** the core Kubernetes objects and control loop —
declaring desired state, watching the cluster reconcile toward it,
`kubectl describe`/`logs` as your primary debugging tools.

## Stage 4 — Deploy this app (needs hardware)

- [ ] Push images to a registry ([K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md#2-build--push-images))
- [ ] Apply the manifests in order, verify with `kubectl get pods -n chat-app -w`
- [ ] Get a hostname resolving and TLS working
      ([K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md#7-tls--required-not-optional)) —
      start with self-signed/mkcert to get the whole pipeline working, then
      upgrade to a real cert
- [ ] Full functional pass: two users, encrypted DM, confirm ciphertext in the
      DB, reload and confirm history

**What this teaches:** the parts that only show up with a *real* app instead
of a toy nginx deployment — multi-service Ingress routing, a stateful
component (MySQL + PVC), Secrets actually mattering, and the HTTPS requirement
being non-negotiable rather than theoretical.

## Stage 5 — Make it resilient (stretch)

- [ ] Resource requests/limits are already set conservatively in the manifests
      — tune them against your actual hardware (`kubectl top pods` needs
      metrics-server, which k3s can install with a flag)
- [ ] Add a `PodDisruptionBudget` / readiness gate understanding: kill the
      backend pod (`kubectl delete pod`) and watch it reschedule — confirm the
      app recovers with zero manual steps
- [ ] Set up `kubectl` log rotation awareness / try `k9s` (a popular terminal
      UI for kubectl) for faster day-to-day operation

**What this teaches:** the difference between "it's deployed" and "it
recovers from failure on its own," which is the actual point of running an
orchestrator instead of just `docker run`.

## Stage 6 — Beyond raw manifests (stretch)

Pick based on interest — these are somewhat independent branches, not a strict order:

- [ ] **Kustomize** — parameterize the placeholders (hostname, image tags)
      instead of hand-editing YAML
- [ ] **Helm** — package this as a chart with a `values.yaml`
- [ ] **CI/CD** — a GitHub Actions workflow that builds + pushes images on
      push to `main` (closes the loop: commit → image → (manually or via
      GitOps) running on the cluster)
- [ ] **GitOps** — ArgoCD or Flux watching this repo, auto-applying manifest
      changes instead of you running `kubectl apply` by hand
- [ ] **Observability** — `kube-prometheus-stack` via Helm, then build a
      Grafana dashboard for this app specifically (request latency, pod
      restarts, MySQL connections)
- [ ] **Multi-node** — add a second machine (even a Raspberry Pi or an old PC)
      and join it to the cluster; watch how the scheduler places pods across
      nodes, and what changes about storage (local-path PVCs are
      node-local — this is where you'd hit that limitation and need to reason
      about it)

---

## Quick reference: what's already built vs. what needs the box

| Already done (this repo) | Needs physical hardware |
|---|---|
| `docker-compose.yml`, Dockerfiles | Installing Linux, Docker, k3s |
| `k8s/*.yaml` manifests | `kubectl apply`-ing them for real |
| `docs/K8S_DEPLOYMENT.md` runbook | Following it end-to-end |
| CORS/WebSocket origin now configurable | Setting it to your real hostname |
| — | Registry push, DNS/hosts setup, TLS cert |

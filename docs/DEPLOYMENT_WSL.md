# Windows/WSL Deployment Guide

This guide documents how to deploy the Systems Playground onto a Windows/WSL hosting environment, leveraging automated startup scripts, Cloudflare Tunnels, and Watchtower for CI/CD.

## Architecture: `infra` vs `apps`
A robust local host environment separates core infrastructure from application workloads. This is the **deployed** layout on the WSL/NUC host — it's flattened out of the repo by CI, and does not mirror the in-repo folder structure exactly (see the note below the diagram).

```text
~ (Home Directory)
├── infra/                      # Core System Services (deployed from self-host/infra/)
│   ├── wsl-startup.sh          # Boots infra & initializes Cloudflare Tunnel
│   ├── wsl-shutdown.sh         # Gracefully stops infra
│   ├── .env                    # Environment variables (Discord webhooks, paths)
│   ├── uptime-kuma/
│   │   └── docker-compose.yml
│   ├── watchtower/
│   │   └── docker-compose.yml
│   ├── filebrowser/
│   │   └── docker-compose.yml
│   └── n8n/
│       └── docker-compose.yml
│
└── apps/                       # Application Workloads
    ├── systems-playground/     # <-- Git clone this repository here
    │   └── self-host/apps/portfolio/
    │       ├── docker-compose.yml           # Base definitions (Redis, RabbitMQ, Redpanda, ports)
    │       ├── docker-compose.override.yml  # Loaded automatically for local dev
    │       └── docker-compose.prod.yml       # Production image tags & Watchtower labels
    │
    └── another-app/            # e.g., n8n, ghost, etc.
```

*   **`~/infra`**: Houses system-wide services like Cloudflare (`cloudflared`, installed directly on the host — not containerized), Monitoring (`uptime-kuma`), and CI/CD (`watchtower`), plus shared storage (`filebrowser`) and automation (`n8n`). This folder runs its own startup/shutdown scripts to initialize the core layer.
*   **`~/apps`**: Houses the actual applications (like `systems-playground`, `n8n`, etc.). These come online *after* the infrastructure layer.

**In-repo source of these files:** the `~/infra/wsl-startup.sh` and `~/infra/wsl-shutdown.sh` scripts live in this repo at `self-host/infra/scripts/`, and are copied flat into `~/infra/` by the `Deploy Infra - Startup/Shutdown Scripts` GitHub Actions workflow (`.github/workflows/deploy-infra-scripts.yml`) whenever that folder changes. Similarly, the compose files for `~/apps/systems-playground/self-host/apps/portfolio/` are copied out to a flat `$APP_DIR` (default `/home/user/apps/systems-playground`, overridable via the `APP_DIR` repo variable) by `.github/workflows/deploy-app-portfolio.yml`. There is no `/wsl-reference-setup` directory in this repo — `self-host/infra/` and `self-host/apps/` **are** the reference source.

---

## 1. Cloudflare Tunnel Setup

To expose your local WSL services securely without opening router ports, we use Cloudflare Tunnels (`cloudflared`).

1. **Install cloudflared:** Download and install the daemon inside your WSL environment following the [official Cloudflare documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/).
2. **Authenticate:** Run `cloudflared tunnel login`.
3. **Create a Tunnel:** Run `cloudflared tunnel create <your-tunnel-name>`. This generates a JSON credentials file.
4. **Configure Routing:** Create a `config.yml` in `~/.cloudflared/` to bind your domains.

### How to Bind Domains in `config.yml`
Here is an example configuration showing how to route public domains to the internal local ports. By default, the portfolio project (`self-host/apps/portfolio/docker-compose.yml`) uses:
*   **Frontend:** Container port `3000`, host port `8086`
*   **Backend API:** Container port `8080`, host port `8085`

```yaml
tunnel: <your-tunnel-id>
credentials-file: /home/user/.cloudflared/<your-tunnel-id>.json

ingress:
  # Example: Expose the Systems Playground Frontend
  - hostname: portal.yourdomain.com
    service: http://localhost:8086
    
  # Example: Expose the Systems Playground API
  - hostname: api.yourdomain.com
    service: http://localhost:8085
    
  # Catch-all for unmatched traffic
  - service: http_status:404
```

**Action Required in `self-host/apps/portfolio/docker-compose.yml`:**
If you want the frontend accessible at `portal.yourdomain.com` via port 8081, ensure the frontend mapping in `docker-compose.yml` (or `docker-compose.prod.yml`) is set to `"8081:3000"`.

```yaml
  frontend:
    ports:
      - "8081:3000" # Map host port 8081 to container port 3000
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 2. Automating Boot with Windows Task Scheduler

To make this truly act like a server, the WSL scripts need to trigger automatically when your Windows machine boots up or shuts down.

Only the **infra** layer ships a startup/shutdown script pair in this repo (`self-host/infra/scripts/wsl-startup.sh` / `wsl-shutdown.sh`, deployed to `~/infra/`). It starts Docker, brings up every service under `~/infra/*/docker-compose.yml`, and connects the Cloudflare Tunnel.

### Startup Automation
1. Open **Task Scheduler** in Windows.
2. Click **Create Basic Task...**
3. **Name:** `WSL Startup`
4. **Trigger:** `When the computer starts` (or `When I log on` depending on your setup).
5. **Action:** `Start a program`
6. **Program/script:** `wsl.exe`
7. **Add arguments:** `-d Ubuntu -u root -e bash /home/user/infra/wsl-startup.sh`
   *(Adjust path to where you store your startup scripts).*
8. **Check:** "Run with highest privileges" in the task properties.

### Shutdown Automation
Repeat the steps above to create a **WSL Shutdown** task.
*   **Trigger:** `On an event` -> Log: `System`, Source: `User32`, Event ID: `1074` (System Shutdown/Restart).
*   **Arguments:** `-d Ubuntu -u root -e bash /home/user/infra/wsl-shutdown.sh`
This ensures Docker containers terminate gracefully before Windows forces them closed.

**Reboot recovery:** every service in `self-host/apps/portfolio/docker-compose.yml` (backend, frontend, redis, rabbitmq, redpanda) is set to `restart: unless-stopped`. This means Docker itself brings a container back up when the daemon restarts (e.g. after `wsl-startup.sh` runs `sudo service docker start`) — no explicit boot script is needed for the apps layer, unlike infra. It also plays correctly with scale-to-zero: `unless-stopped` respects an explicit `docker stop` (i.e. one issued by the Go control plane's reaper), so a container the reaper intentionally stopped for inactivity stays stopped across a reboot rather than snapping back on.

---

## 3. Deploying Updates (Zero-Downtime CI/CD)

To ensure the portfolio is always up to date with the latest GitHub code, we use a **GitHub Actions Self-Hosted Runner** installed inside the WSL environment. The runner triggers within seconds of a relevant push or build finishing on GitHub — it does not `git pull` the working tree; instead each deploy workflow checks out the repo fresh and copies only the files it needs (compose files, scripts) to a flat directory on the host, then writes `.env` files from GitHub Secrets/Variables before restarting containers.

The workflows involved, all under `.github/workflows/`:

*   **`build-app-portfolio-backend.yml`** / **`build-app-portfolio-frontend.yml`** — build and push Docker images to Docker Hub whenever `self-host/apps/portfolio/backend/**` or `self-host/apps/portfolio/frontend/**` changes.
*   **`deploy-app-portfolio.yml`** ("Instant Deploy (Self-Hosted)") — runs on the self-hosted runner after either build workflow completes, or when `self-host/apps/portfolio/docker-compose*.yml` changes. It copies `docker-compose.yml` and `docker-compose.prod.yml` (renamed to `docker-compose.override.yml`) into `$APP_DIR`, writes `.env` files from secrets, then runs `docker compose pull && docker compose up -d`.
*   **`deploy-infra-scripts.yml`**, **`deploy-infra-uptime-kuma.yml`**, **`deploy-infra-watchtower.yml`**, **`deploy-infra-filebrowser.yml`**, **`deploy-infra-n8n.yml`** — each copies its corresponding `self-host/infra/<service>/` files to the host and restarts that one service when it changes.

Setup steps:

1. Go to your GitHub Repository -> **Settings** -> **Actions** -> **Runners**.
2. Click **New self-hosted runner** and select Linux/x64.
3. SSH into your host, run the provided commands to download and configure the runner service inside your WSL Ubuntu environment.
   
   ⚠️ **IMPORTANT: HOW TO PREVENT THE RUNNER FROM DYING ON REBOOT** ⚠️
   When you install the GitHub Actions runner on your WSL/Linux host, DO NOT just run `./run.sh`. If your host restarts, the runner will die.
   To ensure the runner automatically starts every time the host boots:
   * CD into your actions-runner directory: `cd ~/actions-runner`
   * Install the background service: `sudo ./svc.sh install`
   * Start the background service: `sudo ./svc.sh start`

4. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**, and create a repository variable called `APP_DIR` — the absolute path on the host where the portfolio's compose files and `.env` files should be written (e.g., `/home/user/apps/systems-playground`). This is a deploy target, not necessarily where the repo is git-cloned. Similarly, `deploy-infra-scripts.yml` uses `INFRA_BASE_DIR` (default `/home/yizhe/infra`).

**ℹ️ Edge Case: What if the NUC is turned off during a push?**
*   **< 24 Hours Offline:** If you push code while the NUC is off, the deployment job will sit in a "Queued" state on GitHub. The moment the NUC boots up (and the WSL runner service starts), it will instantly connect to GitHub, catch up, and execute the queued deployment.
*   **> 24 Hours Offline:** GitHub Actions cancels queued jobs after 24 hours. If your NUC is off for a week, you will need to manually trigger the deployment. Go to your repository's **Actions** tab -> **Instant Deploy (Self-Hosted)** -> click **Run workflow** to force the NUC to sync the latest code and images.
# Windows/WSL Deployment Guide

This guide documents how to deploy the Systems Playground onto a Windows/WSL hosting environment, leveraging automated startup scripts, Cloudflare Tunnels, and Watchtower for CI/CD.

## Architecture: `infra` vs `apps`
A robust local host environment separates core infrastructure from application workloads. Here is the recommended directory structure on your Windows/WSL host:

```text
~ (Home Directory)
├── infra/                      # Core System Services
│   ├── wsl-startup.sh          # Boots infra & initializes Cloudflare Tunnel
│   ├── wsl-shutdown.sh         # Gracefully stops infra
│   ├── .env                    # Environment variables (Discord webhooks, paths)
│   └── uptime-kuma
│       ├── docker-compose.yml  # Runs Uptime Kuma, Watchtower, etc.
│       └── .env
│
└── apps/                       # Application Workloads
    ├── wsl-startup.sh          # Loops through all apps and boots them
    ├── wsl-shutdown.sh         # Gracefully stops all apps
    ├── .env                    # Defines the APPS_LIST array, backups, etc.
    ├── wsl-backup.sh           # Safe automated backup script for named volumes
    │
    ├── systems-playground/     # <-- Git clone this repository here
    │   ├── docker-compose.yml       # Base definitions (Redis, RabbitMQ, Ports)
    │   ├── docker-compose.prod.yml  # Production image tags & Watchtower labels
    │   └── ...
    │
    └── another-app/            # e.g., n8n, ghost, etc.
```

*   **`~/infra`**: Houses system-wide services like Cloudflare (`cloudflared`), Monitoring (`uptime-kuma`), and CI/CD (`watchtower`). This folder runs its own startup/shutdown scripts to initialize the core layer.
*   **`~/apps`**: Houses the actual applications (like `systems-playground`, `n8n`, etc.). These have a separate set of startup scripts that run *after* the infrastructure layer is online.

*(For reference files on how the `infra` and `apps` layers are set up, see the `/wsl-reference-setup` directory in this repository).*

---

## 1. Cloudflare Tunnel Setup

To expose your local WSL services securely without opening router ports, we use Cloudflare Tunnels (`cloudflared`).

1. **Install cloudflared:** Download and install the daemon inside your WSL environment following the [official Cloudflare documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/).
2. **Authenticate:** Run `cloudflared tunnel login`.
3. **Create a Tunnel:** Run `cloudflared tunnel create <your-tunnel-name>`. This generates a JSON credentials file.
4. **Configure Routing:** Create a `config.yml` in `~/.cloudflared/` to bind your domains.

### How to Bind Domains in `config.yml`
Here is an example configuration showing how to route public domains to the internal local ports. By default, the Systems Playground uses:
*   **Frontend:** Port `3000` (mapped to `8081` on host)
*   **Backend API:** Port `8080`

```yaml
tunnel: <your-tunnel-id>
credentials-file: /home/user/.cloudflared/<your-tunnel-id>.json

ingress:
  # Example: Expose the Systems Playground Frontend
  - hostname: portal.yourdomain.com
    service: http://localhost:8081
    
  # Example: Expose the Systems Playground API
  - hostname: api.yourdomain.com
    service: http://localhost:8080
    
  # Catch-all for unmatched traffic
  - service: http_status:404
```

**Action Required in `docker-compose.yml`:**
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

### Startup Automation
1. Open **Task Scheduler** in Windows.
2. Click **Create Basic Task...**
3. **Name:** `WSL Startup`
4. **Trigger:** `When the computer starts` (or `When I log on` depending on your setup).
5. **Action:** `Start a program`
6. **Program/script:** `wsl.exe`
7. **Add arguments:** `-d Ubuntu -u root -e bash /home/user/apps/wsl-startup.sh`
   *(Adjust path to where you store your startup scripts).*
8. **Check:** "Run with highest privileges" in the task properties.

### Shutdown Automation
Repeat the steps above to create a **WSL Shutdown** task.
*   **Trigger:** `On an event` -> Log: `System`, Source: `User32`, Event ID: `1074` (System Shutdown/Restart).
*   **Arguments:** `-d Ubuntu -u root -e bash /home/user/apps/wsl-shutdown.sh`
This ensures Docker containers terminate gracefully before Windows forces them closed.

---

## 3. Deploying Updates (Zero-Downtime CI/CD)

To ensure the portfolio is always up to date with the latest GitHub code, we use a **GitHub Actions Self-Hosted Runner** installed inside the WSL environment.

This runner instantly triggers a `git pull` and a `docker compose up` the *exact second* a build finishes on GitHub, ensuring both your code and your infrastructure definitions (`docker-compose.yml`) are synced immediately.

1. Go to your GitHub Repository -> **Settings** -> **Actions** -> **Runners**.
2. Click **New self-hosted runner** and select Linux/x64.
3. SSH into your host, run the provided commands to download and configure the runner service inside your WSL Ubuntu environment.
   
   ⚠️ **IMPORTANT: HOW TO PREVENT THE RUNNER FROM DYING ON REBOOT** ⚠️
   When you install the GitHub Actions runner on your WSL/Linux host, DO NOT just run `./run.sh`. If your host restarts, the runner will die.
   To ensure the runner automatically starts every time the host boots:
   * CD into your actions-runner directory: `cd ~/actions-runner`
   * Install the background service: `sudo ./svc.sh install`
   * Start the background service: `sudo ./svc.sh start`

4. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**, and create a new repository variable called `APP_DIR` with the absolute path to your cloned repository on the host (e.g., `/home/user/apps/systems-playground`).
5. A workflow file `.github/workflows/deploy-self-hosted.yml` is included in this repository. It automatically listens for your Frontend or Backend build pipelines to finish on GitHub, then instantly pings your local runner to gracefully pull the latest `.yml` files and restart the updated containers.

**ℹ️ Edge Case: What if the NUC is turned off during a push?**
*   **< 24 Hours Offline:** If you push code while the NUC is off, the deployment job will sit in a "Queued" state on GitHub. The moment the NUC boots up (and the WSL runner service starts), it will instantly connect to GitHub, catch up, and execute the queued deployment.
*   **> 24 Hours Offline:** GitHub Actions cancels queued jobs after 24 hours. If your NUC is off for a week, you will need to manually trigger the deployment. Go to your repository's **Actions** tab -> **Instant Deploy (Self-Hosted)** -> click **Run workflow** to force the NUC to sync the latest code and images.
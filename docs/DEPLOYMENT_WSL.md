# Windows/WSL Deployment Guide

This guide documents how to deploy the Systems Playground onto a Windows/WSL hosting environment, leveraging automated startup scripts, Cloudflare Tunnels, and Windows Task Scheduler.

## 1. Cloudflare Tunnel Setup

To expose your local WSL services securely without opening router ports, we use Cloudflare Tunnels (`cloudflared`).

1. **Install cloudflared:** Download and install the daemon inside your WSL environment following the [official Cloudflare documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/).
2. **Authenticate:** Run `cloudflared tunnel login`.
3. **Create a Tunnel:** Run `cloudflared tunnel create <your-tunnel-name>`. This generates a JSON credentials file.
4. **Configure Routing:** Use the provided `infra/cloudflared/config.yml` template. Place it in `~/.cloudflared/config.yml` and replace placeholders with your actual Tunnel ID and domains.

### Port Configuration
By default, the Systems Playground uses:
*   **Frontend:** Port `3000`
*   **Backend API:** Port `8080`

In `config.yml`, you will map domains to local ports:
*   `portal.yourdomain.com` -> `http://localhost:8081`
*   `api.yourdomain.com` -> `http://localhost:8080`

**Action Required in `docker-compose.yml`:**
If you want the frontend accessible at `portal.yourdomain.com` via port 8081, change the frontend mapping in `docker-compose.yml` from `3000:3000` to `8081:3000`.

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
7. **Add arguments:** `-d Ubuntu -u root -e bash /home/user/infra/scripts/wsl-startup.sh`
   *(Replace `Ubuntu` with your WSL distro name and adjust the script path).*
8. **Check:** "Run with highest privileges" in the task properties.

### Shutdown Automation
Repeat the steps above to create a **WSL Shutdown** task.
*   **Trigger:** `On an event` -> Log: `System`, Source: `User32`, Event ID: `1074` (System Shutdown/Restart).
*   **Arguments:** `-d Ubuntu -u root -e bash /home/user/infra/scripts/wsl-shutdown.sh`
This ensures Docker containers terminate gracefully before Windows forces them closed.

---

## 3. Deploying Updates (CI/CD Options)

Depending on your workflow, you have two options for keeping the portfolio updated with zero downtime.

### Option A: The Local Build Method (No Registry)
If you prefer not to upload your images to Docker Hub or GHCR, you can build them directly on your WSL host. 

A dedicated script is provided at `infra/scripts/deploy-playground.sh`. 
Whenever you push a new feature to GitHub, SSH into your host and run:
```bash
./infra/scripts/deploy-playground.sh
```
*Why this works:* It runs `docker compose build` *in the background* while the old containers serve live traffic. Then `docker compose up -d` instantly swaps them with zero downtime.

### Option B: The Registry Method (Watchtower Compatible)
If you want to push pre-built images to a registry (like Docker Hub) via GitHub Actions, you can fully automate deployments using **Watchtower**.

1. Rename `docker-compose.prod.yml` to `docker-compose.yml`.
2. Update the `image:` tags to point to your actual Docker Hub repository (e.g., `image: yourusername/systems-playground-backend:latest`).
3. Make sure Watchtower is running on your WSL host:
```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup --interval 300
```
Watchtower will automatically detect when you push a new image to Docker Hub, pull it down, and gracefully restart the containers—achieving true hands-off CI/CD.

### Option C: GitHub Actions Self-Hosted Runner (The "Bitbucket Pipeline" Way)
If you want true push-to-deploy without needing a Docker Hub registry or manual SSH access, GitHub offers **Self-Hosted Runners** (exactly like Bitbucket Pipelines).

1. Go to your GitHub Repository -> **Settings** -> **Actions** -> **Runners**.
2. Click **New self-hosted runner** and select Linux/x64.
3. SSH into your NUC, run the provided commands to download and configure the runner service (install it as a background service using `sudo ./svc.sh install`).
4. A workflow file `.github/workflows/deploy-nuc.yml` is already included in this repository. Whenever you push to `main`, GitHub will send a signal directly to your NUC.
5. The runner on your NUC will instantly execute the `deploy-playground.sh` script we wrote in Option A, giving you 100% automated, zero-downtime local builds.
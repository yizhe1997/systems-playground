#!/bin/bash
# Fresh-host bootstrap for systems-playground. Written for "a fresh Ubuntu-like host" —
# not WSL-specific, and (as of the Docker Desktop -> native Docker Engine migration, see
# docs/DEPLOYMENT.md and ADR 003) there's no WSL-specific branch left at all: WSL2 runs
# a real Linux kernel, so every step here, including Docker, installs and runs the same way
# on WSL2 as on a native host. Windows-side setup (enabling WSL2, Task Scheduler) is a
# manual checklist in docs/DEPLOYMENT.md, not this script's job.
#
# Safe to re-run: every step checks current state before acting. Steps that need a human
# (cloudflared tunnel login, tunnel create, GitHub runner token) print instructions and
# exit 0 — run this script again after completing them to pick up where it left off.
#
# Supports two entry points: `make bootstrap` from an existing clone, or downloading and
# running this one file standalone (see docs/DEPLOYMENT.md section 0 for the one-liner)
# — the script clones the repo itself if it isn't already present, so no pre-clone is
# required either way.
#
# Everything is wrapped in main(), called only on the last line. This is a deliberate
# `curl | bash` safety measure: bash must see this whole function's closing brace before
# it can run any of it, so a connection dropped mid-download hits a syntax error instead
# of executing a truncated, arbitrary subset of these commands.
set -euo pipefail

log() { printf '[*] %s\n' "$1"; }
ok()  { printf '[\xE2\x9C\x94] %s\n' "$1"; }
warn(){ printf '[!] %s\n' "$1"; }

pause() {
  printf '\n[\xE2\x86\x92] %s\n\n' "$1"
  exit 0
}

main() {
# --- Config (override via env vars) ---------------------------------------------------
# REPO_DIR only defaults to an existing clone's root when this script is genuinely being
# run as a file from inside one (`make bootstrap` / `bash scripts/bootstrap.sh`) — checked
# via `[ -f "${BASH_SOURCE[0]}" ]`, which is false when piped in via `curl | bash` (there's
# no real file, so BASH_SOURCE[0] isn't a meaningful path). In that standalone case, always
# default to $HOME/systems-playground and let step 4 clone into it fresh, rather than
# resolving some incidental, unrelated directory relative to the current shell's cwd.
DEFAULT_REPO_DIR="$HOME/systems-playground"
if [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel >/dev/null 2>&1; then
    DEFAULT_REPO_DIR="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel)"
  fi
fi

REPO_URL="${REPO_URL:-https://github.com/yizhe1997/systems-playground.git}"
REPO_DIR="${REPO_DIR:-$DEFAULT_REPO_DIR}"
INFRA_BASE_DIR="${INFRA_BASE_DIR:-$HOME/infra}"
APP_BASE_DIR="${APP_BASE_DIR:-$HOME/apps}"
TUNNEL_NAME="${TUNNEL_NAME:-tunnel}"
RUNNER_DIR="${RUNNER_DIR:-$HOME/actions-runner}"

log "REPO_DIR=$REPO_DIR"
log "INFRA_BASE_DIR=$INFRA_BASE_DIR"
log "APP_BASE_DIR=$APP_BASE_DIR"
log "TUNNEL_NAME=$TUNNEL_NAME"
log "RUNNER_DIR=$RUNNER_DIR"
echo

# --- 1. Base packages -------------------------------------------------------------------
# gnupg is needed for the Docker/cloudflared repo-key steps below (step 2/3) — included here
# rather than assumed present, since a genuinely minimal host might not have it.
NEED_APT_UPDATE=false
for pkg in git curl ca-certificates gnupg; do
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    NEED_APT_UPDATE=true
  fi
done
if [ "$NEED_APT_UPDATE" = true ]; then
  log "Installing base packages (git, curl, ca-certificates, gnupg)..."
  sudo apt-get update -y
  sudo apt-get install -y git curl ca-certificates gnupg
  ok "Base packages installed."
else
  ok "Base packages already present."
fi

# --- 2. Docker (conditional: only install if it isn't already working) ------------------
# No WSL-specific branch here — WSL2 runs a real Linux kernel, so Docker Engine installs and
# runs the same way it does on a native host. See docs/DEPLOYMENT.md's Docker section and
# ADR 003 for why this used to special-case WSL (pointing at Docker Desktop instead) and what
# changed. One gotcha if this host previously had Docker Desktop's WSL integration enabled:
# disabling that integration leaves dangling CLI-plugin symlinks (docker compose, buildx, etc.)
# under /usr/local/lib/docker/cli-plugins/ that need clearing out — same doc covers the fix.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ok "Docker already working ($(docker --version))."
else
  log "Installing Docker Engine..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  ok "Docker Engine installed. Log out/in (or run 'newgrp docker') for group membership to take effect."
fi

# --- 3. cloudflared ----------------------------------------------------------------------
if command -v cloudflared >/dev/null 2>&1; then
  ok "cloudflared already installed ($(cloudflared --version))."
else
  log "Installing cloudflared..."
  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $CODENAME main" | \
    sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y cloudflared
  ok "cloudflared installed."
fi

# --- 4. Clone the repo ---------------------------------------------------------------------
if [ -d "$REPO_DIR/.git" ]; then
  ok "Repo already present at $REPO_DIR."
else
  log "Cloning $REPO_URL into $REPO_DIR..."
  git clone "$REPO_URL" "$REPO_DIR"
  ok "Cloned."
fi

# --- 5. Scaffold deploy target directories --------------------------------------------------
mkdir -p "$INFRA_BASE_DIR" "$APP_BASE_DIR"
ok "$INFRA_BASE_DIR and $APP_BASE_DIR ready (populated later by the deploy-infra-*/deploy-app-* workflows)."

# --- 6. cloudflared auth (manual: browser login) --------------------------------------------
mkdir -p "$HOME/.cloudflared"
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  pause "Run 'cloudflared tunnel login' — it opens a browser to authenticate against your Cloudflare account. Re-run this script afterwards."
fi
ok "cloudflared already authenticated."

# --- 7. Tunnel creation (manual) -------------------------------------------------------------
mapfile -t TUNNEL_CREDS < <(find "$HOME/.cloudflared" -maxdepth 1 -name '*.json' 2>/dev/null)
if [ "${#TUNNEL_CREDS[@]}" -eq 0 ]; then
  pause "Run 'cloudflared tunnel create $TUNNEL_NAME' to create a tunnel and generate its credentials file. Re-run this script afterwards."
elif [ "${#TUNNEL_CREDS[@]}" -gt 1 ]; then
  warn "Multiple tunnel credential files found in $HOME/.cloudflared — not guessing which one to use. Configure ~/.cloudflared/config.yml manually."
else
  TUNNEL_CRED_FILE="${TUNNEL_CREDS[0]}"
  TUNNEL_ID="$(basename "$TUNNEL_CRED_FILE" .json)"
  ok "Tunnel found (id: $TUNNEL_ID)."

  # --- 8. Template config.yml (only if one doesn't already exist — never overwrite a
  #        hand-edited ingress config) -------------------------------------------------------
  CONFIG_YML="$HOME/.cloudflared/config.yml"
  if [ -f "$CONFIG_YML" ]; then
    ok "$CONFIG_YML already exists — leaving it as-is."
  else
    log "Templating $CONFIG_YML..."
    cat > "$CONFIG_YML" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $TUNNEL_CRED_FILE

ingress:
  # Add one hostname -> local-port entry per service you expose, e.g.:
  #   - hostname: portal.yourdomain.com
  #     service: http://localhost:8081
  # See docs/DEPLOYMENT.md section 1 for the full pattern, and each service's own
  # docker-compose.yml for its current host port.
  - service: http_status:404
EOF
    ok "Templated $CONFIG_YML with a catch-all 404 — add per-service ingress entries as you deploy them."
  fi
fi

# --- 9. GitHub Actions self-hosted runner ----------------------------------------------------
if [ -f "$RUNNER_DIR/.runner" ]; then
  ok "GitHub Actions runner already registered in $RUNNER_DIR."
else
  if [ ! -x "$RUNNER_DIR/config.sh" ]; then
    log "Downloading the GitHub Actions runner binary..."
    mkdir -p "$RUNNER_DIR"
    case "$(uname -m)" in
      x86_64) RUNNER_ARCH=x64 ;;
      aarch64) RUNNER_ARCH=arm64 ;;
      *) warn "Unsupported architecture $(uname -m) for the GitHub Actions runner — skipping."; RUNNER_ARCH="" ;;
    esac
    if [ -n "$RUNNER_ARCH" ]; then
      RUNNER_TAG="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | grep -m1 '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')"
      RUNNER_TARBALL="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_TAG}.tar.gz"
      curl -fsSL -o "/tmp/$RUNNER_TARBALL" \
        "https://github.com/actions/runner/releases/download/v${RUNNER_TAG}/${RUNNER_TARBALL}"
      tar xzf "/tmp/$RUNNER_TARBALL" -C "$RUNNER_DIR"
      rm -f "/tmp/$RUNNER_TARBALL"
      "$RUNNER_DIR/bin/installdependencies.sh"
      ok "Runner binary $RUNNER_TAG downloaded to $RUNNER_DIR."
    fi
  fi
  pause "Register the runner: on GitHub, go to Settings -> Actions -> Runners -> New self-hosted runner (Linux/x64) to get a fresh registration token (it's single-use and expires quickly, so copy the config.sh command shown there directly). Then from $RUNNER_DIR run:
    ./config.sh --url $REPO_URL --token <TOKEN>
    sudo ./svc.sh install
    sudo ./svc.sh start
  (Use svc.sh, not './run.sh' directly, or the runner dies on reboot.) Re-run this script afterwards."
fi

# --- Done ------------------------------------------------------------------------------------
ok "Bootstrap complete."
cat <<EOF

Remaining one-time manual setup (not scriptable — see each doc for why):
  - Infisical admin/org/machine-identity setup: self-host/infra/infisical/README.md ("Bootstrap" section)
  - Windows Task Scheduler entries for wsl-startup.sh/wsl-shutdown.sh: docs/DEPLOYMENT.md section 2
EOF
}

main "$@"

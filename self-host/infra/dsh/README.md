# DeepSeek Harness (dsh)

Self-hosted AI agent harness ([deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), developer preview) that runs model-generated commands. It is treated as untrusted: pinned npm release, isolated network, keys it cannot read.

## Architecture

```
browser ──► gateway :3081 ──► dsh            sandbox network is internal: no route out, no host, no LAN
            (published on       │  http://gateway:8080/{openrouter,anthropic}  ──► gateway injects the real key
             127.0.0.1)         └─ HTTP(S)_PROXY=http://egress:3128            ──► egress (squid): public internet only
```

| Service | Image | Role |
|---|---|---|
| `dsh` | `systems-playground-dsh` | The harness. Holds only placeholder keys. Non-root, read-only rootfs, no capabilities. |
| `gateway` | `systems-playground-dsh-gateway` | nginx. Sole published port; relays the UI to `dsh`; forwards only the chat/model endpoints of OpenRouter and Anthropic with the real key injected, after verifying the upstream certificate. |
| `egress` | `systems-playground-dsh-egress` | squid. Web, git and npm for the agent on ports 80/443; refuses loopback, RFC 1918, link-local and CGNAT destinations (the host, the LAN, every other stack's published ports). |

Why the split: a process running as the same user can read another's environment from `/proc`, so keys given to `dsh` are readable by the agent. They live only in the gateway. Model-authored scripts that ignore the proxy variables simply have no route.

## Run locally

```bash
cp .env.example .env        # add OPENROUTER_API_KEY and/or ANTHROPIC_API_KEY
docker compose up -d --build
sh link.sh                  # one-time launch URL
```

Open the launch URL once per browser; it is exchanged for a 30-day session cookie. `settings.seed.yaml` registers OpenRouter (`deepseek/deepseek-v4-flash-0731`) and Anthropic (`claude-sonnet-5`, `claude-haiku-4-5-20251001`) against the gateway. It is copied only into an empty `dsh_home` volume; on an existing volume change providers in Settings → Models.

## Deploy

`build-infra-dsh.yml` builds the three images into the self-hosted registry; `deploy-infra-dsh.yml` then pulls them to `$INFRA_BASE_DIR/dsh` with secrets from Infisical (`prod`): `OPENROUTER_API_KEY` and/or `ANTHROPIC_API_KEY`, plus the shared `REGISTRY_*` ones. Use dedicated keys with spend limits.

- **Boot.** The workflow installs the file as `compose.yml`, not `docker-compose.yml`, on purpose: `wsl-startup.sh` runs a bare `docker compose up -d` on every `*/docker-compose.yml`, which would recreate the gateway with blank keys. Under this name the boot script skips it and `restart: unless-stopped` restores the existing containers. `docker compose stop` is the kill switch and survives a reboot.
- **Manual runs on the host** need the same environment. Use the workflow (or `infisical run -- docker compose up -d`); a bare `docker compose up -d` there blanks the keys.
- **Backups.** `wsl-backup.sh` discovers services by that same glob, so `dsh_home` (settings, session history) is not backed up.

## Going public

Nothing is published until `DSH_PUBLIC_HOST` is set, so do these in order:

1. Cloudflare Zero Trust → Access → Applications → Add → Self-hosted, hostname `dsh.<your domain>`, policy *Allow* for your own email only (one-time PIN or Google, ideally with MFA).
2. Cloudflare → SSL/TLS → Edge Certificates → turn on *Always Use HTTPS* (dsh's cookie has no `Secure` flag).
3. GitHub → Settings → Variables → set `DSH_PUBLIC_HOST` to that hostname and re-run *Deploy Infra - dsh*. It becomes both the tunnel label (`cloudflared-sync.sh` routes it within ~30s) and dsh's trusted Host.
4. In a private window the hostname must show the Access login before anything else.
5. `DSH_PUBLIC_HOST=dsh.<domain> sh link.sh` on the host prints the URL to open once per device.

## Auth model (checked against 0.1.5-rc.2)

- Every `/api` call needs a signed `HttpOnly; SameSite=Strict` cookie, minted by exchanging the launch token. The token rotates on every start and is accepted only at `GET /?token=` — not on API paths, not as a bearer.
- The cookie is bound to the hostname it was minted for and has no `Secure` flag, so off-box it must only travel over HTTPS. It is a bearer for 30 days: anyone holding it has a shell in the container.
- `/api` enforces a Host/Origin fence: loopback or `DSH_TRUSTED_HOSTS` only, anything else gets 403.
- dsh refuses `--host 0.0.0.0`; `entrypoint.sh` forwards its port and the gateway is the only thing published.
- Revoke every session by deleting the `client-connection/browser-session` record in `.credentials.yaml` (in the `dsh_home` volume) and restarting.

## Workspaces

The workspace picker browses the server's filesystem, so folders on your own device are not visible to it. Whatever the agent may touch is bind-mounted from `DSH_WORKSPACES_DIR` (default `./workspaces`, on the host `~/infra/dsh/workspaces`) at `/workspace`. Put or clone the repos you want worked on there; on the WSL host that folder is also reachable from Windows at `\\wsl.localhost\Ubuntu\home\yizhe\infra\dsh\workspaces`. Get changes back to your dev checkout with git.

## Residual risk

- The agent can still spend whatever credit the keys carry, and read or write everything under `/workspace`. Key limits are the cap.
- `egress` allows the public internet, so workspace content could be sent anywhere. Turning it into an allowlist is one `squid.conf` change.
- Developer-preview software with compatibility-breaking releases; the version is pinned in the `Dockerfile`.

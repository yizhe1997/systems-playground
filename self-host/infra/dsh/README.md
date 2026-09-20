# DeepSeek Harness (dsh)

Self-hosted AI agent harness ([deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), developer preview) that runs model-generated commands. It is treated as untrusted: pinned npm release, isolated network, keys it cannot read. The reasoning and what was verified are in [ADR 004](../../../docs/adrs/004-dsh-isolation-and-access.md).

## Architecture

![dsh stack: trust zones, key custody and isolation](../../../docs/diagrams/dsh-stack-trust-zones.png)

Interactive version: [`dsh-stack-trust-zones.html`](../../../docs/diagrams/dsh-stack-trust-zones.html).

| Service | Image | Role |
|---|---|---|
| `dsh` | `systems-playground-dsh` | The harness. Holds only placeholder keys. Non-root, read-only rootfs, no capabilities. Attached only to the internal `sandbox` network. |
| `gateway` | `systems-playground-dsh-gateway` | nginx. The sole published port (`127.0.0.1:3080`). Relays the UI to `dsh`, and is dsh's LLM endpoint: it injects the real OpenRouter/Anthropic key, verifies the upstream certificate, and forwards only the chat and models endpoints. |
| `egress` | `systems-playground-dsh-egress` | squid. The agent's only route to the public internet (ports 80/443, for web, git and npm). Refuses loopback, RFC 1918, link-local and CGNAT destinations: the host, the LAN, every other stack's published ports. |

**Why the split.** A process running as the same user can read another's environment from `/proc`, so any key placed in `dsh` is readable by the agent, even though dsh scrubs credential-named variables for the commands it spawns. Keys therefore live only in the gateway. And a normal container can reach every service published on the host, so `dsh` sits on a network with no route out at all. Model-authored scripts that ignore the proxy variables simply have no route.

## Run locally

```bash
cp .env.example .env        # add OPENROUTER_API_KEY and/or ANTHROPIC_API_KEY
docker compose up -d --build
sh link.sh                  # launch URL
```

Open the launch URL once per browser; it is exchanged for a 30-day session cookie. `settings.seed.yaml` registers OpenRouter (`deepseek/deepseek-v4-flash-0731`) and Anthropic (`claude-sonnet-5`, `claude-haiku-4-5-20251001`) against the gateway. It is copied only into an empty `dsh_home` volume; on an existing volume change providers in Settings → Models.

## Deploy

`build-infra-dsh.yml` builds the three images into the self-hosted registry; `deploy-infra-dsh.yml` then pulls them to `$INFRA_BASE_DIR/dsh` with secrets from Infisical (`prod`): `OPENROUTER_API_KEY` and/or `ANTHROPIC_API_KEY`, plus the shared `REGISTRY_*` ones. Use dedicated keys with spend limits.

- **Boot.** The workflow installs the file as `compose.yml`, not `docker-compose.yml`, on purpose: `wsl-startup.sh` runs a bare `docker compose up -d` on every `*/docker-compose.yml`, which would recreate the gateway with blank keys. Under this name the boot script skips it and `restart: unless-stopped` restores the existing containers. `docker compose stop` is the kill switch and survives a reboot.
- **Manual runs on the host** need the same environment. Use the workflow (or `infisical run -- docker compose up -d`); a bare `docker compose up -d` there blanks the keys.
- **Backups.** `wsl-backup.sh` discovers services by that same glob, so `dsh_home` (settings, session history) is not backed up.

## Going public (Cloudflare Access first)

Nothing is published until the `HOST` repository variable (your domain, e.g. `example.com`) is set, and dsh's hostname is `<DSH_SUBDOMAIN or dsh>.<HOST>`. Because setting `HOST` is what publishes it, do these in order:

1. **A login method.** Cloudflare dashboard → Zero Trust → Integrations → Identity providers. If *One-time PIN* is not listed, add it (new accounts no longer get it automatically).
2. **A policy (who may enter).** Zero Trust → Access controls → Policies → Add a policy. Action *Allow*, session duration 24 hours (deliberately shorter than dsh's 30-day cookie), *Include* your own email address only. Never add a *Bypass* policy.
3. **An application (what it protects).** Zero Trust → Access controls → Applications → Create new application → Self-hosted and private → Add public hostname. Domain `<HOST>`, subdomain `dsh`, no path. Attach the policy, enable *One-time PIN*, set the session duration, Create.
4. **HTTPS.** In the zone: SSL/TLS → Edge Certificates → *Always Use HTTPS*. dsh's cookie has no `Secure` flag, so it must only ever travel over HTTPS. This setting is zone-wide.
5. **Publish.** GitHub → Settings → Secrets and variables → Actions → *Variables* tab → set `HOST`, then run *Deploy Infra - dsh*. Within about 30 seconds `cloudflared-sync.sh` adds the route and the DNS record from the container label.
6. **Verify from outside.** An unauthenticated request must be redirected to your team's `cloudflareaccess.com` login, never reach dsh:

```bash
curl -sI https://dsh.<HOST>/ | grep -i -E "^HTTP|^location"
```

7. **Optional: make the tunnel verify Access too.** Access stamps every request it lets through with a signed token. Without this step nothing behind it checks the stamp, so if the Access application were deleted or mis-scoped, dsh's own cookie would be the only gate left. With it, `cloudflared` itself returns 403 for any request that lacks a valid token for this application.
   1. Copy the application's **Audience (AUD) tag**: Access controls → Applications → *Configure* on the dsh app → *Additional settings*. It is an identifier, not a secret.
   2. Set two more repository variables (both or neither): `CF_ACCESS_TEAM` (the `<team>` in `<team>.cloudflareaccess.com`) and `DSH_ACCESS_AUD` (the tag). Re-run *Deploy Infra - dsh*.
   3. `cloudflared-sync.sh` (deploy *Deploy Infra - Scripts* first if it has not run since this change) adds an `originRequest.access` block for the hostname. It validates the regenerated config with `cloudflared tunnel ingress validate` before installing it and keeps the old one if that fails. A half-set pair leaves the hostname unrouted with a warning in `~/infra/logs/cloudflared-sync.log`, rather than silently skipping the check.
   4. Check: `grep -B2 -A6 originRequest ~/.cloudflared/config.yml` shows the block, and signing in through Access still works. A request that bypasses Access can't be produced from outside to test the rejection; that part rests on cloudflared's own behaviour.

## Getting a launch link

dsh generates a new launch URL every time it starts (it is reusable until the next restart, not single-use), and you need one only for a new browser (or after the 30-day cookie expires). Two ways to get it:

- **On the host or from Windows:**

```bash
wsl -e bash -c "cd ~/infra/dsh && sh link.sh"
```

  It prints the public `https://` link when the stack is published, otherwise the loopback one. `sh link.sh local` forces the loopback link.
- **From anywhere (GitHub or Discord):** run the *dsh - Send Launch Link* workflow (Actions → Run workflow, from the website or mobile app). The link is posted to a private Discord channel and masked in the public run log. When dsh is published the message carries two links with the same token: the public one for any device, and a loopback one (`http://127.0.0.1:…`) that only works in a browser on the host machine, as the fallback for model and settings editing. It needs a Discord webhook URL stored in Infisical as `DSH_LINK_WEBHOOK_URL`.

Either way the link is a credential. It is useless without also passing Access, and it stops working when dsh next restarts (until then it can be reused), so keep the Discord channel private.

## Auth model (checked against 0.1.5-rc.2)

- Every `/api` call needs a signed `HttpOnly; SameSite=Strict` cookie, minted by exchanging the launch token. The token rotates on every start and is accepted only at `GET /?token=`, not on API paths and not as a bearer.
- The cookie is bound to the hostname it was minted for and has no `Secure` flag. It is a bearer for 30 days: anyone holding it has a shell in the container.
- `/api` enforces a Host/Origin fence: loopback or `DSH_TRUSTED_HOSTS` (set from `HOST`) only; anything else gets 403.
- dsh refuses `--host 0.0.0.0`; `entrypoint.sh` forwards its port and the gateway is the only thing published.
- Revoke every session by deleting the `client-connection/browser-session` record in `.credentials.yaml` (in the `dsh_home` volume) and restarting.

## Editing models and settings from a public hostname

Upstream dsh enables host settings (Settings → Models, the provider directory, General) only when the page's own hostname is loopback. On a public hostname such as `dsh.<HOST>` it shows *Loading the provider directory failed: settings are unavailable in this browser*, and models cannot be created or edited. The restriction is in the browser client only; the server has no such check.

The image therefore patches those two client-side checks at build time (`patch-remote-settings.js`, run from the `Dockerfile`). Checked against a non-loopback hostname: the unpatched image reproduces the error, the patched one loads Settings → Models with the seeded providers, and a settings change made from that page is written to `settings.yaml`. Every request still has to pass Cloudflare Access, the trusted-host fence and dsh's session cookie, and the agent can already edit `settings.yaml` itself (same user, writable volume), so this removes no protection.

- **On a dsh upgrade** the patch fails the image build unless each expected line is present exactly once. Then review the new upstream code and update the script, or drop the patch if upstream has lifted the restriction.
- **Fallback if it ever stops working:** the loopback link. `sh link.sh local` prints it (from Windows: `wsl -e bash -c "cd ~/infra/dsh && sh link.sh local"`), and the *dsh - Send Launch Link* workflow includes it in the Discord message. Open it in a browser on the host machine. Settings are stored in the `dsh_home` volume, so they apply to every browser.

## Workspaces and uploads

The workspace picker browses the **server's** filesystem, so folders on your own device are not visible to it. Whatever the agent may touch is bind-mounted from `DSH_WORKSPACES_DIR` (default `./workspaces`, on the host `~/infra/dsh/workspaces`) at `/workspace`. Put or clone the repos you want worked on there; on the WSL host that folder is also reachable from Windows at `\\wsl.localhost\Ubuntu\home\yizhe\infra\dsh\workspaces`. Get changes back to your dev checkout with git.

The container's root filesystem is read-only, so the only writable places are `/workspace`, the `dsh_home` volume and `/tmp`. `HOME` is set to `/workspace`, so the picker starts there and `git`/`npm` keep their dotfiles and caches in that folder (`.gitconfig`, `.npm`, ...). Creating a folder anywhere else, for example under `/home/node`, fails with `EROFS: read-only file system`.

Files you attach in a chat are uploaded by the browser and stored on the server under `$DSH_HOME/attachments` (in the `dsh_home` volume), so they work from any device. Images need a model that declares image input; hand-declared models in `settings.seed.yaml` do so explicitly.

## Residual risk

- The agent can still spend whatever credit the keys carry, and read or write everything under `/workspace`. Key limits are the cap.
- `egress` allows the public internet, so workspace content could be sent anywhere. Turning it into an allowlist is one `squid.conf` change.
- Developer-preview software with compatibility-breaking releases; the version is pinned in the `Dockerfile`.

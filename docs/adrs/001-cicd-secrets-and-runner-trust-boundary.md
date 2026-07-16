# ADR 001: CI/CD Trust Boundary for the Self-Hosted Runner

**Date:** 2026-07-11
**Status:** Accepted

### Context
`systems-playground` is a **public** repository. Its deploy workflows (`deploy-app-portfolio.yml`, `deploy-infra-*.yml`) run on a **self-hosted runner** on the host (see [`docs/DEPLOYMENT_WSL.md`](../DEPLOYMENT_WSL.md) for what that is), and inject real secrets (SMTP creds, NextAuth secret, Google OAuth client secret, admin API key, Discord webhooks, etc.) as plaintext `.env` files on that host.

GitHub explicitly warns against combining public repos with self-hosted runners: a workflow triggered by `pull_request` from a fork can run untrusted code on the runner before any human reviews it, giving an attacker code execution on the host plus every secret the job has access to.

Today the repo has exactly one collaborator (the owner), and no workflow is triggered by `pull_request` — only `push` (to `main`), `workflow_run`, and `workflow_dispatch`, all of which require write access to the base repo. So the specific fork-PR attack does not currently apply. But this is a property of the *current* configuration, not a structural guarantee — it silently breaks the moment a `pull_request`-triggered workflow is added (e.g. "run tests on PRs") or a second collaborator is granted write access.

### Options Considered

| Option | Effort | Trade-off |
|---|---|---|
| 1. Do nothing beyond GitHub's defaults (rely on "require approval for first-time contributors") | Low | Only protects `pull_request`-triggered workflows — doesn't stop someone *adding* one later without recognizing the reintroduced risk |
| 2. Move deploys to GitHub-hosted runners | Medium | Eliminates the blast radius entirely, but removes the reason the runner exists — deploys need to reach a home-networked host GitHub's cloud runners can't see |
| 3. Keep the self-hosted runner; codify the constraint and harden the triggering account (branch protection, hardware-key 2FA) | Low | **Chosen** — see Reasoning |

### Decision
We chose **Option 3**.

### Reasoning
1. **The runner's value (deploying to a home-networked host) is the reason it can't move to GitHub-hosted infra.** Option 2 solves the security problem by removing the thing the runner is for.
2. **The real residual risk isn't "public repo" in isolation — it's account compromise.** With a self-hosted runner, a phished or leaked-token GitHub account stops being "attacker gets a repo" and becomes "attacker gets code execution on the home server plus every secret in these workflows." Hardware-key 2FA on the account is the highest-leverage single control here.
3. **The fork-PR attack is currently neutralized by trigger choice, not by luck** — but that fact is not visible from the workflow files alone to a future contributor (including future-self) adding a new workflow. Writing it down as an ADR, rather than leaving it as tribal knowledge, is what prevents it from being silently reintroduced.

### Constraints going forward
- **No workflow that targets the self-hosted runner (`runs-on: self-hosted`) may trigger on `pull_request`.** If PR-triggered checks are wanted (e.g. build/lint on PRs), they must run on GitHub-hosted runners (`runs-on: ubuntu-latest`).
- **Update (2026-07-13):** the `build-app-*.yml` and `build-infra-n8n.yml` workflows moved from `runs-on: ubuntu-latest` to `runs-on: self-hosted`, so they could authenticate to Infisical for registry credentials instead of using plain GitHub Secrets (see [ADR 002](./002-infisical-secret-injection.md)). This means build workflows are now also bound by the constraint above, not just deploy workflows — all of them remain `push`/`workflow_dispatch`-only, so the invariant still holds, but the blast radius of "everything on `self-hosted`" grew. Deliberate trade-off: also means builds, not just deploys, now depend on the host being powered on and reachable — previously builds worked from anywhere via GitHub's cloud compute regardless of the host's state.
- **Update (2026-07-14):** the registry these build workflows push to is now a self-hosted one (`self-host/infra/registry/`), not Docker Hub — see the registry migration entry in the project's Obsidian tracker for the full reasoning. Doesn't change this ADR's trust-boundary conclusion, since the credentials still come from Infisical either way.
- **Branch protection on `main`** should be enabled (even solo) to add friction against a compromised token being able to force-push or bypass review silently.
- **2FA (hardware key preferred) is required** on the GitHub account holding write access to this repo.
- **Re-open this ADR** if a second collaborator is ever added, or if any workflow needs a `pull_request` trigger — the trust model above assumes sole-collaborator, push/dispatch-only triggers.

### Related
- See discussion in project history re: plaintext `.env` secrets on the runner host and third-party Action pinning (pin to commit SHA, not tag, for supply-chain resistance — see the `tj-actions/changed-files` 2025 compromise as the canonical example of why).
- A self-hosted secrets manager (e.g. Infisical) would reduce how much this ADR needs to rely on "the account is well-secured," since secrets would no longer sit as static, non-rotating plaintext once they leave GitHub. Candidate for a future infra module.

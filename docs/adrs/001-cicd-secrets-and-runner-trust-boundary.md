# ADR 001: CI/CD Trust Boundary for the Self-Hosted Runner

**Date:** 2026-07-11
**Status:** Accepted

### Context
`systems-playground` is a **public** repository. Its deploy workflows (`deploy-app-portfolio.yml`, `deploy-infra-*.yml`) run on a **self-hosted runner** on the WSL/NUC host, and inject real secrets (SMTP creds, NextAuth secret, Google OAuth client secret, admin API key, Discord webhooks, etc.) as plaintext `.env` files on that host.

GitHub explicitly warns against combining public repos with self-hosted runners: a workflow triggered by `pull_request` from a fork can run untrusted code on the runner before any human reviews it, giving an attacker code execution on the host plus every secret the job has access to.

Today the repo has exactly one collaborator (the owner), and no workflow is triggered by `pull_request` — only `push` (to `main`), `workflow_run`, and `workflow_dispatch`, all of which require write access to the base repo. So the specific fork-PR attack does not currently apply. But this is a property of the *current* configuration, not a structural guarantee — it silently breaks the moment a `pull_request`-triggered workflow is added (e.g. "run tests on PRs") or a second collaborator is granted write access.

### Options Considered
1. **Do nothing beyond GitHub's defaults.** Rely on the built-in "require approval for first-time contributors" gate. Low effort, but that gate only protects `pull_request`-triggered workflows — it does nothing to prevent someone from *adding* such a workflow later without recognizing the risk it reintroduces.
2. **Move deploys to GitHub-hosted runners.** Eliminates the blast-radius problem entirely (a compromised run gets a throwaway VM, not the home network), but the whole point of the current setup is deploying to a host that isn't reachable from GitHub's cloud runners without exposing it publicly.
3. **Keep the self-hosted runner, but codify the constraint and harden the account that can trigger it.** Document the invariant, add branch protection on `main`, and require 2FA (hardware key) on the account with push access, since that account is now equivalent to a key to the home server.

### Decision
We chose **Option 3**.

### Reasoning
1. **The runner's value (deploying to a home-networked host) is the reason it can't move to GitHub-hosted infra.** Option 2 solves the security problem by removing the thing the runner is for.
2. **The real residual risk isn't "public repo" in isolation — it's account compromise.** With a self-hosted runner, a phished or leaked-token GitHub account stops being "attacker gets a repo" and becomes "attacker gets code execution on the home server plus every secret in these workflows." Hardware-key 2FA on the account is the highest-leverage single control here.
3. **The fork-PR attack is currently neutralized by trigger choice, not by luck** — but that fact is not visible from the workflow files alone to a future contributor (including future-self) adding a new workflow. Writing it down as an ADR, rather than leaving it as tribal knowledge, is what prevents it from being silently reintroduced.

### Constraints going forward
- **No workflow that targets the self-hosted runner (`runs-on: self-hosted`) may trigger on `pull_request`.** If PR-triggered checks are wanted (e.g. build/lint on PRs), they must run on GitHub-hosted runners (`runs-on: ubuntu-latest`).
- **Update (2026-07-13):** the `build-app-*.yml` and `build-infra-n8n.yml` workflows moved from `runs-on: ubuntu-latest` to `runs-on: self-hosted`, so they could authenticate to Infisical for Docker Hub credentials instead of using plain GitHub Secrets (see `docs/adrs/002-infisical-secret-injection.md`). This means build workflows are now also bound by the constraint above, not just deploy workflows — all of them remain `push`/`workflow_dispatch`-only, so the invariant still holds, but the blast radius of "everything on `self-hosted`" grew. Deliberate trade-off: also means builds, not just deploys, now depend on the NUC being powered on and reachable — previously builds worked from anywhere via GitHub's cloud compute regardless of the NUC's state.
- **Branch protection on `main`** should be enabled (even solo) to add friction against a compromised token being able to force-push or bypass review silently.
- **2FA (hardware key preferred) is required** on the GitHub account holding write access to this repo.
- **Re-open this ADR** if a second collaborator is ever added, or if any workflow needs a `pull_request` trigger — the trust model above assumes sole-collaborator, push/dispatch-only triggers.

### Related
- See discussion in project history re: plaintext `.env` secrets on the runner host and third-party Action pinning (pin to commit SHA, not tag, for supply-chain resistance — see the `tj-actions/changed-files` 2025 compromise as the canonical example of why).
- A self-hosted secrets manager (e.g. Infisical) would reduce how much this ADR needs to rely on "the account is well-secured," since secrets would no longer sit as static, non-rotating plaintext once they leave GitHub. Candidate for a future infra module.

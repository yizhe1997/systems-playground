# ADR 003: Secure Local Storage over Git-Tracked Blobs

## Context
The portfolio platform requires a robust way to host and distribute the owner's professional resume (a PDF binary).
Initial iterations considered placing the `.pdf` directly within the Next.js `public/` directory and committing it to the Git repository. While technically viable, this introduced significant downsides:
1. **Repository Bloat:** Frequent updates to a binary PDF file bloat the Git history, slowing down clones and CI/CD pipelines.
2. **Lack of Access Control:** Files inside the Next.js `public/` folder are entirely static and public. There is no mechanism to expire links, password-protect documents, or track access.
3. **Deployment Friction:** Every single resume typo fix would require a complete Git commit, push, GitHub Action trigger, and Docker container rebuild.

## Decision
We elected to provision a dedicated **Filebrowser** container mapped via Docker volumes to the host's local storage, acting as a lightweight, self-hosted S3 alternative.

## Implementation Details
* A `filebrowser/filebrowser` image (~20MB memory footprint) runs as a shared platform infra service at `self-host/infra/filebrowser/docker-compose.yml`, rather than inside the portfolio project's own compose file — this lets any future showcase project reuse the same storage without duplicating the container.
* A host volume (`./data/files:/srv`) allows the files to reside securely on the host's filesystem, surviving container restarts. Backed up by the infra layer's `wsl-backup.sh` — deployed, but not yet wired to an automatic schedule; see [the infra scripts README](../../../infra/scripts/README.md) for current status and how to restore.
* A SQLite database (`./data/config/filebrowser.db`) stores user credentials, session tokens, and cryptographic share links.
* The portfolio backend (`self-host/apps/portfolio/backend/filebrowser.go`) talks to this shared service over the internal Docker network via its API, rather than mounting the volume directly.

## Consequences
### Positive
* **Zero-Rebuild Updates:** Resumes can be updated simply by dragging and dropping them into a Web UI, requiring zero terminal commands or CI pipeline runs.
* **Enterprise Security:** The system now supports expiring links, password-protected downloads, and instant revocation of shared URLs, giving the owner total control over document distribution.
* **Clean Git History:** The repository remains strictly for source code; binary blob bloat is eliminated.

### Negative
* Adds a small amount of architectural complexity (one additional container to monitor and update).
* `self-host/infra/filebrowser/data/` isn't tracked by Git, so it depends entirely on `wsl-backup.sh` actually running on a schedule (not yet set up as of this writing) — see the note above.

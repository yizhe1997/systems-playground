# seaweedfs

Self-hosted S3-compatible object store (the GCS-bucket-style replacement for Filebrowser). One
`weed mini` container: master, volume, filer, S3 gateway and admin UI in a single process. Chosen
over Garage for many-small-files workloads and the built-in UI.

- **S3 API** — `https://${S3_SUBDOMAIN:-s3}.${HOST}` via the Cloudflare tunnel. Path-style addressing, region `us-east-1`.
- **Admin UI** — `http://localhost:23646` on the host (loopback only, user `admin` + `SEAWEEDFS_ADMIN_PASSWORD`; use an SSH tunnel). Its Files page is the object browser; the filer UI is deliberately not published.
- **Secrets** (Infisical, `prod`): `SEAWEEDFS_S3_ACCESS_KEY`, `SEAWEEDFS_S3_SECRET_KEY`, `SEAWEEDFS_ADMIN_PASSWORD`. Optional repo var `SEAWEEDFS_BUCKETS` (comma-separated, pre-created on start).
- **Data** — named volume `seaweedfs_data`, not plain files on the host. Back it up through the S3 endpoint (rclone/restic) or `weed` replication; `wsl-backup.sh` does not cover it yet.
- **Image** is pinned and not watchtower-managed. Bump the tag in `docker-compose.yml` on purpose.

Filebrowser (`../filebrowser/`) is still running: the portfolio backend uses its API for resume share
links, so migrating that is a separate change.

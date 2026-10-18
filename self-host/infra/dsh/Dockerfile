FROM node:24-bookworm-slim

ARG DSH_VERSION=0.1.5-rc.2
# npm --before installs the dependency versions that existed on this date. Only the top-level package is pinned by
# DSH_VERSION; its sub-packages float, and rc.3 of them (published after this date) moved the files that
# patch-remote-settings.js edits and broke the build. Move this date forward only together with that patch.
ARG DSH_DEPS_BEFORE=2026-09-20T12:00:00Z

RUN apt-get update \
 && apt-get install -y --no-install-recommends socat curl git ripgrep ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g --before="${DSH_DEPS_BEFORE}" "@deepseek-ai/dsh@${DSH_VERSION}" \
 && mkdir -p /home/node/.dsh /workspace \
 && chown node:node /home/node/.dsh /workspace

COPY patch-remote-settings.js /tmp/patch-remote-settings.js
RUN node /tmp/patch-remote-settings.js && rm /tmp/patch-remote-settings.js

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY settings.seed.yaml /opt/dsh/settings.seed.yaml
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh /opt/dsh/settings.seed.yaml \
 && chmod 755 /usr/local/bin/entrypoint.sh

USER node
WORKDIR /workspace
ENV DSH_HOME=/home/node/.dsh
EXPOSE 3081
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

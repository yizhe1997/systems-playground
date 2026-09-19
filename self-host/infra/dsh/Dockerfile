FROM node:24-bookworm-slim

ARG DSH_VERSION=0.1.5-rc.2

RUN apt-get update \
 && apt-get install -y --no-install-recommends socat curl git ripgrep ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g "@deepseek-ai/dsh@${DSH_VERSION}" \
 && mkdir -p /home/node/.dsh /workspace \
 && chown node:node /home/node/.dsh /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY settings.seed.yaml /opt/dsh/settings.seed.yaml
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh /opt/dsh/settings.seed.yaml \
 && chmod 755 /usr/local/bin/entrypoint.sh

USER node
WORKDIR /workspace
ENV DSH_HOME=/home/node/.dsh
EXPOSE 3081
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

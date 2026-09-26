# syntax=docker/dockerfile:1

# Node 24 (active LTS, supported to 2028-04-30). Node 20 reached end-of-life on 2026-04-30.
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
# (Measured on Node 20, kept as a precaution after moving to Node 24; re-measure if it is ever removed.)
# Node 20 "happy eyeballs" gives each resolved address only 250ms to finish its TCP handshake
# before abandoning it. On this WSL2/NAT host the handshake to PostHog's ingest ELB
# (us.i.posthog.com, 8 A + 8 AAAA records, and this host has no IPv6 route at all) regularly
# takes longer than that while the server is busy serving a page load, so every address gets
# abandoned and the /ingest rewrite 500s with an AggregateError of ETIMEDOUT/ENETUNREACH.
# Measured in a real browser load against otherwise-identical containers: default and
# --dns-result-order=ipv4first both failed, this timeout (and disabling autoselection) passed.
ENV NODE_OPTIONS="--network-family-autoselection-attempt-timeout=3000"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

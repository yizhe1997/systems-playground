# Systems Playground Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-11

## Active Technologies

- Go 1.24 (backend) / Next.js 16 + TypeScript 5 (frontend) + Fiber v2, Redis (go-redis v9), Redpanda client, PostgreSQL driver + pgvector support (backend) / React 19, Tailwind CSS v4, shadcn/ui, NextAuth v4 (frontend) (002-gold-futures-copilot)

## Project Structure

```text
/
├── backend/          # Go 1.24 + Fiber v2 control plane
│   ├── pkg/          # Feature packages: handler → service → repository
│   ├── main.go       # Wiring only
│   └── Dockerfile
├── frontend/         # Next.js 16 (App Router) + TypeScript 5 + Tailwind v4
│   ├── src/
│   │   ├── app/      # Pages (Server Components default) + BFF proxy routes under api/proxy/
│   │   └── components/
│   └── Dockerfile
├── docker-compose.yml          # Service declarations (use profiles for heavy containers)
├── docker-compose.prod.yml
├── docker-compose.override.yml
└── .github/workflows/          # GitHub Actions CI/CD — sole build/push mechanism
```

## Commands

npm test && npm run lint

## Code Style

Go 1.24 (backend) / Next.js 16 + TypeScript 5 (frontend): Follow standard conventions

## Recent Changes

- 002-gold-futures-copilot: Added Go 1.24 (backend) / Next.js 16 + TypeScript 5 (frontend) + Fiber v2, Redis (go-redis v9), Redpanda client, PostgreSQL driver + pgvector support (backend) / React 19, Tailwind CSS v4, shadcn/ui, NextAuth v4 (frontend)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

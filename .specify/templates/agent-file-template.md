# Systems Playground Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies

[EXTRACTED FROM ALL PLAN.MD FILES]

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

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style

[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

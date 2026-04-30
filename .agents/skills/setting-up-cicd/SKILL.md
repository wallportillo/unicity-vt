---
name: setting-up-cicd
emoji: 🚀
description: CI/CD setup for the Unicity Support app — GitHub Actions pipeline, Dockerfile for the Express + Vite stack, environment variable strategy for deployment, and health check verification. Use when setting up automated builds, adding a Dockerfile, configuring GitHub Actions, or deploying the app beyond running it manually.
---

# Setting Up CI/CD

Patterns for automating build, test, and deployment of the Unicity Support app.

## Non-Negotiables

- Never commit `.env` or real credentials to the repo
- Never bypass type-check or lint in the CI pipeline
- The Express server and Vite frontend must be served from a single process in production

## Contents

- [Run Four Checks in CI: type-check, lint, test, build](#run-four-checks-in-ci-type-check-lint-test-build)
- [Serve Frontend from Express in Production](#serve-frontend-from-express-in-production)
- [Containerize with a Two-Stage Dockerfile](#containerize-with-a-two-stage-dockerfile)
- [Store Secrets in GitHub Actions Secrets](#store-secrets-in-github-actions-secrets)
- [Expose a Health Endpoint for Deployment Probes](#expose-a-health-endpoint-for-deployment-probes)
- [Add a .env.example for All Required Variables](#add-a-envexample-for-all-required-variables)

---

## Run Four Checks in CI: type-check, lint, test, build

Every PR and push to `main` must pass all four checks in order. Do not skip any.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

Why: running in order surfaces the cheapest failure first. Type errors and lint failures are faster to catch than a failed build.

---

## Serve Frontend from Express in Production

In production, Express serves the Vite-built frontend from `dist/` in addition to the API routes. There is no separate Vite server.

Add this to `server/index.ts` after all API routes:

```ts
import path from 'path';

// Serve built frontend (production only)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
```

Build order:
1. `npm run build` — compiles TypeScript + builds Vite output to `dist/`
2. `node server/index.js` — serves both API and frontend

Why: running two separate processes (Vite preview + Express) in production complicates deployment and requires a reverse proxy. Serving from Express keeps the deployment to a single process and single port.

---

## Containerize with a Two-Stage Dockerfile

Use a two-stage build: install + build in one stage, copy artifacts to a lean runtime image.

```dockerfile
# Dockerfile

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 3001
CMD ["node", "server/index.js"]
```

Build and run locally:
```bash
docker build -t unicity-support .
docker run -p 3001:3001 --env-file .env unicity-support
```

Why: the two-stage build keeps devDependencies (Vite, TypeScript, testing libs) out of the runtime image, reducing image size from ~500MB to ~100MB.

---

## Store Secrets in GitHub Actions Secrets

Never hardcode WorldPay credentials in workflow files or Dockerfiles. Use GitHub Actions secrets for all sensitive values.

```yaml
# In .github/workflows/deploy.yml
- name: Deploy
  env:
    WORLDPAY_MERCHANT_CODE: ${{ secrets.WORLDPAY_MERCHANT_CODE }}
    WORLDPAY_XML_PASSWORD: ${{ secrets.WORLDPAY_XML_PASSWORD }}
    WORLDPAY_ENDPOINT: ${{ secrets.WORLDPAY_ENDPOINT }}
```

Required secrets to configure in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `WORLDPAY_MERCHANT_CODE` | WorldPay merchant identifier |
| `WORLDPAY_XML_PASSWORD` | WorldPay XML API password |
| `WORLDPAY_ENDPOINT` | WorldPay endpoint URL (test or production) |
| `ALLOWED_ORIGIN` | Production frontend URL for CORS |

Why: secrets in GitHub Actions are redacted from logs and never exposed to pull requests from forks.

---

## Expose a Health Endpoint for Deployment Probes

The existing `GET /api/health` endpoint is the liveness probe. It must return `200` with a JSON body.

```ts
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Use it in deployment health checks:
```bash
# Manual check
curl https://your-app.com/api/health

# Docker healthcheck (add to Dockerfile)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
```

Why: without a health check, load balancers and container orchestrators have no way to know if the app started successfully or crashed.

---

## Add a .env.example for All Required Variables

Maintain a `.env.example` in the repo root with all required variable names and safe placeholder values. Never put real credentials in `.env.example`.

```bash
# .env.example

# WorldPay WPG credentials (required)
WORLDPAY_MERCHANT_CODE=your-merchant-code-here
WORLDPAY_XML_PASSWORD=your-xml-password-here

# WorldPay endpoint
# Production: https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp
# Test:       https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp
WORLDPAY_ENDPOINT=https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp

# API server port (default: 3001)
PORT=3001

# CORS allowed origin for production deployment
ALLOWED_ORIGIN=https://support.unicity.com
```

Commit `.env.example`. Never commit `.env`.

Why: `.env.example` is the authoritative list of what a new developer or deployment needs. Without it, missing variables are discovered at runtime.

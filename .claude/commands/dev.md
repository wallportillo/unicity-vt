---
name: dev
emoji: 🔧
description: Starts the development environment with all required services. Use when beginning development work or restarting the dev server.
---

# Dev

Start development environment with all services.

## Contents

- [Check Environment Before Starting](#check-environment-before-starting)
- [Start Required Services](#start-required-services)
- [Start Development Server](#start-development-server)
- [Watch for Common Startup Errors](#watch-for-common-startup-errors)

---

## Check Environment Before Starting

Verify environment is ready:

```bash
# Check .env exists
test -f .env || echo "Missing .env file - run /setup first"

# Verify database is accessible
pnpm db:ping  # or custom health check
```

Why: Environment issues should be caught before server starts.

---

## Start Required Services

Start dependencies if needed:

```bash
# Start database (if using Docker)
docker-compose up -d db

# Start Redis (if applicable)
docker-compose up -d redis

# Or start all services
docker-compose up -d
```

Why: External services must be running before app starts.

---

## Start Development Server

Run dev server:

```bash
# Single app
pnpm dev

# Monorepo - specific app
pnpm dev --filter=@project/web

# With specific port
PORT=3000 pnpm dev
```

Why: Dev server enables hot reload for rapid development.

---

## Watch for Common Startup Errors

Handle common issues:

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Database not running | `docker-compose up -d db` |
| `Missing env var` | Incomplete .env | Check .env.example |
| `Port in use` | Another process | `lsof -i :3000` and kill |
| `Module not found` | Missing deps | `pnpm install` |

Why: Quick troubleshooting saves developer time.

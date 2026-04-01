---
name: setup
emoji: 🚀
description: Onboards new developers by installing dependencies, configuring environment, and verifying the setup. Use when setting up the project for the first time or troubleshooting setup issues.
---

# Setup

Initialize development environment for new team members.

## Contents

- [Verify Prerequisites Before Starting](#verify-prerequisites-before-starting)
- [Install Dependencies with Package Manager](#install-dependencies-with-package-manager)
- [Configure Environment Variables](#configure-environment-variables)
- [Initialize Database](#initialize-database)
- [Run Verification Checks](#run-verification-checks)
- [Report Setup Status](#report-setup-status)

---

## Verify Prerequisites Before Starting

Check required tools are installed:

```bash
# Check Node.js version
node --version  # Should be >= 18

# Check package manager
pnpm --version  # or npm/yarn

# Check git
git --version

# Check database client (if applicable)
psql --version  # or mysql --version
```

Why: Prerequisites must be met before setup can succeed.

---

## Install Dependencies with Package Manager

Run installation:

```bash
# Install all dependencies
pnpm install

# If using workspaces, install all workspace packages
pnpm install --recursive
```

Why: Dependencies must be installed before any other setup step.

---

## Configure Environment Variables

Copy and configure environment:

```bash
# Copy example env file
cp .env.example .env

# Or for multiple environments
cp .env.example .env.local
```

Prompt user for required values:
- Database connection string
- API keys
- Third-party service credentials

Why: Environment must be configured before app can run.

---

## Initialize Database

Set up database:

```bash
# Run migrations
pnpm db:migrate

# Seed initial data (if applicable)
pnpm db:seed
```

Why: Database schema must exist before app can connect.

---

## Run Verification Checks

Verify setup is complete:

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Start dev server briefly to verify
pnpm dev
```

Why: Verification catches setup issues early.

---

## Report Setup Status

Provide summary:

```markdown
## Setup Complete

| Step | Status |
|------|--------|
| Prerequisites | ✅ |
| Dependencies | ✅ |
| Environment | ✅ |
| Database | ✅ |
| Verification | ✅ |

### Next Steps
- Run `pnpm dev` to start development
- See README.md for project overview
```

Why: Clear status report confirms successful setup.

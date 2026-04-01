---
name: build
emoji: 📦
description: Builds the project for production deployment. Use when preparing a production build or verifying build succeeds.
---

# Build

Create production-ready build.

## Contents

- [Clean Previous Build Artifacts](#clean-previous-build-artifacts)
- [Run Pre-Build Checks](#run-pre-build-checks)
- [Execute Production Build](#execute-production-build)
- [Verify Build Output](#verify-build-output)

---

## Clean Previous Build Artifacts

Remove stale files:

```bash
# Clean build directories
pnpm clean

# Or manually
rm -rf dist .next out build node_modules/.cache
```

Why: Stale artifacts can cause inconsistent builds.

---

## Run Pre-Build Checks

Verify code is build-ready:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test
```

Why: Catching errors before build saves time.

---

## Execute Production Build

Run build:

```bash
# Standard build
pnpm build

# With specific environment
NODE_ENV=production pnpm build

# Monorepo - all packages
pnpm build --recursive
```

Why: Production build optimizes for performance.

---

## Verify Build Output

Confirm build succeeded:

```bash
# Check output exists
ls -la dist/  # or .next/ or build/

# Check bundle size
du -sh dist/

# Preview production build locally
pnpm preview  # or pnpm start
```

Report build status:

```markdown
## Build Complete

- Output: `dist/`
- Size: [X] MB
- Duration: [X]s
- Warnings: [count]
```

Why: Verification catches build issues before deployment.

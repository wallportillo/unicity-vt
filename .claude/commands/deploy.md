---
name: deploy
emoji: 🚢
description: Deploys the application to staging or production environments. Use when deploying changes after build verification.
---

# Deploy

Deploy application to target environment.

## Contents

- [Confirm Deployment Target](#confirm-deployment-target)
- [Verify Pre-Deployment Checklist](#verify-pre-deployment-checklist)
- [Execute Deployment](#execute-deployment)
- [Run Post-Deployment Verification](#run-post-deployment-verification)
- [Handle Rollback If Needed](#handle-rollback-if-needed)

---

## Confirm Deployment Target

Ask before deploying:

```markdown
Deploying to: [staging | production]

- Branch: `main`
- Commit: `abc123`
- Changes: [summary]

Proceed with deployment? (yes/no)
```

Why: Explicit confirmation prevents accidental deployments.

---

## Verify Pre-Deployment Checklist

Before deploying:

- [ ] Build succeeds locally
- [ ] All tests pass
- [ ] No pending migrations (or migrations are included)
- [ ] Environment variables updated (if needed)
- [ ] Feature flags configured

Why: Pre-flight checks catch deployment blockers.

---

## Execute Deployment

Run deployment command:

```bash
# Staging
pnpm deploy:staging

# Production
pnpm deploy:production

# Or using CI/CD
git push origin main  # triggers deployment pipeline
```

Why: Consistent deployment commands reduce errors.

---

## Run Post-Deployment Verification

Verify deployment:

```bash
# Health check
curl https://api.example.com/health

# Smoke test critical paths
pnpm test:smoke --env=staging
```

Report status:

```markdown
## Deployment Complete

- Environment: staging
- URL: https://staging.example.com
- Health: ✅ Healthy
- Deployed: [timestamp]
```

Why: Post-deployment checks catch issues early.

---

## Handle Rollback If Needed

If issues detected:

```bash
# Rollback to previous version
pnpm deploy:rollback

# Or revert commit and redeploy
git revert HEAD
git push origin main
```

Why: Quick rollback minimizes incident impact.

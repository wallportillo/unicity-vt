---
name: env
emoji: 🔐
description: Manages environment variables across local and deployed environments. Use when adding, updating, or troubleshooting environment configuration.
---

# Env

Manage environment variables.

## Contents

- [Check Current Environment](#check-current-environment)
- [Add New Environment Variable](#add-new-environment-variable)
- [Update Existing Variable](#update-existing-variable)
- [Sync Environment Across Stages](#sync-environment-across-stages)
- [Troubleshoot Missing Variables](#troubleshoot-missing-variables)

---

## Check Current Environment

View current state:

```bash
# Check if .env exists
ls -la .env*

# View non-secret values (be careful)
grep -v "KEY\|SECRET\|PASSWORD\|TOKEN" .env

# Verify specific variable is set
echo $DATABASE_URL | head -c 20  # Show prefix only

# Check what's required
cat .env.example
```

Why: Understanding current state prevents errors.

---

## Add New Environment Variable

Add to all required files:

1. **Add to `.env.example`** (template):
```bash
# .env.example
NEW_API_KEY=your-api-key-here
```

2. **Add to local `.env`**:
```bash
# .env (not committed)
NEW_API_KEY=actual-value-here
```

3. **Add validation** (if using Zod):
```typescript
// src/env.ts
const envSchema = z.object({
  NEW_API_KEY: z.string().min(1),
});
```

4. **Update deployment config**:
```yaml
# deployment config (Vercel, etc.)
env:
  NEW_API_KEY: ${NEW_API_KEY}
```

Why: All locations must be updated for consistency.

---

## Update Existing Variable

Change variable value:

```bash
# Local - edit .env file
# Use editor, don't echo secrets to terminal

# Vercel
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production

# Heroku
heroku config:set VARIABLE_NAME=new-value --app my-app

# AWS Parameter Store
aws ssm put-parameter --name "/app/VARIABLE_NAME" --value "new-value" --overwrite
```

Why: Different platforms have different update methods.

---

## Sync Environment Across Stages

Ensure consistency:

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `API_URL` | localhost:3000 | staging.api.com | api.com |
| `DB_URL` | local-db | staging-db | prod-db |
| `LOG_LEVEL` | debug | info | warn |

```bash
# Compare environments
diff <(vercel env ls development) <(vercel env ls production)

# Copy from one env to another (carefully)
vercel env pull .env.staging --environment=staging
```

Why: Environment drift causes deployment issues.

---

## Troubleshoot Missing Variables

Debug missing vars:

```bash
# Check if loaded
node -e "console.log(process.env.VARIABLE_NAME)"

# Check .env file format (no spaces around =)
grep "VARIABLE_NAME" .env

# Verify dotenv is loading
node -e "require('dotenv').config(); console.log(process.env.VARIABLE_NAME)"

# Check for typos
grep -i "variable" .env .env.example
```

Common issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| Undefined | Not in .env | Add to .env |
| Empty string | Trailing space | Remove spaces |
| Wrong value | Wrong .env file | Check file loading order |
| Works locally, fails deployed | Not in deployment config | Add to platform env |

Why: Systematic debugging finds root cause.

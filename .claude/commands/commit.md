---
name: commit
emoji: 💾
description: Creates a git commit following conventional commit format. Use when committing changes with proper message formatting.
---

# Commit

Create conventional commit with proper formatting.

## Contents

- [Stage Changed Files Selectively](#stage-changed-files-selectively)
- [Use Conventional Commit Format](#use-conventional-commit-format)
- [Include Scope When Applicable](#include-scope-when-applicable)
- [Write Descriptive Body for Complex Changes](#write-descriptive-body-for-complex-changes)
- [Reference Issues in Footer](#reference-issues-in-footer)

---

## Stage Changed Files Selectively

Stage specific files:

```bash
# Check status first
git status

# Stage specific files (preferred)
git add src/feature.ts src/feature.test.ts

# Avoid staging everything blindly
# git add .  # Use with caution
```

Why: Selective staging keeps commits focused.

---

## Use Conventional Commit Format

Format: `<type>(<scope>): <description>`

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructure (no behavior change) |
| `test` | Adding/updating tests |
| `chore` | Build, tooling, deps |
| `perf` | Performance improvement |

Examples:
```
feat(auth): add OAuth2 login support
fix(api): handle null response from payment service
docs(readme): update installation instructions
refactor(utils): extract date formatting to shared module
```

Why: Conventional commits enable automated changelog generation.

---

## Include Scope When Applicable

Scope indicates affected area:

```
feat(auth): add login
feat(payments): add Stripe integration
fix(ui/button): correct hover state
```

Common scopes:
- `api`, `ui`, `db`, `auth`
- Feature names: `payments`, `users`, `orders`
- Package names in monorepos

Why: Scope helps filter commits by area.

---

## Write Descriptive Body for Complex Changes

For non-trivial changes:

```
feat(api): add rate limiting to public endpoints

Implement token bucket algorithm with:
- 100 requests per minute for authenticated users
- 20 requests per minute for anonymous users
- Redis-backed counter for distributed environments

Configurable via RATE_LIMIT_* environment variables.
```

Why: Body explains context that title cannot convey.

---

## Reference Issues in Footer

Link related issues:

```
fix(checkout): prevent duplicate order submission

Add idempotency key to order creation endpoint.
Debounce submit button on frontend.

Fixes #234
Refs #198
```

Footer keywords:
- `Fixes #N` - Closes issue when merged
- `Refs #N` - References without closing
- `Co-authored-by: Name <email>`

Why: Issue links connect commits to tracked work.

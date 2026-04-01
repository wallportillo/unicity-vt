---
name: pr
emoji: 🔀
description: Creates a pull request with proper title, description, and checklist. Use when opening a PR for code review.
---

# PR

Create pull request with structured description.

## Contents

- [Ensure Branch is Ready](#ensure-branch-is-ready)
- [Write Descriptive PR Title](#write-descriptive-pr-title)
- [Structure PR Description](#structure-pr-description)
- [Add Review Checklist](#add-review-checklist)
- [Request Appropriate Reviewers](#request-appropriate-reviewers)

---

## Ensure Branch is Ready

Before creating PR:

```bash
# Ensure branch is pushed
git push -u origin feature/my-branch

# Rebase on latest main if needed
git fetch origin
git rebase origin/main

# Verify CI passes locally
pnpm type-check && pnpm lint && pnpm test
```

Why: Clean branch history simplifies review.

---

## Write Descriptive PR Title

Format: `<type>(<scope>): <description>`

Match conventional commit format:
```
feat(auth): add password reset flow
fix(api): handle timeout in payment webhook
refactor(db): migrate to connection pooling
```

Why: PR title becomes merge commit message.

---

## Structure PR Description

Use template:

```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- Added X to handle Y
- Updated Z to support W
- Removed deprecated A

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases verified

## Screenshots (if UI changes)
| Before | After |
|--------|-------|
| img    | img   |

## Related Issues
Fixes #123
Refs #456
```

Why: Structured description speeds up review.

---

## Add Review Checklist

Include verification items:

```markdown
## Checklist
- [ ] Code follows project conventions
- [ ] Types are properly defined (no `any`)
- [ ] Error handling is comprehensive
- [ ] Tests cover new functionality
- [ ] Documentation updated if needed
- [ ] No secrets or credentials committed
```

Why: Checklist ensures consistent PR quality.

---

## Request Appropriate Reviewers

Select reviewers based on:

| Change Area | Reviewers |
|-------------|-----------|
| API changes | Backend team lead |
| UI changes | Frontend team lead |
| Database | DBA or data team |
| Security | Security reviewer |
| Infrastructure | DevOps |

```bash
# Create PR with reviewers
gh pr create --reviewer @user1,@user2
```

Why: Right reviewers provide relevant feedback.

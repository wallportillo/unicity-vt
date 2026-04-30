---
name: create-pr
emoji: 🚀
description: Creates a GitHub PR for the current branch. Use when a developer says "/create-pr", "open a PR", "push a PR", "create pull request", or after finishing implementation and ready for review.
---

# Create PR

Creates a pull request for the current branch on `Unicity/Unicity-Support`.

## Non-Negotiables

- Never add "Generated with Claude Code" or Co-Authored-By trailers to the PR body
- Default to `--draft` — only mark ready after the developer confirms
- Never push to `main` directly

## Contents

- [Collect Branch Context First](#collect-branch-context-first)
- [Write a Clear Summary](#write-a-clear-summary)
- [Push Then Create with gh](#push-then-create-with-gh)
- [Report the PR URL](#report-the-pr-url)
- [Gate — Draft vs Ready](#gate--draft-vs-ready)

---

## Collect Branch Context First

Before writing the PR, gather:

```bash
git branch --show-current
git log --oneline main..HEAD
git diff --stat main..HEAD
```

Also read `.claude/active-ticket` if it exists to get the ClickUp ticket ID.

---

## Write a Clear Summary

The PR body needs:

1. **1–3 sentences** describing what changed and why
2. **ClickUp link** if a ticket applies

```markdown
## Summary

[What this PR does and why — 1–3 sentences focused on the change, not the implementation.]

**ClickUp**: https://app.clickup.com/t/CO-XXXX
```

If no ticket applies, omit the ClickUp line or write `**ClickUp**: N/A`.

---

## Push Then Create with gh

```bash
# 1. Push the branch
git push -u origin HEAD

# 2. Create the PR (draft by default)
gh pr create --draft \
  --title "CO-XXXX: [short description]" \
  --body "$(cat <<'EOF'
## Summary

[1–3 sentence description of what changed and why.]

**ClickUp**: https://app.clickup.com/t/CO-XXXX
EOF
)"
```

**Title format:**
- With ticket: `CO-XXXX: short description`
- Without ticket: `feat: short description` or `fix: short description`

---

## Report the PR URL

When done, output the PR URL:

```
<pr-created>https://github.com/Unicity/Unicity-Support/pull/NNN</pr-created>
```

---

## Gate — Draft vs Ready

Default to `--draft`. Mark ready only when:

1. Type-check and tests pass locally (`npm run type-check && npm test`)
2. The developer has reviewed the summary and confirms it's ready

Then:
```bash
gh pr ready [PR_NUMBER]
```

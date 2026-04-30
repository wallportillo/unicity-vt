---
name: pr-review-github
emoji: 🧪
description: Reviews a GitHub PR and returns the review body in chat. Use when performing a manual PR review from the terminal or when asked to "review the PR", "check the PR", or "review pull request NNN".
---

# PR Review (GitHub)

Reviews a PR and returns the review body in chat — does not post to GitHub unless explicitly asked.

## Contents

- [Gather the Diff and Context](#gather-the-diff-and-context)
- [Review Against the Skill Checklist](#review-against-the-skill-checklist)
- [Report Findings by Severity](#report-findings-by-severity)
- [Return in Chat, Post Only on Request](#return-in-chat-post-only-on-request)

---

## Gather the Diff and Context

```bash
# Get PR metadata and diff
gh pr view [PR_NUMBER] --json title,body,files,commits
gh pr diff [PR_NUMBER]
```

Also read the relevant skill files for the areas touched:
- Changed `server/index.ts` → load `writing-express-apis`, `processing-ach-payments`, `securing-code`
- Changed `src/components/` → load `writing-react`, `displaying-errors`, `managing-csr-workflows`
- Changed `src/services/` → load `implementing-client-services`
- Changed `.env.example` → load `configuring-environments`

---

## Review Against the Skill Checklist

For each changed file, check the relevant skill patterns. Flag violations as blockers or suggestions.

**Always check:**
- No sensitive data in logs (`configuring-logging`)
- No full account numbers stored or displayed (`securing-code`, `persisting-transaction-history`)
- Consistent error response shapes (`writing-express-apis`, `displaying-errors`)
- Credentials from env vars only (`securing-code`, `configuring-environments`)
- Typed `req.body` assignments (`writing-express-apis`)
- `isFormValid` derived, not duplicated (`validating-payment-forms`)

---

## Report Findings by Severity

Format findings with three levels:

```
## 🤖 PR Review

### ❌ Blockers (must fix before merge)
- `server/index.ts:142` — Full account number logged: `console.log(body.accountNumber)`
  Violates: `securing-code` → Never Log Sensitive Payment Data

### ⚠️ Suggestions (should fix)
- `server/index.ts:89` — `req.body.field` used inline instead of typed assignment
  See: `writing-express-apis` → Avoid Untyped req.body

### 👍 Looks good
- Error response shapes are consistent across all new routes
- Credentials read from process.env with empty-string fallback
```

Include file:line references for every finding.

---

## Return in Chat, Post Only on Request

Output the full review body in chat. State clearly:

- Whether it would create a new comment or update an existing one
- Whether there are any blockers

Only post to GitHub if the developer explicitly says "post the review" or "submit it".

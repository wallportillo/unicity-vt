---
name: rebase
emoji: 🌿
description: Rebases the current branch onto master by following the repo rebase workflow in order. Use when the branch needs to be updated against latest master.
---

# Rebase

## Contents

- [Capture Branch Intent First](#capture-branch-intent-first)
- [Apply Safety Rules Throughout](#apply-safety-rules-throughout)
- [Rebase Onto Latest Master](#rebase-onto-latest-master)
- [Resolve Conflicts By Intent](#resolve-conflicts-by-intent)
- [Verify Locally Before Pushing](#verify-locally-before-pushing)
- [Push With Force-With-Lease](#push-with-force-with-lease)

---

## Capture Branch Intent First

Collect branch context:
- `git branch --show-current`
- `git log --oneline master..HEAD`
- `git diff --stat master..HEAD`
- optional: `gh pr view --json title,body`

---

## Apply Safety Rules Throughout

Safety rules:
- Never push to `master` or `main`.
- If conflict resolution is unclear, stop and ask the user before continuing.
- If `git push --force-with-lease` fails because someone else pushed, stop and notify the user.

---

## Rebase Onto Latest Master

Run:
- `git fetch origin`
- `git rebase origin/master`

---

## Resolve Conflicts By Intent

Resolve conflicts based on branch intent, then continue:
- `git add <file>`
- `git rebase --continue`

---

## Verify Locally Before Pushing

Run:
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

---

## Push With Force-With-Lease

Push safely:
- `git push --force-with-lease`

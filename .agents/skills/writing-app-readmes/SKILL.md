---
name: writing-app-readmes
emoji: 🚀
description: Writes READMEs for runnable applications. Use when creating or updating apps/*/README.md.
---

# Writing App READMEs

How to run the app. For runnable applications (not shared libraries).

## Contents

- [Use One-Sentence Description](#use-one-sentence-description)
- [Include Quick Start](#include-quick-start)
- [Include Environment Variables](#include-environment-variables)
- [Point to Skills for Patterns](#point-to-skills-for-patterns)
- [Keep READMEs Thin and Procedural](#keep-readmes-thin-and-procedural)

---

## Use One-Sentence Description

Start with a single sentence explaining what the app does.

---

## Include Quick Start

How to run locally. Developers want to run, not read.

---

## Include Environment Variables

Required config and where to get values. Apps have config requirements that packages don't.

---

## Point to Skills for Patterns

Reference relevant skills for development patterns. Teaching content is centralized in skills, not duplicated in READMEs.

**READMEs vs Skills**: READMEs = what + setup (for humans discovering). Skills = how + why + patterns (for AI working).

---

## Keep READMEs Thin and Procedural

No duplication with skills. Single source of truth. Procedural focus - steps to get running.

---

## Example

```markdown
# App Name

One sentence description.

## Quick Start
pnpm dev

## Environment Variables
Required env vars and where to get them.

## Patterns
See `configuring-environments` skill.
```

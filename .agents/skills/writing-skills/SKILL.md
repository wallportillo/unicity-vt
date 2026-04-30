---
name: writing-skills
emoji: 🧠
description: Writes Claude Code skills for AI-assisted development patterns. Use when creating or updating .agents/skills/*/SKILL.md, reviewing a skill for quality, or when the developer says "fix this skill", "groom this skill", or "the skill is too long".
---

# Writing Skills

Development patterns for AI assistance. See [Anthropic's skill documentation](https://docs.anthropic.com/en/docs/claude-code/skills) for basics (frontmatter, file structure).

## Contents

- [Keep SKILL.md Under 200 Lines](#keep-skillmd-under-200-lines)
- [Use Sibling Files for Heavy Content](#use-sibling-files-for-heavy-content)
- [Lead with Non-Negotiables](#lead-with-non-negotiables)
- [Gate Phases with Human Approval](#gate-phases-with-human-approval)
- [Include Concrete Match Phrases in Description](#include-concrete-match-phrases-in-description)
- [Use Frontmatter with Trigger Phrase](#use-frontmatter-with-trigger-phrase)
- [Use Table of Contents as Code Review Checklist](#use-table-of-contents-as-code-review-checklist)
- [Name Patterns with Verb Phrases](#name-patterns-with-verb-phrases)
- [Scope Skills to This Codebase](#scope-skills-to-this-codebase)
- [Group Related Patterns Under Combined Titles](#group-related-patterns-under-combined-titles)
- [Reference Framework in Title When Framework-Specific](#reference-framework-in-title-when-framework-specific)

---

## Keep SKILL.md Under 200 Lines

A SKILL.md is an index, not a manual. If it grows past ~200 lines, the weight is crowding out the actual working context on every invocation. Split heavy content into sibling files (see next pattern).

Why: every line of SKILL.md is read on trigger, regardless of whether it's needed this time. Short skills stay fast and cheap; long skills burn context on material the current task doesn't touch.

---

## Use Sibling Files for Heavy Content

Large subagent prompts, PR templates, checklist blocks, example diffs, and anything longer than ~30 lines belong in sibling files next to SKILL.md, referenced on demand:

```
.agents/skills/my-skill/
├── SKILL.md              (index, gates, step order)
├── prompts/
│   ├── explorer.md       (full subagent prompt, loaded when spawning)
│   └── reviewer.md
└── templates/
    └── ticket.md         (ClickUp description template)
```

SKILL.md says "Spawn the explorer with the prompt from `prompts/explorer.md`, substituting the ticket name." The spawner reads the file only when it's needed.

Why: progressive disclosure keeps the cheap always-loaded part small, and the expensive part local to where it's used. The same pattern the Anthropic reference skills (`pdf`, `docx`, `pptx`) apply.

---

## Lead with Non-Negotiables

If a skill has hard prohibitions — things it must never do, or outputs it must never produce — put them in a `## Non-Negotiables` block directly under the title, **before** the numbered steps. Example:

```markdown
# /work-plan

## Non-Negotiables
- Never write code. Output is a ClickUp ticket only.
- Never create a PR. PR creation belongs to `/work-do`.
- Never skip Step 3 approval. The developer must approve the plan before any ticket update.
```

Why: prohibitions buried in step 4 get missed. Corrections the user has made ("don't do X again") belong here — this is where the ratchet accumulates. Anything in user memory that reads "never do X in this skill" should be lifted into a Non-Negotiables block in the skill itself, so a teammate without that memory still gets the rule.

---

## Gate Phases with Human Approval

Skills that span multiple phases (plan → execute, design → implement, implement → verify) must stop and confirm between phases. Mark the gate explicitly:

```markdown
### Gate — developer approval required

Present the plan. Do not proceed to Step 4 until the developer approves.
```

Why: agents rationalize their own work. A gate forces a fresh human read before the next phase commits changes that are hard to undo.

---

## Include Concrete Match Phrases in Description

The description's `Use when` clause should list the verbatim phrases a developer would say, not a category. Compare:

- Bad: `Use when planning work.`
- Good: `Use when a developer says "/work-plan", "plan work", "groom", "I want to build", "let's plan", describes a feature to build, or wants to shape work before implementation.`

Why: Claude matches the description against the user's actual words. Concrete phrases trigger reliably; categorical descriptions miss paraphrases.

---

## Use Frontmatter with Trigger Phrase

Every skill needs frontmatter with name, emoji, and description. The description must include a "Use when..." trigger phrase so AI knows when to apply the skill.

```yaml
---
name: skill-name
emoji: 🧠
description: Brief description. Use when [trigger condition with concrete match phrases].
---
```

---

## Use Table of Contents as Code Review Checklist

The Contents section serves dual purpose: navigation AND a checklist for code review. Every item must be a pattern or anti-pattern, named as something verifiable:

- "Use Distinct Log Keys by Direction" — actionable, verifiable
- ~~"Log Key Convention"~~ — categorical, describes what not what to do
- "Avoid Filtering Utilities in Client Packages" — anti-pattern, clear
- ~~"Architecture Overview"~~ — category, not enforceable

---

## Name Patterns with Verb Phrases

Each pattern is effectively an Acceptance Criteria for code. Name them with verb phrases ("Use X", "Implement Y", "Avoid Z"). When reasonable, explain why the pattern is a good or bad idea.

Why:
- Single source of truth → patterns defined once, used everywhere
- Teachable to AI → structured for machine comprehension
- Evolves with codebase → skills update as patterns change
- Table of Contents is effectively a checklist for code review

---

## Scope Skills to This Codebase

- One skill per domain (e.g., `developing-nextjs`, `writing-domain-logic`)
- Description includes "Use when..." trigger so AI knows when to apply
- Patterns specific to this codebase, not general knowledge

---

## Group Related Patterns Under Combined Titles

When a single example explains multiple patterns, make a pattern title that explains the multiple patterns, then reference specific patterns in the example and group the explanations.

---

## Reference Framework in Title When Framework-Specific

Next.js is a framework, and patterns should reference it in the title when framework-specific. For example: "Use Pattern X (Next.js)" instead of just "Use Pattern X".

---

## Example

```markdown
---
name: skill-name
emoji: 🧠
description: Brief description. Use when [trigger phrase with concrete match phrases a developer would say].
---

# Skill Name

One line purpose.

## Non-Negotiables
- [Things this skill must never do]
- [Corrections ratcheted in from past mistakes]

## Contents
- [Use Pattern 1 for X](#use-pattern-1-for-x)
- [Implement Pattern 2 When Y](#implement-pattern-2-when-y)
- [Avoid Anti-Pattern Z](#avoid-anti-pattern-z)

---

## Use Pattern 1 for X (Next.js)

[Pattern explanation, example]

Why: [reasoning]

---

## Avoid Anti-Pattern Z

[Explanation of what NOT to do, with example]

Why: [reasoning for why this is problematic]
```

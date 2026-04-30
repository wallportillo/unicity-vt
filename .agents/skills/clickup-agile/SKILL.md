---
name: clickup-agile
emoji: 🏃
description: Team agile conventions for ClickUp — hierarchy, sprint board rules, ticket format, and status flow. Required reading before any ticket-pull or ticket-upsert operation. Load this skill whenever creating, grooming, or moving tickets in ClickUp.
---

# ClickUp Agile Conventions

This is the team's source of truth for how we use ClickUp. The `ticket-pull` and `ticket-upsert` skills both depend on these rules.

---

## Hierarchy

```
Epic (stakeholder-readable, quarterly goal)
  └── Story (stakeholder-readable, deliverable unit of value)
        └── Task (optional — dev work unit, only when story needs splitting)
```

- **Epics** group related stories toward a quarterly goal. Stakeholders read these.
- **Stories** describe a deliverable outcome. Written so a PM or QA can understand what's being built and why. Most stories are self-contained — they don't need child tasks.
- **Tasks** are dev work units that only exist when a story naturally splits into independent, reviewable chunks (different PRs, different areas of the codebase). Don't create a task just to have something on the sprint board.

---

## Board Rules

### Home List
Epic Roadmap (`901706070974`) is the **home list** for all epics, stories, and tasks. Everything is created here. Nothing ever leaves it — items are **added to** other lists, never moved out.

### What Goes on the Sprint Board

| Item type | Has children? | Sprint board behavior |
|-----------|--------------|----------------------|
| Epic | — | Never on sprint board |
| Story | No children | **Added to sprint** via `add_task_to_list`. This is the common case. |
| Story | Has child tasks | Stays on roadmap only. Children go on sprint. |
| Task | — | Added to sprint via `add_task_to_list` |

The key insight: **most work is a single story without child tasks.** Don't create a child task just to put something on the board — put the story itself on the board. Only break into tasks when the work genuinely splits into independent pieces.

### Sprint Flow
1. Items start on Sprint Planning (`900601650711`) — this is the backlog/ready queue.
2. When the sprint starts, items move (not add) from Sprint Planning into the active sprint list inside the Checkout Sprints folder (`90171949737`).

### Adding to Sprint
Use `add_task_to_list` — this adds the item to the sprint list while keeping its home on the Epic Roadmap:
```
clickup_add_task_to_list(task_id="CO-XXXX", list_id="900601650711")
```

---

## Ticket Format

### Story Description (stakeholder-facing)

```markdown
## Context
[Why this work exists — problem statement, user impact, business driver]

## Behavior
1. [trigger] → [outcome]
2. [trigger] → [outcome]

## Verify
- [ ] [test step] → [expected result] (covers B1)
- [ ] [test step] → [expected result] (covers B2)

## Design Doc Changes
[List of docs to update/create, or "None"]
```

- **Behavior**: stakeholder-readable, QA-testable. Describes WHAT happens, not HOW.
- **Verify**: actionable test steps that reference behaviors. QA uses these to confirm the work is done.
- **Design Doc Changes**: explicitly lists doc impact. Most tickets say "None" — don't force documentation for every change.
- **Context**: preserve whatever the PM wrote. Don't overwrite it.

### Tech Specs (dev-facing)

Tech specs go in a **comment**, not the description. They bloat the ticket and aren't useful for QA or stakeholders:

```
clickup_create_task_comment(
  task_id="CO-XXXX",
  comment_text="## Tech Specs\n\n### Implementation Plan\n...\n\n### Files to Modify\n...\n\n### Patterns to Follow\n..."
)
```

### Tasks (children of stories)

When a story has child tasks, each task gets its own Behavior/Verify that's scoped to that task's piece of work. The task's Behavior/Verify should be a subset or refinement of the parent story's.

---

## Status Flow

```
dev ready → in development → code review → ready for qa → ext dependency → ready to release → released → closed
```

- Only move forward.
- One exception: **code review → in development** (PR changes requested).
- Check current status before updating — don't set a status that's already set.

---

## Don't Spam

- Check current field values before updating — don't write what's already there.
- Batch field updates into single `clickup_update_task` calls.
- Only comment on meaningful events: PR created, status change with context, verification proof.
- Don't create duplicate comments or redundant status updates.

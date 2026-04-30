---
name: ticket-pull
emoji: 📥
description: Fetches a ClickUp ticket (CO-XXXX) and writes a local scratchpad at .claude/plans/CO-XXXX.md so downstream planning and implementation skills consume it from disk. Use when a developer says "/ticket-pull", "pull the ticket", "load CO-XXXX", "fetch the ticket", "start from ticket", or "resume work on CO-XXXX".
---

# /ticket-pull

Bootstrap a local scratchpad from a ClickUp ticket so `/work-plan` and `/work-do` can read ticket state from disk instead of re-fetching.

## Non-Negotiables

- **Never edit source code.** This skill only writes `.claude/plans/*.md` and `.claude/active-ticket`.
- **Never open PRs.** PR creation belongs to `/work-do`.
- **Never overwrite a Notes section.** If `.claude/plans/CO-XXXX.md` already exists, preserve the developer's `## Notes` scratch verbatim.
- **Stop on Epic.** If the fetched task is an Epic, do not write a scratchpad — tell the developer to pick a Story or Task under it.

## Contents

- [Load clickup-agile First](#load-clickup-agile-first)
- [Resolve the Ticket ID](#resolve-the-ticket-id)
- [Fetch and Guard Against Epics](#fetch-and-guard-against-epics)
- [Preserve Existing Notes](#preserve-existing-notes)
- [Write the Scratchpad](#write-the-scratchpad)
- [Pin the Active Ticket](#pin-the-active-ticket)
- [Advance Status to In Development](#advance-status-to-in-development)
- [Report the Write Locations](#report-the-write-locations)

---

## Load clickup-agile First

Load the `clickup-agile` skill before anything else. It owns hierarchy rules (Epic → Story → Task), status flow, and list IDs. Don't duplicate those rules here — defer to that skill.

---

## Resolve the Ticket ID

Resolve in this order — stop at the first hit:

1. Explicit arg (e.g. `/ticket-pull CO-5432`). Accept `CO-XXXX` form, case-insensitive.
2. Read `.claude/active-ticket` (single line, `CO-XXXX`).
3. Ask the developer for the ID. Do not guess.

---

## Fetch and Guard Against Epics

```
clickup_get_task(task_id="CO-XXXX", subtasks=true)
```

- If `custom_item_id` or task type resolves to **Epic**, stop. Respond: "CO-XXXX is an Epic — pick a Story or Task under it and re-run."
- Otherwise continue. Capture: `name`, `status`, `parent` (id + name if present), and the description body.

From the description, extract the three sections `## Behavior`, `## Verify`, `## Design Doc Changes`. If a section is missing, write the literal string `_(not in ticket)_` under it. If `## Design Doc Changes` is absent, write `None`.

---

## Preserve Existing Notes

Before writing, check `.claude/plans/CO-XXXX.md`:

- If it exists, read it and extract everything from the `## Notes` heading to EOF. That block is the developer's scratch — it must round-trip unchanged.
- If it doesn't exist, seed `## Notes` with an empty body (a single blank line).

Never merge, reformat, or summarize the existing Notes block. Copy bytes.

---

## Write the Scratchpad

Write to `.claude/plans/CO-XXXX.md` with exactly this structure:

```markdown
# CO-XXXX — <name>

**Status**: <status>  |  **Parent**: <parent link or N/A>  |  **URL**: https://app.clickup.com/t/CO-XXXX

## Behaviors
<verbatim content of ticket's ## Behavior section>

## Verify
<verbatim content of ticket's ## Verify section>

## Design Doc Changes
<verbatim content, or "None">

## Notes
<preserved from prior file, else empty>
```

- Parent link format: `CO-YYYY — <parent name>` when a parent exists, else `N/A`.
- Create `.claude/plans/` if it doesn't exist. The directory is gitignored scratch space — do not commit it.

---

## Pin the Active Ticket

Write `CO-XXXX\n` to `.claude/active-ticket` (overwrite). This is the fallback the next invocation resolves from.

---

## Advance Status to In Development

Check the status returned by `clickup_get_task`.

- If status is earlier than or equal to `dev ready` in the flow defined by `clickup-agile`, bump it:
  ```
  clickup_update_task(task_id="CO-XXXX", status="in development")
  ```
- If status is already `in development` or later, skip. Never move backwards. Never re-set a status that's already set (see `clickup-agile` — "Don't Spam").

---

## Report the Write Locations

End with a concise report:

- Ticket: `CO-XXXX — <name>` (status → <new or unchanged>)
- Wrote: `.claude/plans/CO-XXXX.md`
- Pinned: `.claude/active-ticket`
- Notes preserved: yes/no (only say yes when a prior file existed with non-empty Notes)

No gate needed — this skill is a read-mostly bootstrap. The only remote write is the optional status bump, which follows `clickup-agile`'s forward-only rule.

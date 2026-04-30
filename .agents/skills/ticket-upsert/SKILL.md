---
name: ticket-upsert
emoji: 📤
description: Creates or updates a ClickUp ticket to match the current state of the conversation — grooming AC before implementation, syncing drift after implementation, and attaching verification artifacts. Does NOT write implementation details to ClickUp. Use when a developer says "/ticket-upsert", "upsert ticket", "create ticket", "update ticket", "groom ticket", "sync ticket", "attach verification", "post verify to ClickUp", or "ship the ticket".
---

# /ticket-upsert

Keep the ClickUp ticket in sync with reality — before code (groom AC from a description) and after code (catch AC drift, attach verification). Tickets are stakeholder-facing; implementation details never go back to ClickUp.

## Non-Negotiables

- **No tech specs in ClickUp.** Never write implementation details, file lists, subagent prompts, or "patterns to follow" to the ticket description or comments. Stakeholder-facing only.
- **Preserve the `## Context` section verbatim.** It belongs to the PM. Do not rewrite, summarize, or "improve" it.
- **Never edit source code.** This skill only writes ClickUp and reads `.claude/plans/` and `.claude/verify/`.
- **Explicit developer approval before any ClickUp write.** Always show the diff, always ask via `AskUserQuestion`.

## Contents

- [Load clickup-agile First](#load-clickup-agile-first)
- [Choose Create-or-Find vs Update Path](#choose-create-or-find-vs-update-path)
- [Create-or-Find: Search Before Creating](#create-or-find-search-before-creating)
- [Update: Diff Against the Scratchpad](#update-diff-against-the-scratchpad)
- [Gate — Developer Approval Before Write](#gate--developer-approval-before-write)
- [Maintain Design Doc Changes Section](#maintain-design-doc-changes-section)
- [Attach Verification Artifacts Post-Ship](#attach-verification-artifacts-post-ship)
- [Transition Status Only Forward](#transition-status-only-forward)

---

## Load clickup-agile First

Load `clickup-agile`. It is authoritative for:

- Ticket format (`## Context` / `## Behavior` / `## Verify` / `## Design Doc Changes`).
- Status flow (forward-only, one exception).
- List IDs: Epic Roadmap `901706070974` (home), Sprint Planning `900601650711`, Checkout Sprints folder `90171949737`.
- "Don't Spam" — check current values before writing.

Also load the `AskUserQuestion` tool — this skill gates every write behind it.

---

## Choose Create-or-Find vs Update Path

Inputs decide the path:

- **Ticket ID given (e.g. `CO-5432`)** → Update path.
- **Free-text description given, no ID** → Create-or-find path.
- **Neither** → ask the developer which.

---

## Create-or-Find: Search Before Creating

1. Extract 3–6 keywords from the description.
2. Search for duplicates:
   ```
   clickup_search(keywords="<keywords>")
   ```
3. Show up to 5 matches (ID, name, status) to the developer. Ask via `AskUserQuestion`:
   - "Use an existing ticket? Which CO-XXXX?"
   - "Or create new?"
4. If creating new, ask only two things:
   - Short name (used as task title).
   - Product area — one of: Checkout, Payment, ChannelSync, Shop, Enrollment. Sets the Product custom field.
5. Create in the Epic Roadmap home list `901706070974` as task type `Story` with a skeletal description:

   ```markdown
   ## Context
   <developer's free-text description, verbatim>

   ## Behavior
   - TBD

   ## Verify
   - TBD

   ## Design Doc Changes
   None
   ```

   Do not flesh out Behavior/Verify here — that's `/work-plan`'s job. The skeleton is a handoff, not a spec.

6. Set the Product custom field to the chosen area.
7. Report the new `CO-XXXX` so the developer can `/ticket-pull` it next.

---

## Update: Diff Against the Scratchpad

1. Fetch current state:
   ```
   clickup_get_task(task_id="CO-XXXX", subtasks=true)
   ```
2. Read `.claude/plans/CO-XXXX.md` (the scratchpad written by `/ticket-pull`). If missing, fall back to the conversation.
3. Build a three-way picture:
   - Ticket's current `## Behavior` and `## Verify` sections.
   - Scratchpad's `## Behaviors` and `## Verify` sections.
   - Anything new the conversation established (drift discovered during implementation, renamed scenarios, removed AC).
4. Produce a unified diff of what would change in the ticket description. Sections to diff:
   - `## Behavior` — numbered, scenario-based. Format per `clickup-agile`: `N. [trigger] → [outcome]`.
   - `## Verify` — checkboxed, each step references a `B#`. Format per `clickup-agile`: `- [ ] [step] → [expected] (covers B1)`.
   - `## Design Doc Changes` — see section below.
5. **Preserve `## Context` verbatim.** Never include it in the diff. If the scratchpad's Context differs, ignore — the PM owns that field.

---

## Gate — Developer Approval Before Write

Present the diff. Ask via `AskUserQuestion`:

- "Apply this diff to CO-XXXX's description?" — yes / edit / cancel.

Only proceed on explicit `yes`. On `edit`, loop: incorporate the developer's notes and re-present the diff. On `cancel`, stop with no writes.

When approved, write via a single `clickup_update_task` call with the new description. Do not chain multiple partial updates.

---

## Maintain Design Doc Changes Section

- If the change touched documented behavior in `apps/*/docs/`, list the exact doc changes — `update apps/global-checkout/docs/<feature>.md` or `create apps/channel-sync/docs/<feature>.md`. One bullet per doc.
- If no docs are affected, write `None`. Don't invent doc work.
- If the section is currently `None` and still should be, don't rewrite it (see `clickup-agile` — "Don't Spam").

---

## Attach Verification Artifacts Post-Ship

After the description update settles, scan `.claude/verify/<CO-XXXX>/`:

- **No files** → skip. Report: "no verification artifacts found in `.claude/verify/CO-XXXX/`; skipping comment."
- **Files present** → "post-ship" mode. Do the following:
  1. Find the PR URL:
     ```
     gh pr view --json url,number,title
     ```
     If no PR on the current branch, omit the URL and note it in the report.
  2. Build a `## Verification` comment body:
     - Header line with PR URL (when available).
     - One bullet per `## Verify` step from the ticket, noting what was observed. Keep it stakeholder-readable — no stack traces, no file paths outside screenshots. Reference the attached artifact by filename.
  3. Check existing comments — if a prior `## Verification` comment exists from this skill, update its body semantically by posting a single new comment prefixed `## Verification (updated <date>)`. Do not spam one comment per run.
  4. Post the comment:
     ```
     clickup_create_task_comment(task_id="CO-XXXX", comment_text="<body>")
     ```
  5. Attach each file:
     ```
     clickup_attach_task_file(task_id="CO-XXXX", file_path=".claude/verify/CO-XXXX/<file>")
     ```

Detect post-ship state by the presence of files in `.claude/verify/<CO-XXXX>/`. That directory is written by verification skills (e.g. `verify-channel-sync-pr`) and by the developer dropping screenshots.

---

## Transition Status Only Forward

After a successful post-ship run (artifacts attached, PR exists):

- If current status is `in development` or earlier, bump to `code review`:
  ```
  clickup_update_task(task_id="CO-XXXX", status="code review")
  ```
- If current status is already `code review` or later, skip.
- Never set a status that's already set. Never move backwards — the one exception (`code review → in development` on requested changes) is owned by `/work-do`, not this skill.

For pre-ship grooming runs (no artifacts), do not touch status — grooming AC is not a phase transition.

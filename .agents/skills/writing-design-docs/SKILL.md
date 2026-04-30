---
name: writing-design-docs
emoji: 📄
description: Writes system design docs organized by features with Purpose/Behavior/Verify. Use when creating or updating files in docs/.
---

# Writing Design Docs

System design docs live in `docs/` at the repo root. Each doc describes a cross-cutting system organized by features.

## Contents

- [Use Purpose/Behavior/Verify for Each Feature](#use-purposebehaviorverify-for-each-feature)
- [Declare Non-goals Explicitly](#declare-non-goals-explicitly)
- [Write Behaviors as Plain-Language Scenarios](#write-behaviors-as-plain-language-scenarios)
- [Number Behaviors for Multiple Scenarios](#number-behaviors-for-multiple-scenarios)
- [Reference Behaviors in Verify Steps](#reference-behaviors-in-verify-steps)
- [End Document After Last Feature](#end-document-after-last-feature)
- [Avoid Implementation Code in Design Docs](#avoid-implementation-code-in-design-docs)

---

## Use Purpose/Behavior/Verify for Each Feature

Every feature section follows the same three-part structure:

| Section | Type | Example |
|---|---|---|
| Purpose | Intent (WHO + WHY) | "Allow CSRs to process ACH payments over the phone" |
| Behavior | Outcomes (WHAT) | "CSR enters routing number → bank name auto-fills" |
| Verify | Test steps (HOW) | "Enter 021000021 → confirm 'JPMorgan Chase' appears" |

**Format:**

**Overview**: 1-2 sentences covering what the system does.

**Non-goals** (optional): cross-cutting scope constraints.

**Features ToC**: Links to each feature section.

**Features**: Each feature has Purpose, Behavior, Verify.

Why: Purpose captures intent, Behavior is human-readable and testable, Verify gives explicit steps. No implementation code means docs stay accurate as the codebase evolves.

---

## Declare Non-goals Explicitly

Non-goals declare what this system deliberately **does not** do. Always use the term "Non-goals" — never "Out of scope" or synonyms.

```markdown
## Non-goals

- **Not a payment retry system** — one submit = one CSR-initiated attempt.
- **Not a customer database** — we don't persist customer records, only transaction logs.
```

Rules:
1. Bold the negation, short reason
2. 4 items max
3. Only include if someone has actually asked or is likely to

---

## Write Behaviors as Plain-Language Scenarios

Every behavior follows: **trigger → outcome**. Both halves are required.

**Good behaviors:**
- CSR enters a valid 9-digit routing number → bank name auto-fills and field becomes read-only
- CSR submits payment with all fields filled and authorization checked → WorldPay processes and success screen appears
- WorldPay returns REFUSED → error banner appears below the submit button, form remains editable
- CSR clicks "New Transaction" on the success screen → all fields reset to empty

**Bad behaviors — too technical:**
- ~~`validateRoutingNumberAsync` resolves with `{ isValid: true }`~~
- ~~`handleSubmit` calls `submitAchPayment` with `amountCents`~~

**Bad behaviors — missing outcome:**
- ~~CSR checks the authorization checkbox~~
- ~~CSR enters account number~~

The test: read it aloud. If it sounds like a product requirement, it's good. If it sounds like a code comment, rewrite it.

---

## Number Behaviors for Multiple Scenarios

When a feature has multiple scenarios, number them so verify steps can reference them:

```markdown
**Behavior**:
1. CSR enters a valid routing number → bank name auto-fills, field becomes read-only
2. CSR enters an invalid routing number → error message appears below field, input border turns red
3. Routing API is unavailable → field shows warning, CSR can type bank name manually
```

---

## Reference Behaviors in Verify Steps

Verify steps must reference which behaviors they cover:

```markdown
**Verify**:
1. **Covers B1**: Enter `021000021` in the Routing Number field
   - **Page**: `/` (Terminal view)
   - Confirm: Bank Name field shows "JPMorgan Chase" and is grayed out

2. **Covers B2**: Enter `000000000` in the Routing Number field
   - Confirm: Error message appears below field in red
   - Confirm: Input border is red

3. **Covers B3**: Start the server with `ROUTING_API_BASE` pointing to an unreachable URL
   - Enter a checksumming-valid routing number
   - Confirm: Warning appears, Bank Name field is editable
```

---

## End Document After Last Feature

The document ends after the last feature's Verify section. No trailing sections.

Include | Exclude
---|---
System overview | TypeScript code snippets
Non-goals | Function signatures
Feature ToC | Database schemas
Purpose/Behavior/Verify | File lists
Architecture diagrams (Mermaid) | Implementation details

---

## Avoid Implementation Code in Design Docs

Design docs contain NO implementation code. They describe outcomes, not how the system achieves them.

**What's ruled out:** TypeScript snippets, function names, class diagrams, API JSON payloads, file paths, library versions.

**What's allowed:** Architecture diagrams (Mermaid), endpoint paths in Verify, brief SQL in Verify for concrete checks.

Why: docs that describe outcomes survive refactors. Docs that describe implementation rot the moment the code changes.

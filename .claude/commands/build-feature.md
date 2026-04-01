---
name: build-feature
emoji: 🏗️
description: Orchestrates full feature development from idea to working code using PM, Tech Lead, and QA skills. Use when building a complete feature end-to-end.
---

# Build Feature

Autonomous workflow that transforms a feature idea into working, tested code.

## Contents

- [Phase 1: Gather Requirements](#phase-1-gather-requirements)
- [Phase 2: Plan Implementation](#phase-2-plan-implementation)
- [Phase 3: Implement Tasks](#phase-3-implement-tasks)
- [Phase 4: Verify Implementation](#phase-4-verify-implementation)
- [Phase 5: Generate Report](#phase-5-generate-report)
- [Error Handling Protocol](#error-handling-protocol)

---

## Workflow Overview

```
Input: Feature idea or request
   │
   ▼
[Phase 1] Requirements → 🔒 APPROVAL
   │
   ▼
[Phase 2] Planning → 🔒 APPROVAL
   │
   ▼
[Phase 3] Implement (loop) → Test each increment
   │
   ▼
[Phase 4] Verify → Full test suite + requirements check
   │
   ▼
[Phase 5] Report → Summary with pass/fail/root cause
```

---

## Phase 1: Gather Requirements

**Objective:** Transform feature idea into structured, testable spec.

### Steps

1. **Understand the request**
   - Read any provided context (docs, tickets, conversations)
   - Identify the core user need

2. **Apply Acceptance Criteria Builder skill**
   - Generate user story (As a... I want... So that...)
   - Define acceptance criteria for each scenario:
     - Happy path
     - Alternative flows
     - Error handling
   - List technical requirements
   - Define "Definition of Done"

3. **Output requirements document**

```markdown
## Feature: [Name]

### User Story
As a [user type], I want to [action] so that [benefit].

### Acceptance Criteria
- [ ] AC-1: [Criterion]
- [ ] AC-2: [Criterion]
- [ ] AC-3: [Criterion]

### Technical Requirements
- [ ] TR-1: [Requirement]
- [ ] TR-2: [Requirement]

### Definition of Done
- [ ] All acceptance criteria pass
- [ ] Tests written and passing
- [ ] Code reviewed
```

### 🔒 CHECKPOINT

Present requirements to user and ask:

```
## Requirements Complete

[Show requirements document]

Ready to proceed to planning?
- Type "approve" to continue
- Type "revise: [feedback]" to adjust
```

**Do not proceed until user approves.**

---

## Phase 2: Plan Implementation

**Objective:** Break down requirements into executable tasks with clear dependencies.

### Steps

1. **Analyze codebase**
   - Identify existing patterns to follow
   - Find related code to reference
   - Note files that will need changes

2. **Apply Tech Lead: Spec-to-Tasks Decomposer**
   - Define API contracts (request/response types)
   - Create backend tasks (BE-1, BE-2, ...)
   - Create frontend tasks (FE-1, FE-2, ...)
   - Map tasks to acceptance criteria

3. **Apply Tech Lead: Dependency Mapper**
   - Identify shared types needed first
   - Flag blocking dependencies
   - Determine execution order

4. **Apply Tech Lead: Estimation Assistant**
   - Estimate complexity per task
   - Flag high-risk tasks

5. **Output implementation plan**

```markdown
## Implementation Plan

### API Contract
[Types and endpoints]

### Task Execution Order

| Order | Task | Type | Description | Blocks | Est |
|-------|------|------|-------------|--------|-----|
| 1 | Types | Shared | Define shared types | FE-*, BE-* | S |
| 2 | BE-1 | Backend | [Description] | FE-1 | M |
| 3 | FE-1 | Frontend | [Description] | - | M |

### Risks
- [Risk 1]
- [Risk 2]
```

### 🔒 CHECKPOINT

Present plan to user and ask:

```
## Implementation Plan Complete

[Show plan]

Ready to start coding?
- Type "approve" to continue
- Type "revise: [feedback]" to adjust
```

**Do not proceed until user approves.**

---

## Phase 3: Implement Tasks

**Objective:** Code each task incrementally with tests.

### For Each Task in Execution Order:

#### Step 3.1: Implement

Based on task type, use appropriate skill:

| Task Type | Skill | Output |
|-----------|-------|--------|
| Shared Types | Manual | `types/*.ts` |
| API Endpoint | `/api` | Route + validation |
| Component | `/component` | Component + types |
| Page | `/page` | Page + metadata |

#### Step 3.2: Generate Tests

Apply **QA: Test Case Generator**:
- Generate unit tests for the task
- Generate integration tests if applicable
- Map tests to acceptance criteria

#### Step 3.3: Run Tests

```bash
pnpm test --related [files]
```

#### Step 3.4: Evaluate Results

**If tests pass:**
```markdown
✅ Task [ID] Complete
- Files: [list]
- Tests: [X] passing
- Criteria covered: AC-1, AC-2
```
→ Continue to next task

**If tests fail:**
→ Go to [Error Handling Protocol](#error-handling-protocol)

#### Step 3.5: Commit (Optional)

If user has enabled auto-commit:
```bash
git add [files]
git commit -m "feat([scope]): [task description]"
```

### Progress Tracking

After each task, update progress:

```markdown
## Progress: [X/Y] Tasks Complete

| Task | Status | Tests | Notes |
|------|--------|-------|-------|
| Types | ✅ Done | 3/3 | - |
| BE-1 | ✅ Done | 5/5 | - |
| FE-1 | 🔄 In Progress | - | - |
| FE-2 | ⏳ Pending | - | - |
```

---

## Phase 4: Verify Implementation

**Objective:** Ensure complete feature works and meets requirements.

### Steps

1. **Run full test suite**
   ```bash
   pnpm test
   ```

2. **Apply QA: Regression Checklist**
   - Identify affected areas from changed files
   - Generate verification checklist

3. **Apply QA: API Contract Tester**
   - Validate FE types match BE types
   - Flag any mismatches

4. **Apply QA: Accessibility Checker** (if UI changes)
   - Audit new components
   - Flag ARIA issues

5. **Requirements Verification**

   Map each acceptance criterion to evidence:

   ```markdown
   ## Requirements Verification

   | Criterion | Status | Evidence |
   |-----------|--------|----------|
   | AC-1 | ✅ Met | test: "should..." passes |
   | AC-2 | ✅ Met | test: "should..." passes |
   | AC-3 | ❌ Missed | [reason] |
   ```

---

## Phase 5: Generate Report

**Objective:** Summarize what was built, what works, what doesn't.

### Final Report Template

```markdown
# Feature Complete: [Feature Name]

## Summary
[1-2 sentence description of what was built]

## Files Changed
| File | Action | Purpose |
|------|--------|---------|
| `src/...` | Created | [purpose] |
| `src/...` | Modified | [purpose] |

## Test Results
- **Total:** [X] tests
- **Passing:** [Y] ✅
- **Failing:** [Z] ❌

## Requirements Status
| Criterion | Status |
|-----------|--------|
| AC-1 | ✅ Met |
| AC-2 | ✅ Met |
| AC-3 | ❌ Missed - [reason] |

## Errors Encountered
[If any - see error log below]

## Recommendations
- [Any follow-up work needed]
- [Technical debt created]
- [Suggested improvements]

## Ready for Review
- [ ] All tests passing
- [ ] Requirements met
- [ ] Code follows conventions
- [ ] Ready for PR: yes/no
```

---

## Error Handling Protocol

When tests fail or errors occur:

### Step 1: Capture Error

```markdown
## ❌ Error Detected

**Task:** [Task ID]
**File:** [file:line]
**Error:**
[error message]
```

### Step 2: Analyze Root Cause

Investigate:
1. Read the failing test
2. Read the implementation
3. Check related files
4. Identify the mismatch

```markdown
## Root Cause Analysis

**Category:** [Type error | Logic error | Integration error | Test error]

**Cause:** [Explanation of why it failed]

**Location:** [file:line]
```

### Step 3: Determine Fix

```markdown
## Proposed Fix

**Approach:** [How to fix]

**Files to change:**
- [file]: [change]

**Risk:** [Low | Medium | High]
```

### Step 4: Apply Fix

1. Make the fix
2. Re-run tests
3. If still failing → retry (max 3 attempts)
4. If still failing after 3 attempts → escalate to user

### Step 5: Log for Report

```markdown
## Error Log Entry

| Attempt | Error | Fix Applied | Result |
|---------|-------|-------------|--------|
| 1 | [error] | [fix] | ❌ Failed |
| 2 | [error] | [fix] | ✅ Passed |
```

### Escalation

After 3 failed attempts:

```markdown
## 🚨 Escalation Required

**Task:** [Task ID]
**Attempts:** 3
**Last Error:** [error]

I've tried:
1. [Fix 1] - Result: [result]
2. [Fix 2] - Result: [result]
3. [Fix 3] - Result: [result]

**Recommendation:** [What I think the issue is]

Please advise:
- "try: [your suggestion]" to attempt your fix
- "skip" to move to next task
- "stop" to halt workflow
```

---

## Usage

Invoke this workflow with:

```
/build-feature [description of feature]
```

Or provide more context:

```
/build-feature

Feature: User authentication
Context: We need login/logout with JWT tokens
Requirements:
- Email/password login
- Session persistence
- Logout clears session
```

The workflow will guide you through all phases with checkpoints for approval.

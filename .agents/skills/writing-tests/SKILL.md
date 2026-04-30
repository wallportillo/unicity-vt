---
name: writing-tests
emoji: 🧪
description: Testing patterns with Vitest and React Testing Library. Use when writing tests (*.test.tsx, *.spec.ts) for components, services, or utility functions in this codebase.
---

# Testing Patterns

Testing strategy using Vitest + React Testing Library. Tests live next to their source files.

## Contents

- [Colocate Tests with Source Files](#colocate-tests-with-source-files)
- [Name Tests by Business Scenario](#name-tests-by-business-scenario)
- [Test Components Through User Interactions](#test-components-through-user-interactions)
- [Mock External Dependencies with vi.mock](#mock-external-dependencies-with-vimock)
- [Inline Test Values to Reduce Noise](#inline-test-values-to-reduce-noise)
- [Test Error States Explicitly](#test-error-states-explicitly)
- [Skip Testing Compiler Guarantees](#skip-testing-compiler-guarantees)

---

## Colocate Tests with Source Files

Place test files next to the file they test:

```
src/
  components/
    ActivityLog.tsx
    ActivityLog.test.tsx       ← component tests
  services/
    achPayment.ts
    achPayment.test.ts         ← service tests
  utils/
    formatAmount.ts
    formatAmount.test.ts
```

File naming:
- Component tests: `*.test.tsx`
- Logic/service tests: `*.test.ts`

Why: colocation makes tests easy to find. You always know where the test for `ActivityLog.tsx` lives.

---

## Name Tests by Business Scenario

Name tests by what they mean to the user or business, not by implementation.

```ts
// Good: describes business scenario
test('shows bank name after valid routing number is entered', ...)
test('disables Pay Now button until customer authorizes charge', ...)
test('masks account number to last 4 digits in order summary', ...)
test('returns empty array when localStorage is missing', ...)

// Bad: describes implementation
test('sets routingValidation state when validateRoutingNumberAsync resolves', ...)
test('calls setIsValidating(false) in finally block', ...)
```

Why: business-focused names serve as documentation and survive refactors.

---

## Test Components Through User Interactions

Use `@testing-library/user-event` to test component behavior. Query by accessible roles and labels, not by CSS classes or test IDs.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('shows bank name after entering valid routing number', async () => {
  const user = userEvent.setup();
  render(<App />);

  const routingInput = screen.getByLabelText('Routing Number');
  await user.type(routingInput, '021000021'); // Chase routing number

  expect(await screen.findByText(/JPMorgan Chase/i)).toBeInTheDocument();
});

test('Pay Now button is disabled until authorization checkbox is checked', async () => {
  render(<App />);
  const payButton = screen.getByRole('button', { name: /Pay Now/i });
  expect(payButton).toBeDisabled();
});
```

Use `findBy*` (async) when waiting for async state changes. Use `getBy*` for elements that should be present immediately.

Why: testing through user interactions keeps tests aligned with real usage and decoupled from implementation details.

---

## Mock External Dependencies with vi.mock

Mock modules at the file level using `vi.mock`. Use `vi.mocked()` to type mock functions.

```ts
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { submitAchPayment } from '../services/achPayment';

vi.mock('../services/achPayment');

describe('payment submission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('shows success screen after authorised payment', async () => {
    vi.mocked(submitAchPayment).mockResolvedValue({
      success: true,
      orderCode: 'ACH-123',
      authorisationId: 'AUTH-456',
    });

    // render, interact, assert...
  });

  test('shows error banner after refused payment', async () => {
    vi.mocked(submitAchPayment).mockResolvedValue({
      success: false,
      status: 'REFUSED',
      error: 'Payment refused.',
    });

    // render, interact, assert...
  });
});
```

Why: mocking `submitAchPayment` lets you test payment UI flows without a running server.

---

## Inline Test Values to Reduce Noise

Avoid unnecessary variable declarations for single-use values:

```ts
// Bad: extra variable
const routingNumber = '021000021';
const result = validateRoutingNumber(routingNumber);
expect(result.isValid).toBe(true);

// Good: inline
expect(validateRoutingNumber('021000021').isValid).toBe(true);

// Good: inline for array/object assertions
expect(loadLog()).toEqual([]);
```

Only extract to a variable when the value is reused or when clarity demands it.

Why: inline values reduce noise and make assertions read directly.

---

## Test Error States Explicitly

Test failure paths as explicitly as success paths. Every async operation has at least one error test.

```ts
test('falls back to checksum-only when routing API is unavailable', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

  const result = await validateRoutingNumberAsync('021000021');

  // Should degrade gracefully, not throw
  expect(result.isValid).toBe(true);
  expect(result.error).toMatch(/Unable to verify bank name/i);
});

test('returns empty array when localStorage contains invalid JSON', () => {
  localStorage.setItem('unicity_tx_log', 'not-json');

  expect(loadLog()).toEqual([]);
});
```

Why: error paths are where payment bugs are most costly. Explicit error tests prevent silent failures from reaching production.

---

## Skip Testing Compiler Guarantees

Don't write tests for things TypeScript already enforces at compile time:

```ts
// Don't test
- That a function accepts the correct argument types
- That a typed interface has specific properties
- That an enum has specific string values

// Do test
- Business rules and validation logic
- Async flows and error handling
- Component rendering and user interactions
- localStorage read/write behavior
```

Why: testing TypeScript's own guarantees wastes effort and creates maintenance overhead with zero safety benefit.

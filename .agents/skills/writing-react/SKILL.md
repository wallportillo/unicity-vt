---
name: writing-react
emoji: ⚛️
description: Patterns for React hooks, async state management, and form submissions. Use when writing React components, handling async payment calls, managing form state, or working with useEffect in App.tsx.
---

# React Patterns

Patterns for hooks, async state, and form management using plain React (useState, useEffect, useCallback).

## Contents

- [Derive State Instead of Duplicating It](#derive-state-instead-of-duplicating-it)
- [Use useEffect for Async Triggers, Not Event Handlers](#use-useeffect-for-async-triggers-not-event-handlers)
- [Track Async Operations with isSubmitting and isValidating Flags](#track-async-operations-with-issubmitting-and-isvalidating-flags)
- [Reset All State Together in a Single Function](#reset-all-state-together-in-a-single-function)
- [Separate UI State from Domain State](#separate-ui-state-from-domain-state)
- [Keep Event Handlers Thin](#keep-event-handlers-thin)
- [Type Component Props Inline for Small Components](#type-component-props-inline-for-small-components)

---

## Derive State Instead of Duplicating It

Compute values from existing state at render time. Never create a `useState` for something you can derive.

```ts
// Good: derived from form state
const isFormValid =
  authorized &&
  payerName.trim() !== '' &&
  routingValidation?.isValid === true &&
  accountType !== '' &&
  postalCode.trim() !== '';

const hasRoutingError = routingValidation && !routingValidation.isValid && routingValidation.error;

// Bad: duplicate state
const [isFormValid, setIsFormValid] = useState(false);
const [hasRoutingError, setHasRoutingError] = useState(false);
// now you need to keep these in sync with the fields they depend on
```

Why: derived values are always consistent with their inputs. Separate state for the same value creates sync bugs that are hard to trace.

---

## Use useEffect for Async Triggers, Not Event Handlers

When a side effect should fire in response to a state change (not a user action), use `useEffect` with the state as a dependency — not an `onChange` handler calling async code directly.

```ts
// Good: routing validation fires when routingNumber state changes
useEffect(() => {
  const cleaned = routingNumber.replace(/[\s-]/g, '');
  if (cleaned.length < 9) { setRoutingValidation(null); return; }

  setIsValidating(true);
  validateRoutingNumberAsync(cleaned)
    .then((result) => setRoutingValidation(result))
    .finally(() => setIsValidating(false));
}, [routingNumber]);

// Bad: async call directly in onChange
onChange={(e) => {
  setRoutingNumber(e.target.value);
  validateRoutingNumberAsync(e.target.value).then(setRoutingValidation); // fires on every keystroke
}}
```

Why: `useEffect` lets you debounce, add cleanup, and reason about when the effect runs independently from the input handler.

---

## Track Async Operations with isSubmitting and isValidating Flags

Use explicit boolean flags for every in-flight async operation. Never derive "loading" from the absence of a result.

```ts
const [isValidating, setIsValidating] = useState(false);  // routing lookup in flight
const [isSubmitting, setIsSubmitting] = useState(false);  // payment submission in flight

// Pattern for both:
setIsSubmitting(true);
try {
  const result = await submitAchPayment(payload);
  setPaymentResult(result);
} catch {
  setPaymentResult({ success: false, error: 'Unexpected error. Please try again.' });
} finally {
  setIsSubmitting(false);
}
```

Use flags to disable submit buttons and show loading text:
```tsx
<button disabled={!isFormValid || isSubmitting}>
  {isSubmitting ? 'Processing...' : 'Pay Now'}
</button>
```

Why: explicit flags are readable and make it impossible to double-submit.

---

## Reset All State Together in a Single Function

Every piece of form state must be reset in one `handleReset` function. Never partially reset.

```ts
function handleReset() {
  // Form fields
  setPayerName(''); setEmail(''); setRoutingNumber('');
  setBankName(''); setAccountNumber(''); setAccountType('');
  setAchType('TEL'); setAmountDollars(''); setAuthorized(false);
  setAddress1(''); setCity(''); setState(''); setPostalCode('');
  // Derived/async state
  setRoutingValidation(null);
  setPaymentResult(null);
}
```

Call `handleReset` from all "start over" paths: New Transaction button, post-success screen.

Why: missing a field in reset leaves stale data visible on the next transaction — a compliance risk for a payment terminal.

---

## Separate UI State from Domain State

Keep UI concerns (which view is active, loading flags) separate from domain concerns (payment result, routing validation).

```ts
// UI state
const [view, setView] = useState<'terminal' | 'activity'>('terminal');
const [isSubmitting, setIsSubmitting] = useState(false);
const [isValidating, setIsValidating] = useState(false);

// Domain state
const [routingValidation, setRoutingValidation] = useState<RoutingValidationResult | null>(null);
const [paymentResult, setPaymentResult] = useState<AchPaymentResult | null>(null);
const [txLog, setTxLog] = useState<TransactionEntry[]>(() => loadLog());
```

Why: separating the two makes it easier to reason about what drives the UI vs what represents business data.

---

## Keep Event Handlers Thin

`handleSubmit` and other event handlers should orchestrate — not contain business logic.

```ts
// Good: handler orchestrates
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!isFormValid || !accountType) return;

  setIsSubmitting(true);
  const orderCode = generateOrderCode();
  const amountCents = Math.round(parseFloat(amountDollars) * 100);

  try {
    const result = await submitAchPayment(buildPayload()); // logic in helper
    setPaymentResult(result);
    appendToLog(buildLogEntry(result, orderCode));
    setTxLog(loadLog());
  } catch {
    setPaymentResult({ success: false, error: 'Unexpected error. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
}
```

Extract `generateOrderCode`, `buildPayload`, and `buildLogEntry` as plain functions outside the component.

Why: thin handlers are easier to test and the component's render logic stays readable.

---

## Type Component Props Inline for Small Components

For small presentational components (< 20 lines), inline the prop type definition:

```tsx
function SummaryRow({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: boolean;
}) { ... }

function Field({ label, value, large, accent, mono }: {
  label: string;
  value: string;
  large?: boolean;
  accent?: boolean;
  mono?: boolean;
}) { ... }
```

For components with complex or shared props, define a separate interface in `src/types/`.

Why: inline types keep the component self-contained and reduce the number of files for small display primitives.

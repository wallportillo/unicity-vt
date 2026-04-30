---
name: implementing-client-services
emoji: 🔗
description: Patterns for the src/services/ layer — typed wrappers around internal API routes, consistent fetch calls, error handling, and response shape contracts. Use when adding a new service, modifying achPayment.ts or routingValidation.ts, or implementing new HTTP calls from the frontend.
---

# Client Service Patterns

Patterns for `src/services/` — the frontend layer that calls the Express backend.

## Contents

- [Services Call Internal API Routes Only](#services-call-internal-api-routes-only)
- [Type Every Request and Response](#type-every-request-and-response)
- [Check response.ok Before Parsing](#check-responseok-before-parsing)
- [Return Typed Results, Never Throw to the Component](#return-typed-results-never-throw-to-the-component)
- [Export Services from a Barrel Index](#export-services-from-a-barrel-index)
- [Name Service Functions by Action and Resource](#name-service-functions-by-action-and-resource)
- [Keep Services Thin — No Business Logic](#keep-services-thin--no-business-logic)

---

## Services Call Internal API Routes Only

Every function in `src/services/` calls an `/api/*` route on the Express server. Never call third-party APIs (WorldPay, bankrouting.io) directly from the frontend.

```ts
// Good — calls internal Express route
const API_BASE = 'http://localhost:3001';

export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  const response = await fetch(`${API_BASE}/api/payment/ach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  // ...
}

// Bad — calls WorldPay directly from the browser
export async function submitAchPayment(request: AchPaymentRequest) {
  const response = await fetch('https://secure.worldpay.com/...', {
    headers: { Authorization: `Basic ${btoa(`${merchantCode}:${xmlPassword}`)}` },
  });
}
```

Why: direct third-party calls expose credentials in the browser bundle and bypass the server's caching, validation, and logging layers.

---

## Type Every Request and Response

Import request and response types from `src/types/`. Never use `any` or `unknown` in a service return type.

```ts
import type { AchPaymentRequest, AchPaymentResult } from '../types';
import type { RoutingValidationResult } from './routingValidation';

export async function submitAchPayment(
  request: AchPaymentRequest       // typed input
): Promise<AchPaymentResult> {     // typed output
  const response = await fetch(`${API_BASE}/api/payment/ach`, { ... });
  const data: AchPaymentResult = await response.json();
  return data;
}
```

Define shared types in `src/types/` and import them in both the service and the component.

Why: typed services make the component layer simple — it just calls the function and the return type is already known.

---

## Check response.ok Before Parsing

Always check `response.ok` before calling `.json()`. A non-OK response body may not match the expected shape.

```ts
export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  const response = await fetch(`${API_BASE}/api/payment/ach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: AchPaymentResult = await response.json();

  // Non-OK responses from this server still return AchPaymentResult shape
  // But guard against cases where no error field was set
  if (!response.ok && !data.error) {
    return { success: false, error: 'Payment request failed. Please try again.' };
  }

  return data;
}
```

For the routing validation service, the server always returns `RoutingValidationResult` — parse directly and let the `isValid: false` flag carry the error.

Why: `.json()` on an error response that returns HTML or an empty body throws a parse error, obscuring the real HTTP failure.

---

## Return Typed Results, Never Throw to the Component

Service functions should return a typed result object on failure — not throw. The component should never need a try/catch around a service call.

```ts
// Good — return failure shape
export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  try {
    const response = await fetch(...);
    return await response.json();
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Bad — throws to the caller
export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  const response = await fetch(...);
  if (!response.ok) throw new Error('Payment failed'); // component must catch this
  return response.json();
}
```

Why: components handle UI state — they shouldn't also handle network error semantics. Services own the error boundary for fetch calls.

---

## Export Services from a Barrel Index

Export all service functions and types from `src/services/index.ts`:

```ts
// src/services/index.ts
export { submitAchPayment } from './achPayment';
export { validateRoutingNumber, validateRoutingNumberAsync } from './routingValidation';
export type { RoutingValidationResult } from './routingValidation';
```

Components import from the barrel:
```ts
import { validateRoutingNumberAsync, submitAchPayment, type RoutingValidationResult } from './services';
```

Why: a barrel index gives components a single stable import surface. Renaming or moving a service file only requires updating `index.ts`.

---

## Name Service Functions by Action and Resource

Name service functions with an action verb followed by the resource:

```ts
// Good
submitAchPayment(request)          // action: submit, resource: ACH payment
validateRoutingNumber(routing)     // action: validate, resource: routing number
validateRoutingNumberAsync(routing) // async variant
fetchTransactionHistory()          // action: fetch, resource: transaction history

// Bad — resource first, no verb
achPayment(request)
routingValidation(routing)
```

Why: verb-first naming makes it immediately clear what the function does when reading import statements and call sites.

---

## Keep Services Thin — No Business Logic

Service functions handle HTTP mechanics only: fetch, parse, error handling. Business logic belongs in the component or in a domain helper.

```ts
// Good — thin service
export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  const response = await fetch(`${API_BASE}/api/payment/ach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data: AchPaymentResult = await response.json();
  if (!response.ok && !data.error) {
    return { success: false, error: 'Payment request failed. Please try again.' };
  }
  return data;
}

// Bad — business logic in service
export async function submitAchPayment(request: AchPaymentRequest): Promise<AchPaymentResult> {
  // This belongs in the component or domain helper
  const amountCents = Math.round(parseFloat(request.amount.toString()) * 100);
  const orderCode = `ACH-${Date.now()}`;
  const response = await fetch(...);
  // ...
}
```

Why: thin services are reusable. If a second component ever needs to submit payments, it calls the same service without inheriting component-specific logic.

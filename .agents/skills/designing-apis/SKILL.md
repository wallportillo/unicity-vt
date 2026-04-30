---
name: designing-apis
emoji: 🔌
description: REST API design principles for Express routes in server/index.ts — consistent error format, HTTP status codes, idempotency, and avoiding anti-patterns. Use when adding new API endpoints, changing response shapes, or reviewing API contracts in this app.
---

# API Design Patterns

REST API design principles for the Express server in `server/index.ts`.

## Contents

- [Keep APIs Boring and Predictable](#keep-apis-boring-and-predictable)
- [Return a Standard Error Format](#return-a-standard-error-format)
- [Use Correct HTTP Status Codes](#use-correct-http-status-codes)
- [Return Complete Data After Operations](#return-complete-data-after-operations)
- [Implement Idempotency for Payment Operations](#implement-idempotency-for-payment-operations)
- [Design for Additive Changes Only](#design-for-additive-changes-only)
- [Avoid Common Anti-Patterns](#avoid-common-anti-patterns)

---

## Keep APIs Boring and Predictable

Familiarity over cleverness. Consumers should know how to use an endpoint before reading docs.

- Use standard HTTP verbs: `GET` for reads, `POST` for creates/actions
- Name routes by resource: `/api/routing/:routingNumber`, `/api/payment/ach`
- Return JSON for all responses, including errors
- Never put secrets or sensitive data in query params or URLs

Why: predictable APIs reduce integration bugs and make the frontend `services/` layer straightforward to write.

---

## Return a Standard Error Format

All error responses use one consistent shape — never mix formats between routes.

```ts
// All errors
res.status(4xx | 5xx).json({ success: false, error: 'Human-readable message.' });

// Routing validation (uses isValid instead of success — existing convention)
res.status(400).json({ isValid: false, error: 'Routing number must be exactly 9 digits' });
```

Error message rules:
- Human-readable — something a CSR or developer can act on
- Static per error type — don't interpolate internal values
- Never expose stack traces, SQL, or raw gateway responses

Standard error codes to use consistently:

| Situation | Status | Shape |
|---|---|---|
| Missing/invalid fields | 400 | `{ success: false, error: '...' }` |
| Payment refused by gateway | 402 | `{ success: false, status, error }` |
| Auth/config missing | 503 | `{ success: false, error: '...' }` |
| External API unreachable | 502 | `{ success: false, error: '...' }` |
| Unexpected server error | 500 | `{ success: false, error: '...' }` |

Why: consistent error shapes let the frontend handle all errors generically without per-endpoint branching.

---

## Use Correct HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Successful GET or POST result |
| 400 | Validation error — bad input from caller |
| 402 | Payment declined — business-layer rejection |
| 404 | Resource not found (e.g., routing number not in database) |
| 429 | Rate limited by upstream API |
| 500 | Unexpected server error |
| 502 | Upstream API (WorldPay, bankrouting.io) returned an error or was unreachable |
| 503 | Server misconfigured (e.g., missing credentials) |

Why: correct status codes let the frontend distinguish actionable failures (400, 402, 429) from infrastructure failures (502, 503) without parsing the error body.

---

## Return Complete Data After Operations

After a successful payment, return all fields the frontend needs — don't make it fetch again.

```ts
// Good — return everything the success screen needs
return res.status(200).json({
  success: true,
  status: 'AUTHORISED',
  orderCode: 'ACH-1234-ABC',
  authorisationId: 'AUTH-789',
});

// Bad — return minimal data, force client to call again
return res.status(200).json({ success: true });
```

Why: one round-trip per operation. The success screen needs `orderCode` and `authorisationId` immediately — they should be in the response.

---

## Implement Idempotency for Payment Operations

The `orderCode` field on `POST /api/payment/ach` is the idempotency key. Generate it client-side before the request:

```ts
// Client — generate before submit
const orderCode = `ACH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Server — WorldPay uses orderCode to deduplicate
// Duplicate orderCodes for the same merchant → WorldPay returns the existing result
```

Never generate `orderCode` server-side. The client must control it so it can be used for retry logic.

Why: idempotency keys prevent duplicate charges when a network timeout causes the client to retry a submission that already succeeded.

---

## Design for Additive Changes Only

Add new response fields without versioning. Never remove or rename existing fields — that breaks the frontend `services/` layer.

```ts
// Safe: add a new field
{ success: true, orderCode: '...', authorisationId: '...', newField: '...' }

// Breaking: rename or remove
{ success: true, orderId: '...' }  // 'orderCode' → 'orderId' breaks the frontend
```

If a field must change shape, add the new version alongside the old and migrate the frontend before removing the old one.

Why: additive changes don't require coordinated deploys. Breaking changes in a co-located full-stack app are low-risk but still introduce bugs.

---

## Avoid Common Anti-Patterns

| Anti-Pattern | Why It's Bad |
|---|---|
| Secrets in query params (`?key=abc`) | URLs are logged and visible in browser history |
| Different error shapes per route | Frontend needs per-endpoint branching to handle errors |
| Business logic errors as 500 | 500 means "unexpected" — use 400/402 for expected failures |
| Returning booleans without context | `{ valid: false }` is less useful than `{ isValid: false, error: '...' }` |
| Calling external APIs from client | Exposes credentials, bypasses caching, causes CORS errors |

---
name: writing-domain-logic
emoji: 🧠
description: Domain logic patterns for the Unicity Support payment terminal — separating business rules from Express handlers, composing validation functions, defining payment state transitions, and naming functions by business purpose. Use when adding business logic, payment validation, or new domain functions.
---

# Domain Logic Patterns

Patterns for keeping business logic clean and testable in a full-stack Express app.

## Contents

- [Separate Domain Logic from Express Handlers](#separate-domain-logic-from-express-handlers)
- [Compose Validation Functions for Business Rules](#compose-validation-functions-for-business-rules)
- [Define Explicit Payment State Transitions](#define-explicit-payment-state-transitions)
- [Name Functions by Business Purpose](#name-functions-by-business-purpose)
- [Validate Before Mutating or Sending](#validate-before-mutating-or-sending)
- [Keep Domain Functions Pure and Testable](#keep-domain-functions-pure-and-testable)

---

## Separate Domain Logic from Express Handlers

Route handlers in `server/index.ts` should orchestrate — not contain — business logic. Extract domain functions to dedicated files.

```
server/
  index.ts               ← orchestration: routing, request parsing, response sending
  domain/
    routing.ts           ← ABA checksum, routing number validation logic
    payment.ts           ← XML construction, response parsing, credential checks
    order-code.ts        ← order code generation
```

```ts
// Bad — business logic in the route handler
app.post('/api/payment/ach', async (req, res) => {
  const digits = req.body.routingNumber.split('').map(Number);
  const sum = 3 * (digits[0] + digits[3] + digits[6]) + ...;
  // ...50 more lines of logic
});

// Good — handler delegates to domain
app.post('/api/payment/ach', async (req, res) => {
  const validation = validateAchPaymentRequest(req.body);
  if (!validation.valid) return res.status(400).json({ success: false, error: validation.error });

  const xml = buildWorldPayXml(req.body);
  const result = await submitToWorldPay(xml);
  return res.status(result.success ? 200 : 402).json(result);
});
```

Why: logic in handlers is untestable without spinning up Express. Domain functions can be unit tested directly.

---

## Compose Validation Functions for Business Rules

Write one function per validation rule. Compose them at the handler level.

```ts
// Each validates ONE rule
function validateRoutingNumberFormat(routing: string): { valid: boolean; error?: string } {
  if (!/^\d{9}$/.test(routing)) return { valid: false, error: 'Routing number must be exactly 9 digits.' };
  return { valid: true };
}

function validateRoutingNumberChecksum(routing: string): { valid: boolean; error?: string } {
  const digits = routing.split('').map(Number);
  const sum = 3 * (digits[0] + digits[3] + digits[6])
             + 7 * (digits[1] + digits[4] + digits[7])
             + (digits[2] + digits[5] + digits[8]);
  if (sum % 10 !== 0) return { valid: false, error: 'Invalid routing number checksum.' };
  return { valid: true };
}

// Compose at call site
function validateRoutingNumber(routing: string) {
  return validateRoutingNumberFormat(routing)
    ?? validateRoutingNumberChecksum(routing)
    ?? { valid: true };
}
```

Why: composable validators are independently testable. You can test checksum logic without routing API calls.

---

## Define Explicit Payment State Transitions

Define the allowed states and transitions for ACH payments so invalid state combinations are caught early.

```ts
export type PaymentStatus = 'AUTHORISED' | 'REFUSED' | 'ERROR' | 'CANCELLED';

// From WorldPay lastEvent values
const TERMINAL_STATES = new Set<PaymentStatus>(['AUTHORISED', 'REFUSED', 'CANCELLED']);

function isTerminalState(status: PaymentStatus): boolean {
  return TERMINAL_STATES.has(status);
}

// Only AUTHORISED is a success
function isSuccessfulPayment(status: PaymentStatus): boolean {
  return status === 'AUTHORISED';
}
```

For the `TransactionEntry` status in localStorage:
```
AUTHORISED → payment completed, no further action
REFUSED    → gateway declined, CSR must retry with different account
ERROR      → unexpected failure, needs investigation
CANCELLED  → payment was cancelled
```

Why: explicit state definitions prevent `if (status !== 'AUTHORISED')` logic from spreading through components.

---

## Name Functions by Business Purpose

Name functions by what they mean in the payment domain, not by what they do technically.

```ts
// Good — business purpose
buildWorldPayXml(body: AchPaymentRequestBody): string
parseWorldPayResponse(xml: string): PaymentResult
validateAchPaymentRequest(body: unknown): ValidationResult
generateOrderCode(): string
isPaymentAuthorised(result: PaymentResult): boolean

// Bad — CRUD or technical naming
buildXml(body)
parseResponse(xml)
validate(body)
generateId()
checkSuccess(result)
```

Why: domain names survive refactors. If WorldPay is ever replaced by a different gateway, `buildWorldPayXml` tells you exactly what to update.

---

## Validate Before Mutating or Sending

Always validate inputs completely before making any external API call or state change.

```ts
// Good — validate all fields first, then call WorldPay
app.post('/api/payment/ach', async (req, res) => {
  const body: AchPaymentRequestBody = req.body;

  // All validation up front
  if (!body.payerName || !body.routingNumber || !body.accountNumber) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }
  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) {
    return res.status(400).json({ success: false, error: 'Invalid account type.' });
  }
  if (!WP_MERCHANT_CODE) {
    return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
  }

  // Only reach WorldPay after all validation passes
  const xml = buildWorldPayXml(body);
  // ...
});
```

Why: validation failures are cheap. WorldPay calls are not. Validating first avoids charging the gateway for requests that would have been rejected anyway.

---

## Keep Domain Functions Pure and Testable

Domain functions should take inputs and return outputs — no side effects, no `console.log`, no `fetch`.

```ts
// Good — pure function, easily testable
function buildWorldPayXml(body: AchPaymentRequestBody): string {
  // Only string construction — no I/O
  return `<?xml ...>${body.orderCode}...`;
}

function parseWorldPayResponse(xml: string): PaymentResult {
  // Only regex parsing — no I/O
  const lastEvent = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/)?.[1];
  return lastEvent === 'AUTHORISED'
    ? { success: true, status: 'AUTHORISED' }
    : { success: false, error: `Payment ${lastEvent?.toLowerCase()}.` };
}

// Bad — side effects in domain function
function buildWorldPayXml(body: AchPaymentRequestBody): string {
  console.log('[WorldPay] Building XML for', body.orderCode); // logging = side effect
  appendFileSync('worldpay-debug.log', '...');                // I/O = side effect
  return `<?xml ...>`;
}
```

Put logging and file I/O in the route handler — call the pure domain function, then log the result.

Why: pure functions are trivially unit testable with `expect(buildWorldPayXml(fixture)).toContain(...)`. Side effects require mocking.

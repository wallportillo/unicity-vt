---
name: writing-typescript
emoji: 📝
description: Enforces TypeScript patterns including type inference, union types over overloading, and compile-time safety. Use when writing any TypeScript code across the codebase.
---

# TypeScript Patterns

Language-level TypeScript patterns that apply across all code.

## Contents

- [Prefer Type Inference Over Explicit Types](#prefer-type-inference-over-explicit-types)
- [Use Union Types Instead of Overloading](#use-union-types-instead-of-overloading)
- [Skip Runtime Validation for Compile-Time Guarantees](#skip-runtime-validation-for-compile-time-guarantees)
- [Validate External Data with Zod at Boundaries](#validate-external-data-with-zod-at-boundaries)
- [Use Discriminated Unions for Type Narrowing](#use-discriminated-unions-for-type-narrowing)
- [Require Explicit Config Over Defaults](#require-explicit-config-over-defaults)

---

## Prefer Type Inference Over Explicit Types

Let TypeScript infer return types. Explicit types add noise without benefit.

```typescript
// Good: Inferred return type
function add(a: number, b: number) {
  return a + b;
}

// Bad: Explicit return type
function add(a: number, b: number): number {
  return a + b;
}
```

Why: Less code to maintain. TypeScript catches mismatches automatically. Refactoring is easier.

---

## Skip Runtime Validation for Compile-Time Guarantees

Don't write runtime checks that TypeScript already enforces at compile time.

```typescript
// Bad: Runtime validation for compile-time constraint
function add(a: number, b: number) {
  if (typeof a !== 'number') {
    throw new Error('a must be a number');
  }
  return a + b;
}

// Good: Trust TypeScript's type system
function add(a: number, b: number) {
  return a + b;
}
```

**When runtime validation IS needed:**
- External data (API responses, user input, file contents)
- Data crossing trust boundaries
- Use Zod for these cases

Why: TypeScript already enforces types at compile time. Redundant checks add noise.

---

## Validate External Data with Zod at Boundaries

Validate external data with Zod, then trust the types internally.

```typescript
import { z } from 'zod';

// Define schema for external data
const PaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  method: z.enum(['credit_card', 'bank_draft']),
});

type Payment = z.infer<typeof PaymentSchema>;

// Validate at boundary
export function processPayment(untrusted: unknown) {
  const payment = PaymentSchema.parse(untrusted); // Throws if invalid
  return handlePayment(payment); // Now trusted
}

// Internal function trusts the types
function handlePayment(payment: Payment) {
  // No runtime checks needed here
  return payment.amount * getExchangeRate(payment.currency);
}
```

Why: Zod validates once at entry point. Internal code can trust types without repetitive checks.

---

## Use Discriminated Unions for Type Narrowing

Use discriminated unions and type guards.

```typescript
// Discriminated union
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript knows result.data exists
    return result.data;
  }
  // TypeScript knows result.error exists
  throw new Error(result.error);
}
```

Why: Discriminated unions enable exhaustive checks. TypeScript narrows types automatically.

---

## Require Explicit Config Over Defaults

Defaults hide behavior. Make config options required so each consumer explicitly declares their intent.

```typescript
// Bad: Hidden defaults
type Config = {
  cookieName?: string;      // defaults to "auth-token"
  sessionTimeout?: number;  // defaults to 1800
};

// Good: All required, explicit
type Config = {
  cookieName: string;
  sessionTimeout: number;
};
```

Why: Reader sees all config at a glance. No "magic" behavior. Compile-time errors if config is incomplete.

**When defaults are acceptable:**
- Internal implementation details that consumers shouldn't care about
- Backwards compatibility during migrations (temporary)

---
name: securing-code
emoji: 🔐
description: Security and PCI compliance patterns — protecting ACH data, preventing error leakage, securing credentials, and input validation. Use when handling bank account data, WorldPay credentials, routing numbers, or any sensitive fields in server/index.ts or src/.
---

# Security Patterns

Security and PCI compliance for the ACH payment terminal.

## Contents

- [Never Log Sensitive Payment Data](#never-log-sensitive-payment-data)
- [Validate All Inputs Before Processing](#validate-all-inputs-before-processing)
- [Prevent Error Information Leakage](#prevent-error-information-leakage)
- [Store Credentials in Environment Variables Only](#store-credentials-in-environment-variables-only)
- [Restrict CORS to Known Origins](#restrict-cors-to-known-origins)
- [Use Timing-Safe Comparison for Token Checks](#use-timing-safe-comparison-for-token-checks)
- [Mask Sensitive Fields Everywhere Except Input](#mask-sensitive-fields-everywhere-except-input)

---

## Never Log Sensitive Payment Data

ACH data must never appear in server logs, the browser console, or `worldpay-debug.log`.

**Never log:**
- Full account numbers
- Routing numbers as part of account lookup (log the fact of the call, not the full number in aggregate context)
- WorldPay XML password or merchant code
- Full customer name alongside account data
- `Authorization` header values

**Safe to log:**
- Order code: `[WorldPay] Submitting ACH order ACH-1234-ABC`
- Last 4 of account number in activity display (never in server logs)
- HTTP status codes: `[WorldPay] Response status: 200`
- Cache hit/miss for routing lookups: `[Cache HIT] 021000021`

```ts
// Bad
console.log(`[Payment] Processing ${body.accountNumber} for ${body.payerName}`);

// Good
console.log(`[WorldPay] Submitting ACH order ${body.orderCode}`);
```

Why: PCI DSS prohibits storing or logging full account numbers. A leaked log file must not expose cardholder data.

---

## Validate All Inputs Before Processing

Validate every field at the top of each route handler. Reject early with a `400` before reaching any business logic.

```ts
app.post('/api/payment/ach', async (req, res) => {
  const body: AchPaymentRequestBody = req.body;

  // Required field check
  if (!body.payerName || !body.routingNumber || !body.accountNumber || !body.amount || !body.orderCode) {
    return res.status(400).json({ success: false, error: 'Missing required payment fields.' });
  }

  // Enum validation
  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) {
    return res.status(400).json({ success: false, error: 'Invalid account type.' });
  }
  if (!['TEL', 'PPD', 'CCD', 'WEB'].includes(body.achType)) {
    return res.status(400).json({ success: false, error: 'Invalid ACH type.' });
  }

  // Format validation
  if (!/^\d{9}$/.test(body.routingNumber)) {
    return res.status(400).json({ success: false, error: 'Invalid routing number format.' });
  }
});
```

Why: validating at the boundary prevents malformed data from reaching WorldPay, which can result in opaque XML errors that are hard to debug.

---

## Prevent Error Information Leakage

Never expose internal error details to the frontend or browser console.

```ts
// Bad — leaks internal context
catch (error) {
  return res.status(500).json({ error: (error as Error).message });
}

// Good — generic, safe
catch (error) {
  console.error('[WorldPay] Request failed:', error); // full detail server-side only
  return res.status(502).json({ success: false, error: 'Unable to reach payment processor. Please try again.' });
}
```

**Never expose:**
- Stack traces
- Raw WorldPay XML responses
- Database query errors
- Internal URLs or endpoint paths
- Merchant codes or credentials

Why: internal details help attackers enumerate vulnerabilities. A CSR support ticket only needs "Payment failed" — the full context is in `worldpay-debug.log`.

---

## Store Credentials in Environment Variables Only

All WorldPay credentials and external API keys must come from `process.env`. Never hardcode them.

```ts
// Good
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
const WP_XML_PASSWORD = process.env.WORLDPAY_XML_PASSWORD ?? '';

// Bad
const WP_MERCHANT_CODE = 'UNICITY_PROD';
const WP_XML_PASSWORD = 'abc123';
```

Check required credentials at request time — not at startup:
```ts
if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
  return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
}
```

Add `.env` to `.gitignore` and maintain `.env.example` with placeholder values.

Why: hardcoded credentials get committed to version control and are effectively public. Env vars keep secrets out of the codebase.

---

## Restrict CORS to Known Origins

Never use `cors()` without an `origin` allowlist. Enumerate every allowed origin explicitly.

```ts
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.ALLOWED_ORIGIN,
  ].filter(Boolean),
}));
```

Why: an open CORS config allows any webpage to call the ACH payment endpoint — a direct PCI compliance violation.

---

## Use Timing-Safe Comparison for Token Checks

When comparing API keys, tokens, or secrets, always use `crypto.timingSafeEqual` to prevent timing attacks.

```ts
import { timingSafeEqual } from 'node:crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
```

Why: naive string comparison (`a === b`) returns early on the first mismatch, leaking information about where the strings diverge. Timing-safe comparison always takes the same time regardless of where they differ.

---

## Mask Sensitive Fields Everywhere Except Input

Account numbers must be masked to last 4 digits everywhere except the form input field.

```ts
// Order summary display
`****${accountNumber.slice(-4)}`

// Transaction log entry — store only last 4
accountNumberLast4: accountNumber.trim().slice(-4)

// Authorization script
`Account Number ****${accountNumber.slice(-4)}`
```

Never store the full account number in:
- `TransactionEntry` (localStorage)
- `worldpay-debug.log` (beyond what WorldPay already receives)
- React state beyond the controlled input field

Why: masking reduces the PCI audit surface. localStorage and log files are not encrypted; full account numbers in either are a compliance violation.

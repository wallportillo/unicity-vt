---
name: configuring-logging
emoji: 📝
description: Logging conventions for the Unicity Support server — tagged log keys by direction, what to never log, health check exclusion, and the worldpay-debug.log audit trail. Use when adding log statements, changing server logging, or debugging server/index.ts.
---

# Logging Patterns

Consistent logging convention for `server/index.ts` using tagged `console.log` statements.

## Contents

- [Use Bracketed Direction Tags on All Log Lines](#use-bracketed-direction-tags-on-all-log-lines)
- [Log the Fact of External Calls, Not the Payload](#log-the-fact-of-external-calls-not-the-payload)
- [Write Every WorldPay Request and Response to worldpay-debug.log](#write-every-worldpay-request-and-response-to-worldpay-debuglog)
- [Never Log Sensitive Payment Fields](#never-log-sensitive-payment-fields)
- [Exclude the Health Endpoint from Request Logging](#exclude-the-health-endpoint-from-request-logging)
- [Use console.error for All Failure Paths](#use-consoleerror-for-all-failure-paths)

---

## Use Bracketed Direction Tags on All Log Lines

Every `console.log` in the server must start with a bracketed tag identifying the direction and system:

| Tag | Used For |
|---|---|
| `[Cache HIT]` | Routing number found in in-memory cache |
| `[API Call]` | Outbound call to bankrouting.io |
| `[WorldPay]` | All WorldPay-related events (submit, response, error) |

```ts
// Good
console.log(`[Cache HIT] ${routingNumber}`);
console.log(`[API Call] ${routingNumber}`);
console.log(`[WorldPay] Submitting ACH order ${body.orderCode}`);
console.log(`[WorldPay] Response status: ${wpResponse.status}`);
console.error('[WorldPay] Request failed:', error);
console.error('[WorldPay] Missing WORLDPAY_MERCHANT_CODE or WORLDPAY_XML_PASSWORD env vars');

// Bad — untagged, can't grep
console.log(routingNumber);
console.log('Sending payment...');
console.error(error);
```

Why: tagged logs make it easy to grep for specific systems (`grep '\[WorldPay\]' server.log`) or filter by direction without a log aggregator.

---

## Log the Fact of External Calls, Not the Payload

Log metadata about outbound calls — not the data being sent.

```ts
// Good — log intent and identifier
console.log(`[WorldPay] Submitting ACH order ${body.orderCode}`);
console.log(`[API Call] ${routingNumber}`);

// Bad — logs sensitive data
console.log(`[WorldPay] Sending XML: ${xml}`); // XML contains account number
console.log(`[API Call] Routing: ${routingNumber} for ${body.payerName}`);
```

The full request/response payload for WorldPay belongs in `worldpay-debug.log` only — not in `console.log`.

Why: console logs can be captured by monitoring tools, aggregators, or written to stdout in a shared environment. Only non-sensitive identifiers belong there.

---

## Write Every WorldPay Request and Response to worldpay-debug.log

Append every WorldPay request/response pair to `worldpay-debug.log` immediately after the call:

```ts
const { appendFileSync } = await import('fs');
const logEntry = [
  `\n=== ${new Date().toISOString()} ===`,
  `--- REQUEST ---`,
  xml,
  `--- RESPONSE (${wpResponse.status}) ---`,
  responseText,
].join('\n');

appendFileSync('worldpay-debug.log', logEntry);
```

This is the audit trail for payment disputes and reconciliation. Log every call — success and failure alike.

Why: WorldPay disputes require proof of what was submitted and what was returned. The debug log is the first resource when a payment shows as processed on one side but not the other.

---

## Never Log Sensitive Payment Fields

The following must never appear in any log output:

- Full account numbers
- WorldPay XML password (`WORLDPAY_XML_PASSWORD`)
- `Authorization` header values
- Full bank routing numbers in combination with payer name or account
- CVV or security codes (if ever added)

```ts
// Bad
console.log(`[WorldPay] Raw response:\n${responseText}`); // may contain account details

// Good — log status only in console, full response only in worldpay-debug.log
console.log(`[WorldPay] Response status: ${wpResponse.status}`);
appendFileSync('worldpay-debug.log', responseText); // file is gitignored, not streamed
```

Why: PCI DSS prohibits storing full account numbers in logs. `worldpay-debug.log` is gitignored and server-local — it does not stream to monitoring systems.

---

## Exclude the Health Endpoint from Request Logging

Do not log requests to `GET /api/health`. Health check polling creates noise without signal.

```ts
app.get('/api/health', (_req, res) => {
  // No logging here
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

If you add request-level middleware logging in the future, explicitly exclude `/api/health`:

```ts
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    console.log(`[Request] ${req.method} ${req.path}`);
  }
  next();
});
```

Why: health check endpoints are polled every 30 seconds by load balancers and deployment probes. Logging them fills logs with meaningless noise.

---

## Use console.error for All Failure Paths

Reserve `console.error` for error paths only. Use `console.log` for normal operational events.

```ts
// Errors — use console.error
console.error('[WorldPay] Request failed:', error);
console.error('[WorldPay] Missing WORLDPAY_MERCHANT_CODE or WORLDPAY_XML_PASSWORD env vars');
console.error('Routing API Error:', error);

// Normal operations — use console.log
console.log(`[WorldPay] Submitting ACH order ${body.orderCode}`);
console.log(`[Cache HIT] ${routingNumber}`);
```

Why: `console.error` writes to stderr. If you ever pipe stdout to a log file or monitoring service, errors remain separately filterable.

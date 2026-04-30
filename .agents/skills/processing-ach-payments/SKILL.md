---
name: processing-ach-payments
emoji: 🏦
description: WorldPay WPG ACH payment integration — XML payload construction, routing validation, response parsing, and error handling. Use when adding ACH payment logic, modifying WorldPay integration, handling payment responses, changing ACH entry codes, or debugging WorldPay errors in server/index.ts.
---

# Processing ACH Payments

Patterns for ACH payment processing via WorldPay WPG in `server/index.ts` and `src/services/`.

## Contents

- [Build WorldPay XML from Typed Request](#build-worldpay-xml-from-typed-request)
- [Use Cents for All Amount Values](#use-cents-for-all-amount-values)
- [Choose ACH Entry Code by Authorization Channel](#choose-ach-entry-code-by-authorization-channel)
- [Validate Routing Numbers in Two Stages](#validate-routing-numbers-in-two-stages)
- [Parse WorldPay XML Responses with Regex](#parse-worldpay-xml-responses-with-regex)
- [Map Payment Status to HTTP Response Codes](#map-payment-status-to-http-response-codes)
- [Log Every WorldPay Request and Response](#log-every-worldpay-request-and-response)
- [Guard Against Missing Credentials at Request Time](#guard-against-missing-credentials-at-request-time)
- [Never Expose Raw WorldPay Errors to the Frontend](#never-expose-raw-worldpay-errors-to-the-frontend)

---

## Build WorldPay XML from Typed Request

WorldPay WPG uses an XML-based API (`paymentService v1.4`). Always construct XML from the `AchPaymentRequest` type — never build it ad-hoc.

```ts
function buildWorldPayXml(body: AchPaymentRequestBody): string {
  const { payerName, routingNumber, accountNumber, accountType, amount, orderCode } = body;
  const [firstName, ...rest] = payerName.trim().split(/\s+/);
  const lastName = rest.join(' ') || firstName;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"
  "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${WP_MERCHANT_CODE}">
  <submit>
    <order orderCode="${orderCode}">
      <amount value="${amount}" currencyCode="USD" exponent="2"/>
      <paymentDetails>
        <ACH_DIRECT_DEBIT-SSL>
          <echeckSale>
            <bankAccountType>${accountType}</bankAccountType>
            <accountNumber>${accountNumber}</accountNumber>
            <routingNumber>${routingNumber}</routingNumber>
          </echeckSale>
        </ACH_DIRECT_DEBIT-SSL>
      </paymentDetails>
    </order>
  </submit>
</paymentService>`;
}
```

Send with `Content-Type: text/xml; charset=UTF-8` and Basic Auth (`merchantCode:xmlPassword`).

Why: WorldPay rejects malformed DTD or missing required fields silently — keeping XML construction in one function prevents schema drift.

---

## Use Cents for All Amount Values

Always store and transmit amounts in **cents** (integer). The WorldPay `exponent="2"` attribute tells the gateway to divide by 100.

```ts
// Correct: $49.99 → 4999
amount: 4999  // in AchPaymentRequest

// In XML:
<amount value="4999" currencyCode="USD" exponent="2"/>
```

Never pass decimals. Never convert inside `buildWorldPayXml`.

Why: floating-point math on dollar amounts causes rounding errors and gateway rejections.

---

## Choose ACH Entry Code by Authorization Channel

`AchType` maps to how the customer authorized the debit. Use the correct code — WorldPay and the ACH network enforce them:

| Code | Channel | Use Case |
|------|---------|----------|
| `TEL` | Phone | CSR collects authorization verbally over the phone |
| `PPD` | In-person | Customer signs a paper authorization form |
| `CCD` | Corporate | Business-to-business ACH debit |
| `WEB` | Internet | Customer submits via an online form |

The default for this app's CSR phone terminal is `TEL`.

Why: wrong entry codes trigger NACHA compliance rejections that may not surface until settlement.

---

## Validate Routing Numbers in Two Stages

Run validation client-side (checksum) and server-side (checksum + bank lookup). Never skip the server-side check.

**Stage 1 — ABA checksum (client + server, synchronous):**
```ts
const digits = routingNumber.split('').map(Number);
const sum =
  3 * (digits[0] + digits[3] + digits[6]) +
  7 * (digits[1] + digits[4] + digits[7]) +
  (digits[2] + digits[5] + digits[8]);
const valid = sum % 10 === 0;
```

**Stage 2 — Bank lookup (server only, via bankrouting.io):**
- Cache results in a `Map<string, { data; timestamp }>` with 24-hour TTL
- Return `{ isValid: true, bankName, city, state }` on success
- Return `{ isValid: false, error }` on 404 or rate limit (429)

Why: checksum alone allows valid-format but non-existent routing numbers through — the bank lookup catches those before they reach WorldPay.

---

## Parse WorldPay XML Responses with Regex

WorldPay returns XML. Parse with targeted regex — do not bring in an XML parser.

```ts
function parseWorldPayResponse(xml: string) {
  const lastEvent = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/)?.[1];
  const orderCode = xml.match(/orderCode="([^"]+)"/)?.[1];
  const authorisationId = xml.match(/<AuthorisationId\s+id="([^"]+)"/)?.[1];
  const errorText = xml.match(
    /<error[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/error>/
  )?.[1]?.trim();

  if (lastEvent === 'AUTHORISED') return { success: true, status: lastEvent, orderCode, authorisationId };
  if (lastEvent) return { success: false, status: lastEvent, error: `Payment ${lastEvent.toLowerCase()}.` };
  if (errorText) return { success: false, error: errorText };
  return { success: false, error: 'Unexpected response from payment processor.' };
}
```

Known `lastEvent` values: `AUTHORISED`, `REFUSED`, `CANCELLED`, `ERROR`.

Why: WorldPay's response schema is stable — targeted regex is lighter and safer than a full parser for this use case.

---

## Map Payment Status to HTTP Response Codes

```ts
// Authorised
res.status(200).json(result);

// Refused / cancelled by gateway
res.status(402).json(result);

// WorldPay unreachable or HTTP error
res.status(502).json({ success: false, error: 'Unable to reach payment processor.' });

// Missing credentials
res.status(503).json({ success: false, error: 'Payment processor not configured.' });
```

Why: `402 Payment Required` is the correct semantic for a declined transaction — it lets the frontend distinguish a business-layer rejection from a server error.

---

## Log Every WorldPay Request and Response

Append every request/response pair to `worldpay-debug.log` immediately after the call:

```ts
const logEntry = `\n=== ${new Date().toISOString()} ===\n--- REQUEST ---\n${xml}\n--- RESPONSE (${status}) ---\n${responseText}\n`;
fs.appendFileSync('worldpay-debug.log', logEntry);
```

Also log to console: `[WorldPay] Submitting ACH order ${orderCode}` and `[WorldPay] Response status: ${status}`.

Why: WorldPay disputes and chargebacks require a full audit trail. The debug log is the first stop when a payment shows as processed on one side but not the other.

---

## Guard Against Missing Credentials at Request Time

Check `WP_MERCHANT_CODE` and `WP_XML_PASSWORD` at the top of the route handler, not at startup:

```ts
if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
  return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
}
```

Why: env vars can be missing in local dev or misconfigured deployments. A 503 at request time is clearer than a Basic Auth failure deep in the WorldPay call.

---

## Never Expose Raw WorldPay Errors to the Frontend

Sanitize all WorldPay error messages before sending to the client:

```ts
// Bad — leaks internal gateway detail
return res.json({ error: rawWorldPayXmlError });

// Good — generic, safe
return res.json({ success: false, error: 'Payment processor returned an error.' });
```

Log the raw error server-side via console.error and worldpay-debug.log.

Why: raw gateway errors can expose merchant codes, internal order codes, or PCI-sensitive context. Keep them server-side only.

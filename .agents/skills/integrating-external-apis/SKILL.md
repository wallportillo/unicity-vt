---
name: integrating-external-apis
emoji: 🔌
description: Patterns for wrapping external APIs in the Unicity Support server — service layer in src/services/, server-side proxy routes, in-memory caching, typed responses, and graceful degradation. Use when adding a new third-party API, modifying the bankrouting.io integration, building a new service wrapper, or designing how the frontend calls the backend for external data.
---

# Integrating External APIs

Patterns for adding and maintaining external API integrations in `server/index.ts` and `src/services/`.

## Contents

- [Keep Two Distinct Layers: Server Proxy and Client Service](#keep-two-distinct-layers-server-proxy-and-client-service)
- [Type Every External API Response](#type-every-external-api-response)
- [Cache Stable External Lookups with a TTL Map](#cache-stable-external-lookups-with-a-ttl-map)
- [Check for Non-OK Responses Before Parsing](#check-for-non-ok-responses-before-parsing)
- [Handle Rate Limits with a Distinct 429 Branch](#handle-rate-limits-with-a-distinct-429-branch)
- [Degrade Gracefully When the External API Is Unavailable](#degrade-gracefully-when-the-external-api-is-unavailable)
- [Log All External API Calls with Direction Tags](#log-all-external-api-calls-with-direction-tags)
- [Read API Base URLs from Environment Variables](#read-api-base-urls-from-environment-variables)

---

## Keep Two Distinct Layers: Server Proxy and Client Service

External APIs are always called from Express (`server/index.ts`). The React frontend only calls `/api/*` routes — never third-party URLs directly.

```
src/services/routingValidation.ts   → calls GET /api/routing/:id  (our server)
src/services/achPayment.ts          → calls POST /api/payment/ach (our server)

server/index.ts                     → calls bankrouting.io, WorldPay WPG
```

**Client service** (`src/services/`): typed wrappers around internal `/api/*` routes. No auth, no secrets, no direct third-party calls.

**Server proxy** (`server/index.ts`): holds credentials, calls external APIs, caches responses, returns a clean typed result.

Why: direct third-party calls from the browser expose API keys and trigger CORS errors. The proxy layer is also where caching and rate-limit handling live.

---

## Type Every External API Response

Define an interface for each external API response before writing any fetch logic. Never rely on `any` or `unknown` inline.

```ts
// bankrouting.io response shape
interface BankRoutingApiResponse {
  status: 'success' | 'error';
  data?: {
    aba_number: string;
    bank_name: string;
    city: string;
    state: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Map to our internal shape immediately after fetch
const apiData: BankRoutingApiResponse = await response.json();
if (apiData.status === 'success' && apiData.data) {
  return {
    isValid: true,
    bankName: apiData.data.bank_name,
    city: apiData.data.city,
    state: apiData.data.state,
  };
}
```

Define the external response type and the internal result type separately — never return the raw external shape to the frontend.

Why: external APIs change their schemas without warning. A typed boundary makes breaking changes visible at compile time and keeps external shapes out of the frontend.

---

## Cache Stable External Lookups with a TTL Map

For lookups where the data is stable over hours (routing numbers, bank info, exchange rates), cache results in a `Map` with a TTL before making network calls.

```ts
const routingCache = new Map<string, { data: RoutingResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key: string): RoutingResult | null {
  const entry = routingCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCache(key: string, data: RoutingResult): void {
  routingCache.set(key, { data, timestamp: Date.now() });
}
```

Check cache before every fetch:
```ts
const cached = getCached(routingNumber);
if (cached) { console.log(`[Cache HIT] ${routingNumber}`); return res.json(cached); }
```

Why: bankrouting.io has rate limits. Routing number data doesn't change day-to-day. Caching avoids 429s during busy CSR sessions and eliminates redundant network calls for the same routing number.

---

## Check for Non-OK Responses Before Parsing

Always check `response.ok` before calling `.json()` or `.text()`. A non-OK response body may not be valid JSON.

```ts
const response = await fetch(url);

if (!response.ok) {
  // Handle specific status codes first
  if (response.status === 429) {
    return res.status(429).json({ isValid: false, error: 'Rate limit exceeded. Please try again later.' });
  }
  throw new Error(`External API returned ${response.status}`);
}

const data = await response.json();
```

For XML APIs (WorldPay), use `.text()` instead of `.json()` — never call `.json()` on an XML response.

Why: calling `.json()` on a non-JSON body throws a parse error that obscures the real HTTP status. Checking `response.ok` first surfaces the actual failure mode.

---

## Handle Rate Limits with a Distinct 429 Branch

Rate limit responses (HTTP 429) must be handled with a specific user-facing message — not treated as a generic server error.

```ts
if (response.status === 429) {
  return res.status(429).json({
    isValid: false,
    error: 'Rate limit exceeded. Please try again later.',
  });
}
```

The frontend should surface this message directly to the CSR, not swallow it as a generic failure.

Why: a 429 is actionable — the CSR can wait and retry. A generic "unable to validate" message gives no guidance and may prompt unnecessary escalation.

---

## Degrade Gracefully When the External API Is Unavailable

For non-critical external calls (routing lookup), return a best-effort result when the API is down rather than blocking the workflow.

```ts
// Client service fallback — routing validation
} catch (error) {
  console.error('Routing validation API error:', error);
  // Checksum already passed — allow the user to proceed with a warning
  return {
    isValid: true,
    error: 'Unable to verify bank name. Please confirm the routing number is correct.',
  };
}
```

For critical calls (WorldPay payment submission), do not degrade — return a clear error and do not attempt the transaction.

```ts
// Server — payment submission, no fallback
} catch (error) {
  console.error('[WorldPay] Request failed:', error);
  return res.status(502).json({ success: false, error: 'Unable to reach payment processor. Please try again.' });
}
```

Why: routing lookup failure is recoverable (the CSR can manually confirm). Payment failure is not — a silent degradation could result in a transaction that was never submitted.

---

## Log All External API Calls with Direction Tags

Use bracketed direction tags on all console.log statements for external API calls so logs are scannable.

```ts
// Outbound call
console.log(`[API Call] bankrouting.io → ${routingNumber}`);
console.log(`[WorldPay] Submitting ACH order ${orderCode}`);

// Cache hit (avoided call)
console.log(`[Cache HIT] ${routingNumber}`);

// Response received
console.log(`[WorldPay] Response status: ${response.status}`);

// Error
console.error('[WorldPay] Request failed:', error);
console.error('Routing API Error:', error);
```

Why: tagged logs make it easy to grep for all external calls, all cache hits, or all WorldPay interactions independently when debugging.

---

## Read API Base URLs from Environment Variables

Never hardcode third-party API base URLs. Read them from `process.env` with a production default.

```ts
// bankrouting.io — no env var currently, add one before deploying to multiple environments
const ROUTING_API_BASE = process.env.ROUTING_API_BASE ?? 'https://bankrouting.io/api/v1';

// WorldPay — already env-var driven
const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT
  ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';
```

For WorldPay, switch between test and production by setting `WORLDPAY_ENDPOINT`:
- Production: `https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp`
- Test: `https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp`

Why: hardcoded URLs make it impossible to point at a test environment without a code change. Env vars let you switch targets per deployment.

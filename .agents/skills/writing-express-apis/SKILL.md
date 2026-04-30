---
name: writing-express-apis
emoji: 🛣️
description: Express API patterns for the Unicity Support server — route structure, request validation, CORS, in-memory caching, and consistent error responses. Use when adding a new API endpoint, modifying server/index.ts, changing CORS config, adding validation, or designing a new route in this app.
---

# Writing Express APIs

Patterns for building and maintaining Express routes in `server/index.ts`.

## Contents

- [Group Routes by Domain with Section Comments](#group-routes-by-domain-with-section-comments)
- [Validate Requests at the Route Handler](#validate-requests-at-the-route-handler)
- [Return Consistent Error Response Shapes](#return-consistent-error-response-shapes)
- [Use In-Memory Cache with TTL for External Lookups](#use-in-memory-cache-with-ttl-for-external-lookups)
- [Configure CORS with an Explicit Origin Allowlist](#configure-cors-with-an-explicit-origin-allowlist)
- [Read Credentials from Environment Variables Only](#read-credentials-from-environment-variables-only)
- [Proxy External APIs from the Server, Never the Client](#proxy-external-apis-from-the-server-never-the-client)
- [Avoid Untyped req.body](#avoid-untyped-reqbody)

---

## Group Routes by Domain with Section Comments

Separate logical groups of routes with banner comments. Keep all route handlers in `server/index.ts` until the file exceeds ~400 lines, then split into `server/routes/`.

```ts
// ─── Routing Validation ───────────────────────────────────────────────────────

app.get('/api/routing/:routingNumber', async (req, res) => { ... });

// ─── ACH Payments ─────────────────────────────────────────────────────────────

app.post('/api/payment/ach', async (req, res) => { ... });

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => { ... });
```

Why: a single file is easier to grep and reason about for a small app. Section banners let you navigate without IDE tooling.

---

## Validate Requests at the Route Handler

Validate all inputs at the top of the route handler before any async work. Return `400` immediately on failure.

```ts
app.post('/api/payment/ach', async (req, res) => {
  const body: AchPaymentRequestBody = req.body;

  if (!body.payerName || !body.routingNumber || !body.accountNumber || !body.amount) {
    return res.status(400).json({ success: false, error: 'Missing required payment fields.' });
  }

  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) {
    return res.status(400).json({ success: false, error: 'Invalid account type.' });
  }

  // ... proceed
});
```

For complex validation, extract a `validateAchBody(body)` function that returns `{ valid: boolean; error?: string }`.

Why: early returns prevent processing invalid data and keep the happy path readable.

---

## Return Consistent Error Response Shapes

All error responses must use the same shape. Never mix shapes across routes.

```ts
// All routes use one of these two shapes:

// Success
res.status(200).json({ success: true, ...data });

// Error
res.status(4xx | 5xx).json({ success: false, error: 'Human-readable message.' });

// Routing validation (existing exception — uses isValid instead of success)
res.status(400).json({ isValid: false, error: 'Routing number must be exactly 9 digits' });
```

The frontend's `submitAchPayment` and `validateRoutingNumberAsync` services expect these exact shapes.

Why: consistent shapes let the frontend handle errors generically without per-endpoint branching.

---

## Use In-Memory Cache with TTL for External Lookups

Cache external API responses in a `Map` when the data is stable and re-fetching is expensive (rate limits, latency).

```ts
const routingCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Check before fetch
const cached = routingCache.get(key);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  console.log(`[Cache HIT] ${key}`);
  return res.json(cached.data);
}

// Store after successful fetch
routingCache.set(key, { data: result, timestamp: Date.now() });
```

Log cache hits with `[Cache HIT]` and misses with `[API Call]` so you can monitor cache effectiveness.

Why: bankrouting.io has rate limits — caching prevents 429s during high-volume CSR sessions. The cache is per-process; a restart clears it, which is acceptable for routing data.

---

## Configure CORS with an Explicit Origin Allowlist

Never use `cors()` with no options in production. Always list allowed origins explicitly.

```ts
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
}));
```

When deploying, add the production domain to this list via an environment variable:

```ts
const allowedOrigins = [
  'http://localhost:5173',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
```

Why: an open CORS config allows any origin to call the payment API — a direct security risk for ACH endpoints.

---

## Read Credentials from Environment Variables Only

Never hardcode credentials, endpoints, or merchant codes. Read them from `process.env` at module load time with a fallback only for non-sensitive defaults.

```ts
// Good — credentials from env, no fallback
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
const WP_XML_PASSWORD = process.env.WORLDPAY_XML_PASSWORD ?? '';

// Good — endpoint has a safe default
const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT
  ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';

// Bad — hardcoded credential
const WP_MERCHANT_CODE = 'UNICITY_PROD_123';
```

Check that required credentials are present at request time (see `processing-ach-payments` skill).

Why: credentials in source code get committed and leaked. Env vars keep secrets out of version control.

---

## Proxy External APIs from the Server, Never the Client

All calls to third-party APIs (WorldPay, bankrouting.io) must go through the Express server. The React frontend only calls `/api/*`.

```
Frontend → POST /api/payment/ach → Express → WorldPay WPG
Frontend → GET /api/routing/:id  → Express → bankrouting.io
```

Never call WorldPay or bankrouting.io directly from `src/services/` — only from `server/index.ts`.

Why: direct client calls expose credentials, bypass server-side validation, and trigger CORS errors from third-party APIs.

---

## Avoid Untyped req.body

Always assign `req.body` to a typed interface at the top of the handler. Never use `req.body.field` inline.

```ts
// Good
const body: AchPaymentRequestBody = req.body;
if (!body.payerName) { ... }

// Bad
if (!req.body.payerName) { ... }
```

Shared request body types live in `src/types/` and are imported by both `server/index.ts` and `src/services/`.

Why: typed assignment surfaces shape mismatches at compile time and documents the expected contract at a glance.

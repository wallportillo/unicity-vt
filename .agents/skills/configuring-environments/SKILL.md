---
name: configuring-environments
emoji: 🌍
description: Environment variable patterns for the Unicity Support app — .env file structure, startup validation, domain prefixes, and deployment strategy. Use when adding environment variables, modifying .env.example, or changing how the server reads configuration.
---

# Environment Configuration Patterns

Environment variable management for `server/index.ts` and `.env`.

## Contents

- [Validate Environment at Server Startup](#validate-environment-at-server-startup)
- [Keep Variables Flat with Domain Prefixes](#keep-variables-flat-with-domain-prefixes)
- [Fail Fast with No Defaults for Required Secrets](#fail-fast-with-no-defaults-for-required-secrets)
- [Maintain .env.example as the Source of Truth](#maintain-envexample-as-the-source-of-truth)
- [Separate Server-Only from Shared Variables](#separate-server-only-from-shared-variables)
- [Use Decision Tree for New Variables](#use-decision-tree-for-new-variables)

---

## Validate Environment at Server Startup

Add Zod validation at the top of `server/index.ts` to catch missing variables before the server accepts requests.

```ts
import { z } from 'zod';

const envSchema = z.object({
  WORLDPAY_MERCHANT_CODE: z.string().min(1),
  WORLDPAY_XML_PASSWORD: z.string().min(1),
  WORLDPAY_ENDPOINT: z.string().url(),
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGIN: z.string().optional(),
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Missing required environment variables:');
    error.issues.forEach(i => console.error(`  ${i.path.join('.')}: ${i.message}`));
    process.exit(1);
  }
  throw error;
}
```

Until Zod is added, guard credentials at request time (current pattern):
```ts
if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
  return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
}
```

Why: startup validation catches missing vars before any requests are served, rather than failing on the first payment attempt.

---

## Keep Variables Flat with Domain Prefixes

Variable names should be flat (no nesting) with a domain prefix that identifies the system they belong to.

```bash
# Good — flat, domain-prefixed
WORLDPAY_MERCHANT_CODE=...
WORLDPAY_XML_PASSWORD=...
WORLDPAY_ENDPOINT=...

# Good — port is generic enough to skip a prefix
PORT=3001

# Bad — no prefix, ambiguous
MERCHANT_CODE=...
XML_PASSWORD=...
ENDPOINT=...

# Bad — nested (not valid in .env files anyway)
WORLDPAY.MERCHANT_CODE=...
```

Access via module-level constants, not `process.env` inline:
```ts
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT ?? 'https://secure.worldpay.com/...';
```

Why: domain prefixes prevent collisions and make it obvious which system each variable configures when reading `.env`.

---

## Fail Fast with No Defaults for Required Secrets

Credentials must not have fallback defaults. The empty string (`''`) is the only acceptable fallback — it causes the runtime guard to catch the misconfiguration.

```ts
// Good — empty string forces the guard to catch it
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';

// Bad — hardcoded default credential
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? 'UNICITY_DEFAULT';
```

Safe defaults are acceptable for non-sensitive values:
```ts
// Good — endpoint has a safe fallback
const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT
  ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
```

Why: no secret defaults means a missing `.env` value fails loudly rather than silently using a wrong credential.

---

## Maintain .env.example as the Source of Truth

`.env.example` is the canonical list of all variables the app needs. Keep it in sync whenever you add or remove a variable.

```bash
# .env.example

# WorldPay WPG — required for payment processing
WORLDPAY_MERCHANT_CODE=your-merchant-code
WORLDPAY_XML_PASSWORD=your-xml-password
# Production:  https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp
# Test:        https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp
WORLDPAY_ENDPOINT=https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp

# Server port (default: 3001)
PORT=3001

# CORS — production frontend URL (optional in local dev)
ALLOWED_ORIGIN=https://support.unicity.com
```

Rules:
- Commit `.env.example` — never commit `.env`
- Use placeholder values, not real credentials
- Include inline comments explaining test vs production endpoints

Why: `.env.example` is how a new developer knows what to configure. Without it, missing variables are only discovered at runtime.

---

## Separate Server-Only from Shared Variables

All variables in this app are server-only — they live in `.env` and are read by `server/index.ts`. Nothing is exposed to the React frontend directly.

```
.env                 → read by server/index.ts only
VITE_*               → only use these if you need to expose config to the browser
```

Never use `import.meta.env.VITE_WORLDPAY_*` — WorldPay credentials must never reach the browser.

Why: the browser context is public. Any variable in `import.meta.env` can be extracted from the bundle.

---

## Use Decision Tree for New Variables

When adding a new environment variable:

```
1. Is it a secret (credential, API key, password)?
   ├── YES → No default. Add to .env.example with placeholder. Add runtime guard.
   └── NO → Safe default is OK. Document in .env.example with comment.

2. Does it change between test and production?
   ├── YES → Add to .env.example with both values in a comment.
   └── NO → Hard-code the value (e.g. PORT=3001).

3. Does the browser need it?
   ├── YES → Use VITE_ prefix. Never put secrets here.
   └── NO → Plain name, server/index.ts only.
```

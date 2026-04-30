---
name: displaying-errors
emoji: 🚨
description: Patterns for turning API and validation errors into UI display text. Use when showing errors in the payment form, routing validation feedback, or the post-submit error banner in App.tsx.
---

# Displaying Errors

Patterns for converting errors from services and API responses into UI text.

## Contents

- [Use an Inline Error Banner for Payment Failures](#use-an-inline-error-banner-for-payment-failures)
- [Show Routing Errors Inline Under the Input](#show-routing-errors-inline-under-the-input)
- [Prefer the API Error Message Over a Generic One](#prefer-the-api-error-message-over-a-generic-one)
- [Never Show Raw Server Errors in the UI](#never-show-raw-server-errors-in-the-ui)
- [Use Color and Icon to Distinguish Valid from Invalid States](#use-color-and-icon-to-distinguish-valid-from-invalid-states)
- [Clear Errors on Reset, Not on Retry](#clear-errors-on-reset-not-on-retry)

---

## Use an Inline Error Banner for Payment Failures

Show payment failures in an inline red banner between the authorization checkbox and the submit button — not in a toast or modal.

```tsx
{paymentResult && !paymentResult.success && (
  <div style={{
    marginTop: 'var(--spacing-4)',
    padding: 'var(--spacing-4)',
    backgroundColor: '#fef2f2',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-error)',
  }}>
    {paymentResult.error || `Payment ${paymentResult.status?.toLowerCase() ?? 'failed'}. Please verify details and try again.`}
  </div>
)}
```

Why: CSRs are on a live call. Inline errors keep attention on the form. Toasts disappear before the CSR can act; modals interrupt the call flow.

---

## Show Routing Errors Inline Under the Input

Show routing validation feedback directly below the routing number input with three distinct states: validating, valid, and invalid.

```tsx
// Validating
{isValidating && <p style={styles.hint}>Validating...</p>}

// Valid — green checkmark + bank name
{routingValidation?.isValid && routingValidation.bankName && (
  <p style={{ ...styles.hint, color: 'var(--color-success)' }}>
    ✓ {routingValidation.bankName}
  </p>
)}

// Invalid — red X + error message + red input border
{hasRoutingError && (
  <p style={{ ...styles.hint, color: 'var(--color-error)' }}>
    ✕ {routingValidation.error}
  </p>
)}
<input
  style={{ borderColor: hasRoutingError ? 'var(--color-error)' : undefined }}
/>
```

Derive `hasRoutingError` from validation state — never from a separate error state:
```ts
const hasRoutingError = routingValidation && !routingValidation.isValid && routingValidation.error;
```

Why: three explicit states give the CSR immediate feedback without waiting for form submission.

---

## Prefer the API Error Message Over a Generic One

When an API response includes an `error` string, show it. Only fall back to a generic message when no specific error is available.

```tsx
// Payment error — prefer specific, fall back to status, then generic
{paymentResult.error
  || `Payment ${paymentResult.status?.toLowerCase() ?? 'failed'}. Please verify details and try again.`}

// Routing error — use whatever the API returned
{routingValidation.error}
```

Never construct error messages from raw exception objects or server responses. Always use the pre-sanitized `error` field from the typed response.

Why: specific messages help CSRs take the right action (e.g., "Rate limit exceeded" vs "Invalid routing number"). Generic fallbacks handle the case where no message was provided.

---

## Never Show Raw Server Errors in the UI

Do not render raw exception messages, stack traces, or untyped catch values in the UI.

```ts
// Bad — raw exception message shown to user
} catch (error) {
  setPaymentResult({ success: false, error: (error as Error).message });
}

// Good — generic safe message for unexpected errors
} catch {
  setPaymentResult({ success: false, error: 'Unexpected error. Please try again.' });
}
```

For expected failures (network down, rate limited), the service layer should return a sanitized message. The component always shows `result.error`, never the raw thrown value.

Why: raw errors can expose internal URLs, stack frames, or credential-related context. The catch block is the last line of defense.

---

## Use Color and Icon to Distinguish Valid from Invalid States

Use the design token colors consistently for error/success states:

| State | Color token | Usage |
|---|---|---|
| Valid | `var(--color-success)` | Routing number confirmed, success banner |
| Invalid | `var(--color-error)` | Routing error, payment refused, error banner |
| Neutral hint | `var(--color-neutral-500)` | "Auto-filled from routing number", helper text |
| Loading | `var(--color-neutral-500)` | "Validating..." text |

Pair color with an icon (✓ / ✕ SVG) so the state is accessible without relying on color alone.

Why: consistent token usage makes error states visually uniform and respects the design system.

---

## Clear Errors on Reset, Not on Retry

`paymentResult` (the error source) is cleared by `handleReset` — not when the user re-submits.

```ts
function handleReset() {
  // ...all form fields...
  setPaymentResult(null); // error clears here
}

async function handleSubmit(e: React.FormEvent) {
  setIsSubmitting(true);
  setPaymentResult(null); // also clear on new submit attempt
  // ...
}
```

Clear `paymentResult` at the start of `handleSubmit` so the previous error doesn't linger while the new submission is in flight.

Why: clearing on reset matches user expectations — start fresh, clean slate. Clearing on submit prevents showing a stale error during re-attempts.

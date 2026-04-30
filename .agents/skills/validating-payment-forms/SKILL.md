---
name: validating-payment-forms
emoji: ✅
description: Payment form validation patterns for the ACH terminal — field sanitization, async routing validation, derived form-ready state, and dollar-to-cents conversion. Use when adding form fields, changing validation logic, modifying the routing number flow, or handling input sanitization in App.tsx.
---

# Validating Payment Forms

Patterns for input handling and validation in the ACH payment form in `src/App.tsx`.

## Contents

- [Derive isFormValid as a Single Boolean](#derive-isformvalid-as-a-single-boolean)
- [Trigger Async Routing Validation with useEffect](#trigger-async-routing-validation-with-useeffect)
- [Sanitize Numeric Inputs at the onChange Handler](#sanitize-numeric-inputs-at-the-onchange-handler)
- [Convert Dollars to Cents at Submit Time](#convert-dollars-to-cents-at-submit-time)
- [Show Inline Routing Feedback with Derived State](#show-inline-routing-feedback-with-derived-state)
- [Auto-Fill Bank Name from Routing Validation](#auto-fill-bank-name-from-routing-validation)
- [Mask Account Number Everywhere Except Input](#mask-account-number-everywhere-except-input)
- [Gate Submit on Authorization Checkbox](#gate-submit-on-authorization-checkbox)

---

## Derive isFormValid as a Single Boolean

Compute form readiness as a single derived boolean from all field states. Never check individual fields at submit time.

```ts
const isFormValid =
  authorized &&
  payerName.trim() !== '' &&
  email.trim() !== '' &&
  routingValidation?.isValid === true &&
  accountNumber.trim() !== '' &&
  accountType !== '' &&
  amountDollars.trim() !== '' &&
  parseFloat(amountDollars) > 0 &&
  postalCode.trim() !== '';
```

Use this boolean to:
- Disable the submit button: `disabled={!isFormValid || isSubmitting}`
- Set visual opacity: `opacity: isFormValid && !isSubmitting ? 1 : 0.5`
- Guard the submit handler: `if (!isFormValid || !accountType) return;`

Why: a single derived boolean keeps validation logic in one place. Adding a new required field means updating `isFormValid` — not hunting through submit handlers and button props.

---

## Trigger Async Routing Validation with useEffect

Watch the `routingNumber` state and fire the async lookup only when 9 digits are present.

```ts
useEffect(() => {
  const cleaned = routingNumber.replace(/[\s-]/g, '');

  if (cleaned.length < 9) {
    setRoutingValidation(null);
    setBankName('');
    return;
  }

  if (cleaned.length === 9) {
    setIsValidating(true);
    validateRoutingNumberAsync(cleaned)
      .then((result) => {
        setRoutingValidation(result);
        if (result.isValid && result.bankName) setBankName(result.bankName);
      })
      .finally(() => setIsValidating(false));
  }
}, [routingNumber]);
```

Reset `routingValidation` and `bankName` to null/empty when the user deletes back below 9 digits.

Why: firing the lookup at every keystroke would hammer the API. Waiting for exactly 9 digits matches the ABA format and ensures only complete routing numbers are validated.

---

## Sanitize Numeric Inputs at the onChange Handler

Strip non-numeric characters and enforce max length directly in `onChange` — never in validation logic.

```ts
// Routing number — digits only, max 9
onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}

// Account number — digits only, no max
onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}

// ZIP code — digits only, max 5
onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}

// State — uppercase, max 2 chars (use CSS too)
onChange={(e) => setState(e.target.value)}
style={{ textTransform: 'uppercase' }}
maxLength={2}
```

Set `inputMode="numeric"` on all numeric fields for mobile keyboard optimization.

Why: sanitizing at input prevents invalid characters from ever entering state, removing the need to handle them downstream.

---

## Convert Dollars to Cents at Submit Time

Store amount as a dollar string in state (`amountDollars`). Convert to cents only inside `handleSubmit`.

```ts
// State — stored as string for input binding
const [amountDollars, setAmountDollars] = useState('');

// Convert at submit
const amountCents = Math.round(parseFloat(amountDollars) * 100);
```

Always use `Math.round` — never `parseInt` or `Math.floor` — to handle float precision.

Input field configuration:
```tsx
<input
  type="number"
  min="0.01"
  step="0.01"
  style={{ fontVariantNumeric: 'tabular-nums' }}
/>
```

Why: storing as a string preserves the raw input value for display. Converting at submit with `Math.round` eliminates floating-point rounding errors (e.g., `$10.99 * 100 = 1098.9999...`).

---

## Show Inline Routing Feedback with Derived State

Derive the error display flag from `routingValidation` — never from a separate error state.

```ts
const hasRoutingError = routingValidation && !routingValidation.isValid && routingValidation.error;
```

Use it to drive three states on the routing input:

```tsx
// Validating
{isValidating && <p style={styles.hint}>Validating...</p>}

// Valid — show bank name in green
{routingValidation?.isValid && routingValidation.bankName && (
  <p style={{ ...styles.hint, color: 'var(--color-success)' }}>
    ✓ {routingValidation.bankName} ({routingValidation.city}, {routingValidation.state})
  </p>
)}

// Invalid — show error in red, highlight input border
{hasRoutingError && (
  <p style={{ ...styles.hint, color: 'var(--color-error)' }}>
    ✕ {routingValidation.error}
  </p>
)}

// Input border — error state
<input style={{ borderColor: hasRoutingError ? 'var(--color-error)' : undefined }} />
```

Why: three explicit visual states (loading, valid, invalid) give the CSR immediate feedback without waiting for form submission.

---

## Auto-Fill Bank Name from Routing Validation

When routing validation returns a valid bank name, write it directly to `bankName` state and make the field read-only.

```ts
// In the useEffect callback
if (result.isValid && result.bankName) setBankName(result.bankName);

// Input field
<input
  id="bankName"
  value={bankName}
  onChange={(e) => setBankName(e.target.value)}
  readOnly={routingValidation?.isValid}
  style={{ backgroundColor: routingValidation?.isValid ? 'var(--color-neutral-200)' : undefined }}
/>
{routingValidation?.isValid && <p style={styles.hint}>Auto-filled from routing number</p>}
```

Allow manual override when routing validation has not confirmed the number (e.g., fallback path).

Why: auto-fill eliminates CSR data entry errors for bank name, which is required in the authorization script and WorldPay payload.

---

## Mask Account Number Everywhere Except Input

Show full account number in the input field only. Mask to last 4 digits everywhere else.

```ts
// In the order summary
value={accountNumber ? `****${accountNumber.slice(-4)}` : '—'}

// In the authorization script
Account Number <Highlight>{accountNumber ? `****${accountNumber.slice(-4)}` : '___'}</Highlight>

// In the transaction log entry
accountNumberLast4: accountNumber.trim().slice(-4)
```

Never store the full account number in `TransactionEntry` — only `accountNumberLast4`.

Why: full account numbers must not appear in the UI outside the input, in logs, or in localStorage. Masking reduces the PCI surface area.

---

## Gate Submit on Authorization Checkbox

The `authorized` boolean must be part of `isFormValid` and drives the checkbox in the "Read to Customer" card.

```tsx
<label style={styles.authLabel}>
  <input
    type="checkbox"
    form="ach-form"
    checked={authorized}
    onChange={(e) => setAuthorized(e.target.checked)}
  />
  <span>Customer authorizes this charge</span>
</label>
```

Reset `authorized` to `false` in `handleReset` along with all other fields.

Why: NACHA regulations require explicit customer authorization before ACH debit. The checkbox is the CSR's confirmation that the customer gave verbal authorization during the call.

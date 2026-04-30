---
name: managing-csr-workflows
emoji: 🎧
description: CSR terminal UI patterns — two-panel layout, live authorization script, order summary, success screen, and transaction reset flow. Use when modifying the terminal layout, changing the authorization script, updating the order summary panel, adding a new post-submit screen, or resetting state between transactions in App.tsx.
---

# Managing CSR Workflows

Patterns for the CSR-facing payment terminal UI in `src/App.tsx`.

## Contents

- [Use Two-Panel Layout for Form and Script Side by Side](#use-two-panel-layout-for-form-and-script-side-by-side)
- [Build the Authorization Script from Live State](#build-the-authorization-script-from-live-state)
- [Show Placeholder Values Until Fields Are Filled](#show-placeholder-values-until-fields-are-filled)
- [Mirror the Order Summary from Form State](#mirror-the-order-summary-from-form-state)
- [Show a Full-Page Success Screen After Authorization](#show-a-full-page-success-screen-after-authorization)
- [Reset All State Together in handleReset](#reset-all-state-together-in-handleReset)
- [Display Payment Errors Inline Below the Submit Button](#display-payment-errors-inline-below-the-submit-button)
- [Use SummaryRow and Highlight as Display Primitives](#use-summaryrow-and-highlight-as-display-primitives)

---

## Use Two-Panel Layout for Form and Script Side by Side

The terminal is a two-column flex layout: left panel is the payment form, right panel is the order summary and authorization script.

```tsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-6)', alignItems: 'flex-start' }}>
  {/* Left — Payment Information form */}
  <div className="card" style={{ flex: '1 1 420px' }}>...</div>

  {/* Right — Order Summary + Read to Customer */}
  <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
    <div className="card">...</div> {/* Order Summary */}
    <div className="card">...</div> {/* Read to Customer */}
  </div>
</div>
```

Use `flexWrap: 'wrap'` so the layout stacks on narrow viewports. The form and script panels use the same `flex: '1 1 420px'` base so they grow equally.

Why: CSRs need to read the script and confirm field values simultaneously. Side-by-side layout prevents switching between views during a live call.

---

## Build the Authorization Script from Live State

The "Read to Customer" script updates in real time as the CSR fills the form. Render it directly from component state — no copy button, no draft mode.

```tsx
<p>
  "To confirm your order, I understand that you, <Highlight>{payerName || '___'}</Highlight>,
  authorize Unicity International to make a one-time charge of{' '}
  <Highlight>{amountDollars ? formatAmount(amountDollars) : '___'}</Highlight> to your{' '}
  <Highlight>{formatAccountType(accountType)}</Highlight> account today,{' '}
  <Highlight>{today}</Highlight>. You are also authorizing that this information is saved
  for faster checkout on future purchases to your account.
</p>
<p>
  The total amount for this transaction is{' '}
  <Highlight>{amountDollars ? formatAmount(amountDollars) : '___'}</Highlight> on the bank
  information you provided: <Highlight>{bankName || '___'}</Highlight>, Routing Number{' '}
  <Highlight>{routingNumber || '___'}</Highlight>, Account Type{' '}
  <Highlight>{formatAccountType(accountType)}</Highlight>, Account Number{' '}
  <Highlight>{accountNumber ? `****${accountNumber.slice(-4)}` : '___'}</Highlight>.
</p>
<p style={{ fontWeight: 700 }}>Is this information correct? (Wait for confirmation)</p>
<p>Once this transaction is processed, no further changes will be made to this specific authorization."</p>
```

The script is static legal text — do not modify the wording without compliance review.

Why: CSRs read the script verbatim to the customer. Live field substitution ensures the script always matches what was entered, preventing authorization disputes.

---

## Show Placeholder Values Until Fields Are Filled

Use `'___'` (three underscores) as the placeholder in the script for unfilled fields. Use `'—'` (em dash) in the order summary.

```ts
// In authorization script
payerName || '___'
amountDollars ? formatAmount(amountDollars) : '___'
bankName || '___'

// In order summary
payerName || '—'
amountDollars ? formatAmount(amountDollars) : '—'
bankName || '—'
```

Why: blank spaces in the script are hard to spot during a call. Underscores are a visible signal that the field needs to be filled before reading.

---

## Mirror the Order Summary from Form State

The order summary is a read-only `<dl>` grid that mirrors the form. It updates live as the CSR types.

```tsx
<dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--spacing-3) var(--spacing-6)' }}>
  <SummaryRow label="Customer"    value={payerName || '—'} />
  <SummaryRow label="Email"       value={email || '—'} />
  <SummaryRow label="Amount"      value={amountDollars ? formatAmount(amountDollars) : '—'} highlight />
  <SummaryRow label="Bank"        value={bankName || '—'} />
  <SummaryRow label="Routing #"   value={routingNumber || '—'} />
  <SummaryRow label="Account"     value={accountNumber ? `****${accountNumber.slice(-4)}` : '—'} />
  <SummaryRow label="Account Type" value={formatAccountType(accountType)} />
  <SummaryRow label="eCheck Type" value={achType} />
  <SummaryRow label="Date"        value={today} />
</dl>
```

The `highlight` prop on Amount renders larger, bolder text to make the charge amount visually prominent.

Why: the summary lets the CSR do a final visual check before reading the script and checking the authorization box.

---

## Show a Full-Page Success Screen After Authorization

When `paymentResult?.success` is true, replace the entire terminal layout with a focused success screen. Do not show the form.

```tsx
if (paymentResult?.success) {
  return (
    <div>
      <Nav ... />
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card-header">✓ Payment Authorised</div>
        <div className="card-body" style={{ textAlign: 'center' }}>
          <h2>{payerName}</h2>
          <p>{formatAmount(amountDollars)}</p>
          {paymentResult.orderCode && <p>Order: {paymentResult.orderCode}</p>}
          {paymentResult.authorisationId && <p>Auth ID: {paymentResult.authorisationId}</p>}
          <button onClick={handleReset}>New Transaction</button>
          <button onClick={() => { handleReset(); setView('activity'); }}>View Activity</button>
        </div>
      </div>
    </div>
  );
}
```

Always show both `orderCode` and `authorisationId` when present — these are the reference numbers for disputes.

Why: a full-page success screen prevents accidental re-submission and gives the CSR a clear stopping point to read the confirmation to the customer.

---

## Reset All State Together in handleReset

`handleReset` must clear every field and derived state in one function. Never partially reset.

```ts
function handleReset() {
  setPayerName('');
  setEmail('');
  setRoutingNumber('');
  setBankName('');
  setAccountNumber('');
  setAccountType('');
  setAchType('TEL');           // reset to default ACH type
  setAmountDollars('');
  setAuthorized(false);        // always reset authorization
  setAddress1('');
  setCity('');
  setState('');
  setPostalCode('');
  setRoutingValidation(null);  // clear validation state
  setPaymentResult(null);      // clear previous result
}
```

Do not reset `txLog` — transaction history persists across sessions.

Why: a missed state reset leaves stale data visible in the script or summary for the next transaction, which is a compliance and accuracy risk.

---

## Display Payment Errors Inline Below the Submit Button

Show failed payment errors in a red banner between the authorization checkbox and the submit button — not in a toast or modal.

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

The error clears automatically when `handleReset` is called (which sets `paymentResult` to null).

Why: inline errors keep the CSR's focus on the form. Modals interrupt the call flow and toasts disappear before the CSR can read them.

---

## Use SummaryRow and Highlight as Display Primitives

Two small components handle all repeated display formatting. Never inline their styles.

```tsx
// SummaryRow — used in the order summary <dl>
function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <>
      <dt style={{ color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </dt>
      <dd style={{ fontSize: highlight ? '30px' : 'var(--text-base)', fontWeight: highlight ? 800 : 400 }}>
        {value}
      </dd>
    </>
  );
}

// Highlight — used inside the authorization script
function Highlight({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'var(--color-primary-900)', fontWeight: 700 }}>{children}</strong>;
}
```

`highlight` prop is reserved for the Amount row — use it only where visual prominence is needed for compliance reasons.

Why: centralizing display primitives ensures the summary and script stay visually consistent as new fields are added.

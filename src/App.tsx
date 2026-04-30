'use client';

import { useState, useEffect, useRef } from 'react';
import { validateRoutingNumberAsync, submitAchPayment, type RoutingValidationResult } from './services';
import type { AchAccountType, AchType, AchPaymentResult, TransactionEntry } from './types';
import { ActivityLog, loadLog, appendToLog, clearLog } from './components/ActivityLog';

function generateOrderCode(): string {
  return `ACH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatAmount(dollars: string): string {
  const n = parseFloat(dollars);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatAccountType(type: AchAccountType | ''): string {
  if (!type) return '—';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

type View = 'terminal' | 'activity';

export function App() {
  const routingValidationRequestId = useRef(0);
  const [view, setView] = useState<View>('terminal');
  const [txLog, setTxLog] = useState<TransactionEntry[]>(() => loadLog());

  const [payerName, setPayerName]         = useState('');
  const [email, setEmail]                 = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankName, setBankName]           = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType]     = useState<AchAccountType | ''>('');
  const [achType, setAchType]             = useState<AchType>('TEL');
  const [amountDollars, setAmountDollars] = useState('');
  const [authorized, setAuthorized]       = useState(false);
  const [address1, setAddress1]           = useState('');
  const [address2, setAddress2]           = useState('');
  const [city, setCity]                   = useState('');
  const [state, setState]                 = useState('');
  const [postalCode, setPostalCode]       = useState('');
  const [checkNumber, setCheckNumber]     = useState('');
  const [customIdentifier, setCustomIdentifier] = useState('');

  const [routingValidation, setRoutingValidation] = useState<RoutingValidationResult | null>(null);
  const [isValidating, setIsValidating]   = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [paymentResult, setPaymentResult] = useState<AchPaymentResult | null>(null);

  useEffect(() => {
    const cleaned = routingNumber.replace(/[\s-]/g, '');
    routingValidationRequestId.current += 1;
    const requestId = routingValidationRequestId.current;

    if (cleaned.length < 9) {
      setRoutingValidation(null);
      setBankName('');
      setIsValidating(false);
      return;
    }

    if (cleaned.length === 9) {
      const controller = new AbortController();
      setIsValidating(true);
      setRoutingValidation(null);
      validateRoutingNumberAsync(cleaned, controller.signal)
        .then((result) => {
          if (requestId !== routingValidationRequestId.current) {
            return;
          }
          setRoutingValidation(result);
          if (result.isValid && result.bankName) {
            setBankName(result.bankName);
            return;
          }
          setBankName('');
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          setRoutingValidation({
            isValid: false,
            error: 'Unable to verify routing number right now. Please try again.',
          });
          setBankName('');
        })
        .finally(() => {
          if (requestId === routingValidationRequestId.current) {
            setIsValidating(false);
          }
        });

      return () => {
        controller.abort();
      };
    }
  }, [routingNumber]);

  const hasRoutingError = routingValidation && !routingValidation.isValid && routingValidation.error && !/^\d{9}$/.test(routingNumber.replace(/[\s-]/g, ''));

  const isFormValid =
    authorized &&
    payerName.trim() !== '' &&
    email.trim() !== '' &&
    routingValidation?.isValid === true &&
    accountNumber.trim() !== '' &&
    accountType !== '' &&
    amountDollars.trim() !== '' &&
    parseFloat(amountDollars) > 0 &&
    postalCode.trim() !== '' &&
    checkNumber.trim() !== '' &&
    customIdentifier.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || !accountType) return;

    setIsSubmitting(true);
    setPaymentResult(null);

    const orderCode = generateOrderCode();
    const amountCents = Math.round(parseFloat(amountDollars) * 100);

    try {
      const result = await submitAchPayment({
        payerName: payerName.trim(),
        email: email.trim(),
        routingNumber,
        bankName,
        accountNumber: accountNumber.trim(),
        accountType: accountType as AchAccountType,
        achType,
        amount: amountCents,
        orderCode,
        description: 'Unicity Purchase',
        address1: address1.trim() || undefined,
        address2: address2.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim(),
        checkNumber: checkNumber.trim(),
        customIdentifier: customIdentifier.trim(),
      });

      setPaymentResult(result);

      // Log the transaction
      const entry: TransactionEntry = {
        id: orderCode,
        timestamp: new Date().toISOString(),
        payerName: payerName.trim(),
        email: email.trim(),
        amount: amountCents,
        bankName,
        accountType: formatAccountType(accountType as AchAccountType),
        achType,
        routingNumber,
        accountNumberLast4: accountNumber.trim().slice(-4),
        orderCode: result.orderCode ?? orderCode,
        status: result.success
          ? 'AUTHORISED'
          : ((result.status as TransactionEntry['status']) ?? 'ERROR'),
        authorisationId: result.authorisationId,
        errorMessage: result.success ? undefined : (result.error ?? result.status),
        rawStatus: result.status,
      };

      appendToLog(entry);
      setTxLog(loadLog());
    } catch {
      setPaymentResult({ success: false, error: 'Unexpected error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setPayerName(''); setEmail(''); setRoutingNumber(''); setBankName('');
    setAccountNumber(''); setAccountType(''); setAchType('TEL');
    setAmountDollars(''); setAuthorized(false);
    setAddress1(''); setAddress2(''); setCity(''); setState(''); setPostalCode('');
    setCheckNumber(''); setCustomIdentifier('');
    setRoutingValidation(null); setPaymentResult(null);
  }

  function handleClearLog() {
    clearLog();
    setTxLog([]);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (paymentResult?.success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
        <Nav view={view} onViewChange={setView} txCount={txLog.length} />
        <div style={{ padding: 'var(--spacing-12) var(--spacing-8)' }}>
          <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
              </svg>
              <span className="card-title">{paymentResult.status === 'CAPTURED' ? 'Payment Captured' : 'Payment Authorised'}</span>
            </div>
            <div className="card-body" style={{ textAlign: 'center', padding: 'var(--spacing-10)' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="1.5" style={{ marginBottom: 'var(--spacing-4)' }}>
                <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
              </svg>
              <h2 style={{ color: 'var(--color-primary-900)', marginBottom: 'var(--spacing-2)' }}>{payerName}</h2>
              <p style={{ fontSize: '30px', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: 'var(--spacing-1)' }}>
                {formatAmount(amountDollars)}
              </p>
              {paymentResult.orderCode && (
                <p style={{ fontSize: '18px', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-1)' }}>
                  Order: {paymentResult.orderCode}
                </p>
              )}
              {paymentResult.authorisationId && (
                <p style={{ fontSize: '18px', color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-8)' }}>
                  Auth ID: {paymentResult.authorisationId}
                </p>
              )}
              <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={handleReset}>New Transaction</button>
                <button className="btn btn-ghost" onClick={() => { handleReset(); setView('activity'); }}>
                  View Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <Nav view={view} onViewChange={setView} txCount={txLog.length} />

      {view === 'activity' ? (
        <ActivityLog log={txLog} onClear={handleClearLog} />
      ) : (
        <div style={{ padding: 'var(--spacing-8)', maxWidth: 1200, margin: '0 auto' }}>
          <div style={styles.twoCol}>

            {/* ── LEFT: Payment info form ─────────────────────────────── */}
            <div className="card" style={{ flex: '1 1 420px' }}>
              <div className="card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
                <span className="card-title">Payment Information</span>
              </div>

              <form id="ach-form" onSubmit={handleSubmit} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
                <div>
                  <label htmlFor="payerName">Payer Name</label>
                  <input id="payerName" type="text" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Full name as it appears on bank account" required />
                </div>

                <div>
                  <label htmlFor="email">Email Address</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" required />
                </div>

                <div>
                  <label htmlFor="amount">Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={styles.currencyPrefix}>$</span>
                    <input id="amount" type="number" value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} placeholder="0.00" min="0.01" step="0.01" required style={{ paddingLeft: '2rem', fontVariantNumeric: 'tabular-nums' }} />
                  </div>
                </div>

                <div>
                  <label htmlFor="routingNumber">Routing Number</label>
                  <input
                    id="routingNumber" type="text" value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9-digit ABA routing number" maxLength={9} inputMode="numeric" required
                    style={{ borderColor: hasRoutingError ? 'var(--color-error)' : undefined }}
                  />
                  {isValidating && <p style={styles.hint}>Validating...</p>}
                  {routingValidation?.isValid && routingValidation.bankName && (
                    <p style={{ ...styles.hint, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      {routingValidation.bankName}
                      {routingValidation.city && routingValidation.state && <span style={{ fontWeight: 400 }}>({routingValidation.city}, {routingValidation.state})</span>}
                    </p>
                  )}
                  {hasRoutingError && (
                    <p style={{ ...styles.hint, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                      {routingValidation.error}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="bankName">Bank Name</label>
                  <input id="bankName" type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} readOnly={routingValidation?.isValid} style={{ backgroundColor: routingValidation?.isValid ? 'var(--color-neutral-200)' : undefined }} />
                  {routingValidation?.isValid && <p style={styles.hint}>Auto-filled from routing number</p>}
                </div>

                <div>
                  <label htmlFor="accountNumber">Account Number</label>
                  <input id="accountNumber" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Bank account number" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  <div>
                    <label htmlFor="accountType">Account Type</label>
                    <select id="accountType" value={accountType} onChange={(e) => setAccountType(e.target.value as AchAccountType | '')} required>
                      <option value="">Select type</option>
                      <option value="CHECKING">Checking</option>
                      <option value="SAVINGS">Savings</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="achType">eCheck Type</label>
                    <select id="achType" value={achType} onChange={(e) => setAchType(e.target.value as AchType)}>
                      <option value="TEL">TEL</option>
                      <option value="PPD">PPD</option>
                      <option value="CCD">CCD</option>
                      <option value="WEB">WEB</option>
                    </select>
                  </div>
                </div>

                {/* Billing Address */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-neutral-600)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing Address</p>

                  <div>
                    <label htmlFor="address1">Street Address</label>
                    <input id="address1" type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" />
                  </div>

                  <div>
                    <label htmlFor="address2">Address Line 2</label>
                    <input id="address2" type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apartment, suite, or township" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                    <div>
                      <label htmlFor="city">City</label>
                      <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                    </div>
                    <div>
                      <label htmlFor="state">State</label>
                      <input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="UT" maxLength={2} style={{ textTransform: 'uppercase' }} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="postalCode">ZIP Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input id="postalCode" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="84097" inputMode="numeric" maxLength={5} required />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                    <div>
                      <label htmlFor="checkNumber">Check Number <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input id="checkNumber" type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value.replace(/\D/g, ''))} placeholder="1104" inputMode="numeric" required />
                    </div>
                    <div>
                      <label htmlFor="customIdentifier">Custom Identifier <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input id="customIdentifier" type="text" value={customIdentifier} onChange={(e) => setCustomIdentifier(e.target.value)} placeholder="6549" required />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* ── RIGHT: Order summary + CSR script ─────────────────────── */}
            <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>

              <div className="card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                  <span className="card-title">Order Summary</span>
                </div>
                <div className="card-body">
                  <dl style={styles.summaryGrid}>
                    <SummaryRow label="Customer"    value={payerName || '—'} />
                    <SummaryRow label="Email"        value={email || '—'} />
                    <SummaryRow label="Amount"       value={amountDollars ? formatAmount(amountDollars) : '—'} highlight />
                    <SummaryRow label="Bank"         value={bankName || '—'} />
                    <SummaryRow label="Routing #"    value={routingNumber || '—'} />
                    <SummaryRow label="Account"      value={accountNumber ? `****${accountNumber.slice(-4)}` : '—'} />
                    <SummaryRow label="Account Type" value={formatAccountType(accountType)} />
                    <SummaryRow label="eCheck Type"  value={achType} />
                    <SummaryRow label="Check #"      value={checkNumber || '—'} />
                    <SummaryRow label="Custom ID"    value={customIdentifier || '—'} />
                    <SummaryRow label="Date"         value={today} />
                  </dl>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <span className="card-title">Read to Customer</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 'var(--text-base)', lineHeight: 1.75, color: 'var(--color-neutral-700)' }}>
                    <p style={{ marginBottom: 'var(--spacing-4)' }}>
                      "To confirm your order, I understand that you, <Highlight>{payerName || '___'}</Highlight>, authorize Unicity International to make a one-time charge of <Highlight>{amountDollars ? formatAmount(amountDollars) : '___'}</Highlight> to your <Highlight>{formatAccountType(accountType)}</Highlight> account today, <Highlight>{today}</Highlight>. You are also authorizing that this information is saved for faster checkout on future purchases to your account.
                    </p>
                    <p style={{ marginBottom: 'var(--spacing-4)' }}>
                      The total amount for this transaction is <Highlight>{amountDollars ? formatAmount(amountDollars) : '___'}</Highlight> on the bank information you provided: <Highlight>{bankName || '___'}</Highlight>, Routing Number <Highlight>{routingNumber || '___'}</Highlight>, Account Type <Highlight>{formatAccountType(accountType)}</Highlight>, Account Number <Highlight>{accountNumber ? `****${accountNumber.slice(-4)}` : '___'}</Highlight>.
                    </p>
                    <p style={{ fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: 'var(--spacing-4)' }}>
                      Is this information correct? (Wait for confirmation)
                    </p>
                    <p style={{ marginBottom: 'var(--spacing-2)' }}>
                      Once this transaction is processed, no further changes will be made to this specific authorization."
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-5)', marginTop: 'var(--spacing-2)' }}>
                    <label style={styles.authLabel}>
                      <input type="checkbox" form="ach-form" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} style={{ width: 20, height: 20, minWidth: 20, accentColor: 'var(--color-primary-500)', marginTop: 2 }} />
                      <span style={{ color: 'var(--color-neutral-700)' }}>Customer authorizes this charge</span>
                    </label>

                    {paymentResult && !paymentResult.success && (
                      <div style={styles.errorBanner}>
                        {paymentResult.error || `Payment ${paymentResult.status?.toLowerCase() ?? 'failed'}. Please verify details and try again.`}
                        {(paymentResult.processorCode || paymentResult.processorMessage) && (
                          <div style={styles.errorDetail}>
                            {paymentResult.processorCode ? `Processor code: ${paymentResult.processorCode}` : 'Processor detail available'}
                            {paymentResult.processorMessage ? ` - ${paymentResult.processorMessage}` : ''}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit" form="ach-form"
                      disabled={!isFormValid || isSubmitting}
                      className="btn btn-primary"
                      style={{ marginTop: 'var(--spacing-5)', width: '100%', padding: 'var(--spacing-4)', fontSize: 'var(--text-lg)', opacity: isFormValid && !isSubmitting ? 1 : 0.5, cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed' }}
                    >
                      {isSubmitting ? 'Processing...' : 'Pay Now'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ view, onViewChange, txCount }: { view: View; onViewChange: (v: View) => void; txCount: number }) {
  return (
    <nav className="nav">
      <span className="nav-logo">Unicity</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <NavTab label="Terminal"  active={view === 'terminal'}  onClick={() => onViewChange('terminal')} />
        <NavTab
          label={txCount > 0 ? `Activity (${txCount})` : 'Activity'}
          active={view === 'activity'}
          onClick={() => onViewChange('activity')}
        />
      </div>
    </nav>
  );
}

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 'var(--spacing-2) var(--spacing-4)',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--color-primary-900)' : 'var(--color-neutral-400)',
        borderBottom: active ? '3px solid var(--color-primary-500)' : '3px solid transparent',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {label}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Highlight({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'var(--color-primary-900)', fontWeight: 700 }}>{children}</strong>;
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <>
      <dt style={{ fontSize: '18px', color: 'var(--color-neutral-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </dt>
      <dd style={{ fontSize: highlight ? '30px' : 'var(--text-base)', fontWeight: highlight ? 800 : 400, color: highlight ? 'var(--color-primary-900)' : 'var(--color-neutral-800)', margin: 0 }}>
        {value}
      </dd>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  twoCol: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--spacing-6)',
    alignItems: 'flex-start',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 'var(--spacing-3) var(--spacing-6)',
    margin: 0,
  },
  currencyPrefix: {
    position: 'absolute' as const,
    left: 'var(--spacing-4)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-neutral-500)',
    pointerEvents: 'none' as const,
    fontSize: 'var(--text-base)',
  },
  hint: {
    marginTop: 'var(--spacing-2)',
    fontSize: '18px',
    color: 'var(--color-neutral-500)',
  },
  authLabel: {
    display: 'flex',
    alignItems: 'flex-start' as const,
    gap: 'var(--spacing-3)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  errorBanner: {
    marginTop: 'var(--spacing-4)',
    padding: 'var(--spacing-4)',
    backgroundColor: '#fef2f2',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    fontSize: '20px',
    color: 'var(--color-error)',
  },
  errorDetail: {
    marginTop: 'var(--spacing-2)',
    fontSize: '16px',
    color: 'var(--color-neutral-700)',
  },
};

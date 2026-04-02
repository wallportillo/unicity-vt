import { useState, useEffect } from 'react';
import { validateRoutingNumberAsync, type RoutingValidationResult } from './services';

export function App() {
  const [authorized, setAuthorized] = useState(false);
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingValidation, setRoutingValidation] = useState<RoutingValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate routing number when it reaches 9 digits
  useEffect(() => {
    const cleaned = routingNumber.replace(/[\s-]/g, '');

    // Reset validation if less than 9 digits
    if (cleaned.length < 9) {
      setRoutingValidation(null);
      return;
    }

    // Validate when we have 9 digits
    if (cleaned.length === 9) {
      setIsValidating(true);
      validateRoutingNumberAsync(cleaned)
        .then((result) => {
          setRoutingValidation(result);
          // Auto-fill bank name if valid
          if (result.isValid && result.bankName) {
            setBankName(result.bankName);
          }
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [routingNumber]);

  const hasRoutingError = routingValidation && !routingValidation.isValid && routingValidation.error;

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'var(--spacing-4)',
      maxWidth: '100%',
    }}>
      {/* Header */}
      <h1 style={{
        textAlign: 'center',
        color: 'var(--color-primary-900)',
        fontSize: 'var(--text-3xl)',
        fontWeight: 700,
        marginBottom: 'var(--spacing-8)',
        padding: '0 var(--spacing-4)',
      }}>
        Unicity Virtual Terminal
      </h1>

      {/* Bank Draft Card */}
      <div
        className="card"
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Card Header */}
        <div className="card-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <span className="card-title">Bank Draft</span>
        </div>

        {/* Form */}
        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div>
            <label htmlFor="payerName">Payer Name</label>
            <input id="payerName" type="text" placeholder="Enter your full name" />
          </div>

          <div>
            <label htmlFor="routingNumber">Routing Number</label>
            <input
              id="routingNumber"
              type="text"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="9-digit routing number"
              maxLength={9}
              style={{
                borderColor: hasRoutingError ? 'var(--color-error)' : undefined,
              }}
            />
            {/* Validation Messages */}
            {isValidating && (
              <p style={{
                marginTop: 'var(--spacing-2)',
                fontSize: '12px',
                color: 'var(--color-neutral-500)',
              }}>
                Validating...
              </p>
            )}
            {routingValidation?.isValid && routingValidation.bankName && (
              <p style={{
                marginTop: 'var(--spacing-2)',
                fontSize: '12px',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {routingValidation.bankName}
                {routingValidation.city && routingValidation.state && (
                  <span style={{ fontWeight: 400, marginLeft: '4px' }}>
                    ({routingValidation.city}, {routingValidation.state})
                  </span>
                )}
              </p>
            )}
            {hasRoutingError && (
              <p style={{
                marginTop: 'var(--spacing-2)',
                fontSize: '12px',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {routingValidation.error}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="bankName">Bank Name</label>
            <input
              id="bankName"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              readOnly={routingValidation?.isValid}
              style={{
                backgroundColor: routingValidation?.isValid ? 'var(--color-neutral-100)' : undefined,
              }}
            />
            {routingValidation?.isValid && (
              <p style={{
                marginTop: 'var(--spacing-1)',
                fontSize: '11px',
                color: 'var(--color-neutral-500)',
              }}>
                Auto-filled from routing number
              </p>
            )}
          </div>

          <div>
            <label htmlFor="accountNumber">Account Number</label>
            <input id="accountNumber" type="text" />
          </div>

          <div>
            <label htmlFor="accountType">Bank Account Type</label>
            <select id="accountType">
              <option value=""></option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>

          <div>
            <label htmlFor="echeckType">eCheck Type</label>
            <select id="echeckType">
              <option value="tel">TEL</option>
              <option value="ppd">PPD</option>
            </select>
          </div>
        </form>

        {/* CSR Script */}
        <div style={{
          marginTop: 'var(--spacing-6)',
          paddingTop: 'var(--spacing-4)',
          borderTop: '1px solid var(--color-border)'
        }}>
          <p style={{
            fontWeight: 600,
            color: 'var(--color-primary-900)',
            marginBottom: 'var(--spacing-2)'
          }}>
            CSRs please read to customers:
          </p>
          <p style={{
            color: 'var(--color-neutral-700)',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: 'var(--spacing-4)',
            wordWrap: 'break-word',
          }}>
            "To confirm your order, I understand that you, [Customer Name], authorize
            Unicity International to make a one-time charge to your [Bank Account Type]
            today [Date]. Also, you are authorizing that this information is saved for faster
            checkout on purchases in the future to your account.
          </p>
          <p style={{
            color: 'var(--color-neutral-700)',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: 'var(--spacing-4)',
            wordWrap: 'break-word',
          }}>
            The total amount for this transaction is [Order Total] on the bank information you
            provided, which is [Bank Name] with Routing Number [Routing Number], Account
            Type [Account Type], and Account Number [Account Number].
          </p>
          <p style={{
            fontWeight: 600,
            color: 'var(--color-primary-900)',
            marginBottom: 'var(--spacing-2)'
          }}>
            Is this information correct? (Wait for confirmation)
          </p>
          <p style={{
            color: 'var(--color-neutral-700)',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: 'var(--spacing-5)',
            wordWrap: 'break-word',
          }}>
            Once this transaction is processed, no further changes will be made to this
            specific authorization.
          </p>

          {/* Authorization Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-2)',
            cursor: 'pointer',
            fontWeight: 400,
            color: 'var(--color-primary-500)',
            marginBottom: 0,
          }}>
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                minWidth: '18px',
                accentColor: 'var(--color-primary-500)',
                marginTop: '2px',
              }}
            />
            <span>Do you authorize this charge?</span>
          </label>

          {/* Pay Now Button */}
          <button
            type="submit"
            disabled={!authorized}
            className="btn btn-primary"
            style={{
              marginTop: 'var(--spacing-4)',
              width: '100%',
              padding: 'var(--spacing-4)',
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              opacity: authorized ? 1 : 0.5,
              cursor: authorized ? 'pointer' : 'not-allowed',
            }}
          >
            Pay Now
          </button>
        </div>
      </div>
    </div>
  );
}

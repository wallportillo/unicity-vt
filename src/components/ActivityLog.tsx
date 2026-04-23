import type { TransactionEntry } from '../types';

const STORAGE_KEY = 'unicity_tx_log';

export function loadLog(): TransactionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransactionEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendToLog(entry: TransactionEntry): void {
  const log = loadLog();
  log.unshift(entry); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 200))); // cap at 200
}

export function clearLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  log: TransactionEntry[];
  onClear: () => void;
}

export function ActivityLog({ log, onClear }: Props) {
  if (log.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--spacing-12) var(--spacing-8)' }}>
        <div style={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.5" style={{ marginBottom: 'var(--spacing-4)' }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
          <p style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--text-lg)', margin: 0 }}>
            No transactions yet
          </p>
          <p style={{ color: 'var(--color-neutral-300)', fontSize: 'var(--text-base)', margin: 0, marginTop: 'var(--spacing-1)' }}>
            Transactions will appear here after Pay Now is pressed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--spacing-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-6)' }}>
        <h2 style={{ color: 'var(--color-primary-900)', margin: 0 }}>
          Transaction Activity
          <span style={styles.countBadge}>{log.length}</span>
        </h2>
        <button className="btn btn-ghost" onClick={onClear} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-400)' }}>
          Clear log
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {log.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

// ── Transaction card ─────────────────────────────────────────────────────────

function TransactionCard({ tx }: { tx: TransactionEntry }) {
  const isSuccess = tx.status === 'AUTHORISED';
  const amountFormatted = (tx.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const date = new Date(tx.timestamp);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="card">
      {/* Status banner */}
      <div style={{ ...styles.statusBanner, backgroundColor: isSuccess ? 'var(--color-success)' : statusColor(tx.status) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <StatusIcon status={tx.status} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
            {tx.status}
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--text-sm)' }}>
          {dateStr} · {timeStr}
        </span>
      </div>

      <div className="card-body">
        <div style={styles.cardGrid}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <Field label="Payer"   value={tx.payerName} large />
            <Field label="Amount"  value={amountFormatted} large accent />
            <Field label="Email"   value={tx.email} />
            <Field label="Order"   value={tx.orderCode} mono />
            {tx.authorisationId && (
              <Field label="Auth ID" value={tx.authorisationId} mono />
            )}
            {tx.errorMessage && (
              <div style={styles.errorBox}>{tx.errorMessage}</div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <Field label="Bank"         value={tx.bankName} />
            <Field label="Routing #"    value={tx.routingNumber} />
            <Field label="Account"      value={`****${tx.accountNumberLast4}`} />
            <Field label="Account Type" value={tx.accountType} />
            <Field label="eCheck Type"  value={tx.achType} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, large, accent, mono }: {
  label: string;
  value: string;
  large?: boolean;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '16px', color: 'var(--color-neutral-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? '26px' : 'var(--text-base)',
        fontWeight: large ? 700 : 400,
        color: accent ? 'var(--color-primary-900)' : 'var(--color-neutral-800)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TransactionEntry['status'] }) {
  if (status === 'AUTHORISED') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function statusColor(status: TransactionEntry['status']): string {
  switch (status) {
    case 'REFUSED':   return '#B45309';
    case 'CANCELLED': return '#6B7280';
    default:          return 'var(--color-error)';
  }
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: 'var(--spacing-16)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    textAlign: 'center' as const,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'var(--spacing-3)',
    padding: '2px 10px',
    background: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    verticalAlign: 'middle',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-3) var(--spacing-5)',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-6)',
  },
  errorBox: {
    padding: 'var(--spacing-3)',
    backgroundColor: '#fef2f2',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-error)',
    wordBreak: 'break-word' as const,
  },
};

---
name: persisting-transaction-history
emoji: 📋
description: Transaction history persistence patterns using localStorage — storage key, 200-record cap, newest-first ordering, safe parse/clear, and React state sync. Use when modifying ActivityLog.tsx, changing TransactionEntry fields, adding transaction filtering, or working with the tx log in App.tsx.
---

# Persisting Transaction History

Patterns for storing and reading transaction history in `src/components/ActivityLog.tsx`.

## Contents

- [Use a Namespaced Storage Key](#use-a-namespaced-storage-key)
- [Always Load Through loadLog](#always-load-through-loadlog)
- [Cap the Log at 200 Entries on Every Write](#cap-the-log-at-200-entries-on-every-write)
- [Insert New Entries at the Front](#insert-new-entries-at-the-front)
- [Wrap All localStorage Calls in Try/Catch](#wrap-all-localstorage-calls-in-trycatch)
- [Sync React State After Every Log Mutation](#sync-react-state-after-every-log-mutation)
- [Never Store Full Account Numbers in TransactionEntry](#never-store-full-account-numbers-in-transactionentry)
- [Clear with removeItem, Not setItem Empty](#clear-with-removeitem-not-setitem-empty)

---

## Use a Namespaced Storage Key

All localStorage access must go through the single constant `STORAGE_KEY`. Never hardcode the key string at a call site.

```ts
// In ActivityLog.tsx
const STORAGE_KEY = 'unicity_tx_log';
```

If a second log type is added in the future (e.g., refunds), use a distinct key: `'unicity_refund_log'`.

Why: a single constant prevents key typos that silently create a second orphaned log.

---

## Always Load Through loadLog

Never call `localStorage.getItem(STORAGE_KEY)` directly from `App.tsx` or any component. Use `loadLog()` exclusively.

```ts
export function loadLog(): TransactionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransactionEntry[]) : [];
  } catch {
    return [];
  }
}
```

Initialize React state with it as a lazy initializer:

```ts
const [txLog, setTxLog] = useState<TransactionEntry[]>(() => loadLog());
```

Why: centralizing the read path means parse errors and missing-key handling are handled once, not duplicated in every consumer.

---

## Cap the Log at 200 Entries on Every Write

`appendToLog` must enforce the cap on every write — never let the log grow unbounded.

```ts
export function appendToLog(entry: TransactionEntry): void {
  const log = loadLog();
  log.unshift(entry);                                          // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 200)));  // cap at 200
}
```

The `slice(0, 200)` runs after `unshift`, so the newest entry is always kept and the oldest is dropped.

Why: localStorage has a ~5MB browser limit. Each `TransactionEntry` is ~500 bytes; 200 entries = ~100KB, leaving ample headroom. Without the cap, a long-running terminal session would eventually hit a `QuotaExceededError`.

---

## Insert New Entries at the Front

Always `unshift` new entries — never `push`. The log is displayed newest-first in `ActivityLog`.

```ts
log.unshift(entry); // index 0 = most recent
```

The `ActivityLog` component renders with `log.map(...)` — no reverse needed because the order is already correct.

Why: CSRs look up the most recent transaction first. Newest-first avoids scrolling to the bottom after every transaction.

---

## Wrap All localStorage Calls in Try/Catch

Every `localStorage` call can throw (storage full, private browsing mode, browser restrictions). Always catch and fail gracefully.

```ts
// Read — return empty array on failure
export function loadLog(): TransactionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransactionEntry[]) : [];
  } catch {
    return [];
  }
}

// Write — silent fail (do not throw to the UI)
export function appendToLog(entry: TransactionEntry): void {
  try {
    const log = loadLog();
    log.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 200)));
  } catch {
    // Storage unavailable — entry is lost but the payment already succeeded
  }
}
```

Why: a localStorage failure must never block or crash the payment flow. The payment has already been authorized; log persistence is best-effort.

---

## Sync React State After Every Log Mutation

After calling `appendToLog` or `clearLog`, immediately re-read state from `loadLog()` to keep React in sync.

```ts
// After a successful payment
appendToLog(entry);
setTxLog(loadLog());

// After clearing
clearLog();
setTxLog([]);
```

Never mutate the `txLog` array directly in React state. Always reload from the source of truth.

Why: `localStorage` is the source of truth. Reloading after write ensures the React state reflects exactly what was persisted, including any truncation from the 200-entry cap.

---

## Never Store Full Account Numbers in TransactionEntry

`TransactionEntry` stores `accountNumberLast4` only — never the full account number.

```ts
// In handleSubmit (App.tsx)
accountNumberLast4: accountNumber.trim().slice(-4),

// TransactionEntry type
accountNumberLast4: string;  // only last 4 digits
```

Do not add a full `accountNumber` field to `TransactionEntry` for any reason.

Why: localStorage is readable by any JavaScript on the page and is not encrypted. Storing full account numbers in localStorage is a PCI DSS violation.

---

## Clear with removeItem, Not setItem Empty

`clearLog` must use `removeItem` to fully delete the key — not `setItem('[]')`.

```ts
export function clearLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

After clear, `loadLog()` returns `[]` because the key is absent and the fallback is an empty array.

Why: `setItem(key, '[]')` leaves the key present with an empty array, which is functionally equivalent but wastes a storage entry and adds unnecessary JSON parsing on load.

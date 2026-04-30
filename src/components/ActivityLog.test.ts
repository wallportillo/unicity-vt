import { describe, it, expect, beforeEach } from 'vitest';
import { loadLog, appendToLog, clearLog } from './ActivityLog';
import type { TransactionEntry } from '../types';

const makeEntry = (overrides: Partial<TransactionEntry> = {}): TransactionEntry => ({
  id: `ACH-${Date.now()}-TEST`,
  timestamp: new Date().toISOString(),
  payerName: 'Test User',
  email: 'test@example.com',
  amount: 4999,
  bankName: 'Test Bank',
  accountType: 'Checking',
  achType: 'TEL',
  routingNumber: '021000021',
  accountNumberLast4: '6789',
  orderCode: 'ACH-123',
  status: 'AUTHORISED',
  ...overrides,
});

describe('loadLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when localStorage has no entry', () => {
    expect(loadLog()).toEqual([]);
  });

  it('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem('unicity_tx_log', 'not-json{{');
    expect(loadLog()).toEqual([]);
  });

  it('returns parsed entries when log exists', () => {
    const entry = makeEntry();
    localStorage.setItem('unicity_tx_log', JSON.stringify([entry]));
    expect(loadLog()).toHaveLength(1);
    expect(loadLog()[0].id).toBe(entry.id);
  });
});

describe('appendToLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds entry to an empty log', () => {
    appendToLog(makeEntry({ id: 'entry-1' }));
    expect(loadLog()).toHaveLength(1);
  });

  it('inserts new entries at the front (newest first)', () => {
    appendToLog(makeEntry({ id: 'entry-1' }));
    appendToLog(makeEntry({ id: 'entry-2' }));

    const log = loadLog();
    expect(log[0].id).toBe('entry-2');
    expect(log[1].id).toBe('entry-1');
  });

  it('caps log at 200 entries', () => {
    for (let i = 0; i < 205; i++) {
      appendToLog(makeEntry({ id: `entry-${i}` }));
    }
    expect(loadLog()).toHaveLength(200);
  });

  it('keeps the newest entries when cap is exceeded', () => {
    for (let i = 0; i < 201; i++) {
      appendToLog(makeEntry({ id: `entry-${i}` }));
    }
    const log = loadLog();
    // Newest entry (entry-200) should be first
    expect(log[0].id).toBe('entry-200');
    // Oldest entry (entry-0) should have been dropped
    expect(log.find(e => e.id === 'entry-0')).toBeUndefined();
  });
});

describe('clearLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes all entries', () => {
    appendToLog(makeEntry());
    appendToLog(makeEntry());
    clearLog();
    expect(loadLog()).toEqual([]);
  });

  it('removes the key from localStorage entirely', () => {
    appendToLog(makeEntry());
    clearLog();
    expect(localStorage.getItem('unicity_tx_log')).toBeNull();
  });

  it('is safe to call on an already-empty log', () => {
    expect(() => clearLog()).not.toThrow();
  });
});

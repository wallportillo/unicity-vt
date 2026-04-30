import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRoutingNumber, validateRoutingNumberAsync } from './routingValidation';

describe('validateRoutingNumber (sync, checksum only)', () => {
  it('returns invalid for empty input', () => {
    expect(validateRoutingNumber('').isValid).toBe(false);
  });

  it('returns invalid for fewer than 9 digits', () => {
    expect(validateRoutingNumber('12345678').isValid).toBe(false);
  });

  it('returns invalid for non-digit characters', () => {
    const result = validateRoutingNumber('12345678A');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/9 digits/i);
  });

  it('returns invalid for a 9-digit number with bad checksum', () => {
    // 123456789: 3*(1+4+7) + 7*(2+5+8) + (3+6+9) = 36+105+18 = 159, 159%10=9 ≠ 0
    const result = validateRoutingNumber('123456789');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/checksum/i);
  });

  it('returns valid for a real routing number (JPMorgan Chase)', () => {
    // 021000021 passes the ABA checksum
    const result = validateRoutingNumber('021000021');
    expect(result.isValid).toBe(true);
  });

  it('strips spaces and dashes before validating', () => {
    expect(validateRoutingNumber('0210-0002-1').isValid).toBe(true);
    expect(validateRoutingNumber('021 000 021').isValid).toBe(true);
  });
});

describe('validateRoutingNumberAsync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns invalid for empty input without calling API', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await validateRoutingNumberAsync('');
    expect(result.isValid).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns invalid for bad checksum without calling API', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // 123456789 fails ABA checksum: sum=159, 159%10=9 ≠ 0
    const result = await validateRoutingNumberAsync('123456789');
    expect(result.isValid).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns bank info when API call succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isValid: true,
        bankName: 'JPMorgan Chase',
        city: 'New York',
        state: 'NY',
      }),
    }));

    const result = await validateRoutingNumberAsync('021000021');
    expect(result.isValid).toBe(true);
    expect(result.bankName).toBe('JPMorgan Chase');
    expect(result.city).toBe('New York');
  });

  it('returns invalid when bank not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isValid: false,
        error: 'Routing number does not match any banks in the USA',
      }),
    }));

    const result = await validateRoutingNumberAsync('021000021');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid when API is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await validateRoutingNumberAsync('021000021');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Unable to verify/i);
  });
});

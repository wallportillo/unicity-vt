import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAchPayment } from './achPayment';
import type { AchPaymentRequest } from '../types';

const baseRequest: AchPaymentRequest = {
  payerName: 'Jane Smith',
  email: 'jane@example.com',
  routingNumber: '021000021',
  bankName: 'JPMorgan Chase',
  accountNumber: '123456789',
  accountType: 'CHECKING',
  achType: 'TEL',
  amount: 4999,
  orderCode: 'ACH-1234567890-ABC123',
  description: 'Unicity Purchase',
  postalCode: '84097',
  checkNumber: '1104',
  customIdentifier: '6549',
};

describe('submitAchPayment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success result when payment is authorised', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: 'AUTHORISED',
        orderCode: 'ACH-1234567890-ABC123',
        authorisationId: 'AUTH-999',
      }),
    }));

    const result = await submitAchPayment(baseRequest);

    expect(result.success).toBe(true);
    expect(result.orderCode).toBe('ACH-1234567890-ABC123');
    expect(result.authorisationId).toBe('AUTH-999');
  });

  it('returns failure result when payment is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        status: 'REFUSED',
        error: 'Payment refused.',
      }),
    }));

    const result = await submitAchPayment(baseRequest);

    expect(result.success).toBe(false);
    expect(result.status).toBe('REFUSED');
    expect(result.error).toBe('Payment refused.');
  });

  it('returns generic error when response is not ok and has no error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    }));

    const result = await submitAchPayment(baseRequest);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Payment request failed/i);
  });

  it('returns network error when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await submitAchPayment(baseRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('sends request to the correct endpoint with JSON content type', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await submitAchPayment(baseRequest);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payment/ach'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });
});

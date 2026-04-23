import type { AchPaymentRequest, AchPaymentResult } from '../types';

const API_BASE = '';

export async function submitAchPayment(
  request: AchPaymentRequest
): Promise<AchPaymentResult> {
  try {
    const response = await fetch(`${API_BASE}/api/payment/ach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data: AchPaymentResult = await response.json();

    if (!response.ok && !data.error) {
      return { success: false, error: 'Payment request failed. Please try again.' };
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Network error. Please try again. (${message})` };
  }
}

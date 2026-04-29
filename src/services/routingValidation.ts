/**
 * Routing Number Validation Service
 * Validates US bank routing numbers via backend proxy
 *
 * Backend proxies to BankRouting.io API to avoid CORS issues
 * - Data source: Federal Reserve (7,693+ institutions)
 */

export interface RoutingValidationResult {
  isValid: boolean;
  bankName?: string;
  city?: string;
  state?: string;
  error?: string;
}

// Use local backend proxy to avoid CORS issues
const API_BASE_URL = '/api/routing';

/**
 * Validates the checksum of a routing number using the ABA algorithm
 * Used for quick client-side validation before API call
 */
function validateChecksum(routingNumber: string): boolean {
  if (!/^\d{9}$/.test(routingNumber)) {
    return false;
  }

  const digits = routingNumber.split('').map(Number);

  // ABA routing number checksum algorithm
  // 3(d1 + d4 + d7) + 7(d2 + d5 + d8) + (d3 + d6 + d9) mod 10 = 0
  const sum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  return sum % 10 === 0;
}

/**
 * Validates a routing number synchronously (checksum only)
 * Use validateRoutingNumberAsync for full validation with bank lookup
 */
export function validateRoutingNumber(routingNumber: string): RoutingValidationResult {
  const cleaned = routingNumber.replace(/[\s-]/g, '');

  if (!cleaned) {
    return { isValid: false };
  }

  if (!/^\d{9}$/.test(cleaned)) {
    if (cleaned.length < 9) {
      return { isValid: false };
    }
    return {
      isValid: false,
      error: 'Routing number must be exactly 9 digits',
    };
  }

  if (!validateChecksum(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid routing number checksum',
    };
  }

  // Checksum valid, but need API call for bank name
  return { isValid: true };
}

/**
 * Validates a routing number using the backend proxy API
 * Returns bank name, city, and state if valid
 */
export async function validateRoutingNumberAsync(
  routingNumber: string,
  signal?: AbortSignal
): Promise<RoutingValidationResult> {
  const cleaned = routingNumber.replace(/[\s-]/g, '');

  // Quick validation before API call
  if (!cleaned) {
    return { isValid: false };
  }

  if (!/^\d{9}$/.test(cleaned)) {
    if (cleaned.length < 9) {
      return { isValid: false };
    }
    return {
      isValid: false,
      error: 'Routing number must be exactly 9 digits',
    };
  }

  // Validate checksum locally first to save API calls
  if (!validateChecksum(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid routing number checksum',
    };
  }

  // Call the backend proxy API
  try {
    const response = await fetch(`${API_BASE_URL}/${cleaned}`, { signal });
    const data: RoutingValidationResult = await response.json();

    // Backend already returns the correct format
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    // Network error or API unavailable
    console.error('Routing validation API error:', error);

    return {
      isValid: false,
      error: 'Unable to verify routing number right now. Please try again.',
    };
  }
}

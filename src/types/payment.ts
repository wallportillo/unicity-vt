// WorldPay WPG ACH payment types

export type AchAccountType = 'CHECKING' | 'SAVINGS';

// WorldPay-supported ACH entry class codes
export type AchType = 'TEL' | 'PPD' | 'CCD' | 'WEB';

export interface AchPaymentRequest {
  payerName: string;
  email: string;
  routingNumber: string;
  bankName: string;
  accountNumber: string;
  accountType: AchAccountType;
  achType: AchType;
  amount: number; // in cents (e.g. 1000 = $10.00)
  orderCode: string;
  description: string;
  // Billing address — postalCode and countryCode required by WorldPay DTD
  address1?: string;
  city?: string;
  state?: string;
  postalCode: string;
}

export type PaymentStatus = 'AUTHORISED' | 'REFUSED' | 'ERROR' | 'CANCELLED';

export interface AchPaymentResult {
  success: boolean;
  status?: PaymentStatus;
  orderCode?: string;
  authorisationId?: string;
  error?: string;
}

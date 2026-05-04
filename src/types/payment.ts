// WorldPay WPG ACH payment types

export type AchAccountType = 'CHECKING' | 'SAVINGS';

// WorldPay-supported ACH entry class codes
export type AchType = 'TEL' | 'PPD' | 'CCD' | 'WEB';

export interface AchPaymentRequest {
  firstName: string;
  lastName: string;
  email: string;
  routingNumber: string;
  bankName: string;
  accountNumber: string;
  accountType: AchAccountType;
  achType: AchType;
  amount: number; // in cents (e.g. 1000 = $10.00)
  orderCode: string;
  description: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  customIdentifier: string;
}

export type PaymentStatus = 'AUTHORISED' | 'CAPTURED' | 'REFUSED' | 'ERROR' | 'CANCELLED';

export interface AchPaymentResult {
  success: boolean;
  status?: PaymentStatus;
  orderCode?: string;
  authorisationId?: string;
  error?: string;
  processorCode?: string;
  processorMessage?: string;
}

export interface TransactionEntry {
  id: string;
  timestamp: string;        // ISO string
  payerName: string;
  email: string;
  amount: number;           // cents
  bankName: string;
  accountType: string;
  achType: string;
  routingNumber: string;
  accountNumberLast4: string;
  orderCode: string;
  status: 'AUTHORISED' | 'REFUSED' | 'ERROR' | 'CANCELLED';
  authorisationId?: string;
  errorMessage?: string;
  rawStatus?: string;
}

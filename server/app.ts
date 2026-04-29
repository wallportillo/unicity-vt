import express from 'express';
import cors from 'cors';

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();

// Enable CORS for frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Simple in-memory cache for routing numbers
const routingCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface BankRoutingApiResponse {
  status: 'success' | 'error';
  data?: {
    aba_number: string;
    bank_name: string;
    city: string;
    state: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/routing/:routingNumber
 * Validates a routing number and returns bank information
 */
app.get('/api/routing/:routingNumber', async (req, res) => {
  const { routingNumber } = req.params;

  if (!/^\d{9}$/.test(routingNumber)) {
    return res.status(400).json({ isValid: false, error: 'Routing number must be exactly 9 digits' });
  }

  const cached = routingCache.get(routingNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${routingNumber}`);
    return res.json(cached.data);
  }

  try {
    console.log(`[API Call] ${routingNumber}`);
    const response = await fetch(`https://bankrouting.io/api/v1/aba/${routingNumber}`);

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ isValid: false, error: 'Rate limit exceeded. Please try again later.' });
      }
      throw new Error(`API returned ${response.status}`);
    }

    const apiData: BankRoutingApiResponse = await response.json();

    if (apiData.status === 'success' && apiData.data) {
      const result = {
        isValid: true,
        bankName: apiData.data.bank_name,
        city: apiData.data.city,
        state: apiData.data.state,
      };
      routingCache.set(routingNumber, { data: result, timestamp: Date.now() });
      return res.json(result);
    }

    if (apiData.status === 'error') {
      return res.json({
        isValid: true,
        error: 'Bank not found — please confirm the routing number is correct.',
      });
    }

    return res.json({ isValid: true, error: 'Bank not found — please confirm the routing number is correct.' });
  } catch (error) {
    console.error('Routing API Error:', error);
    return res.status(500).json({ isValid: false, error: 'Unable to validate routing number. Please try again.' });
  }
});

// ─── WorldPay ACH ─────────────────────────────────────────────────────────────

interface AchPaymentRequestBody {
  payerName: string;
  email: string;
  routingNumber: string;
  bankName: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  achType: 'TEL' | 'PPD' | 'CCD' | 'WEB';
  amount: number;        // in cents
  orderCode: string;
  description: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode: string;
  checkNumber: string;
  customIdentifier: string;
}

interface WorldPayRequestMetadata {
  sessionId: string;
  shopperIpAddress: string;
  acceptHeader: string;
  userAgentHeader: string;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function validateAchPaymentRequest(body: AchPaymentRequestBody) {
  if (!body.payerName || !body.routingNumber || !body.accountNumber || !body.accountType || !body.amount || !body.orderCode) {
    return 'Missing required payment fields.';
  }

  if (!/^\d{9}$/.test(body.routingNumber)) {
    return 'Invalid routing number format.';
  }

  if (!/^\d+$/.test(body.accountNumber)) {
    return 'Invalid account number format.';
  }

  if (!/^\d{5}$/.test(body.postalCode)) {
    return 'Invalid ZIP code format.';
  }

  if (!/^\d+$/.test(body.checkNumber)) {
    return 'Invalid check number format.';
  }

  if (!body.customIdentifier.trim()) {
    return 'Custom identifier is required.';
  }

  if (!isPositiveInteger(body.amount)) {
    return 'Amount must be a positive whole number of cents.';
  }

  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) {
    return 'Invalid account type.';
  }

  if (!['TEL', 'PPD', 'CCD', 'WEB'].includes(body.achType)) {
    return 'Invalid ACH type.';
  }

  return null;
}

function formatWorldPayAccountType(accountType: AchPaymentRequestBody['accountType']) {
  return accountType === 'CHECKING' ? 'Checking' : 'Savings';
}

function buildSessionId() {
  return `ssn${Date.now()}`;
}

function normalizeShopperIpAddress(req: express.Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const rawIp = (firstForwarded ?? req.ip ?? '127.0.0.1').trim();

  if (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  return rawIp.replace(/^::ffff:/, '');
}

function buildWorldPayXml(
  merchantCode: string,
  body: AchPaymentRequestBody,
  metadata: WorldPayRequestMetadata,
): string {
  const { payerName, email, routingNumber, accountNumber, accountType, amount, orderCode, description, address1, address2, city, state, postalCode, checkNumber, customIdentifier } = body;
  const { sessionId, shopperIpAddress, acceptHeader, userAgentHeader } = metadata;

  const nameParts = payerName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${escapeXml(merchantCode)}">
  <submit>
    <order orderCode="${escapeXml(orderCode)}">
      <description>${escapeXml(description)}</description>
      <amount value="${amount}" currencyCode="USD" exponent="2"/>
      <orderContent><![CDATA[]]></orderContent>
      <paymentDetails>
        <ACH_DIRECT_DEBIT-SSL>
          <echeckSale>
            <billingAddress>
              <address>
                <firstName>${escapeXml(firstName)}</firstName>
                <lastName>${escapeXml(lastName)}</lastName>
                ${address1 ? `<address1>${escapeXml(address1)}</address1>` : ''}
                ${address2 ? `<address2>${escapeXml(address2)}</address2>` : ''}
                <postalCode>${escapeXml(postalCode)}</postalCode>
                ${city ? `<city>${escapeXml(city)}</city>` : ''}
                ${state ? `<state>${escapeXml(state)}</state>` : ''}
                <countryCode>US</countryCode>
              </address>
            </billingAddress>
            <bankAccountType>${formatWorldPayAccountType(accountType)}</bankAccountType>
            <accountNumber>${escapeXml(accountNumber)}</accountNumber>
            <routingNumber>${escapeXml(routingNumber)}</routingNumber>
            <checkNumber>${escapeXml(checkNumber)}</checkNumber>
            <customIdentifier>${escapeXml(customIdentifier)}</customIdentifier>
          </echeckSale>
        </ACH_DIRECT_DEBIT-SSL>
        <session shopperIPAddress="${escapeXml(shopperIpAddress)}" id="${escapeXml(sessionId)}"/>
      </paymentDetails>
      <shopper>
        <shopperEmailAddress>${escapeXml(email)}</shopperEmailAddress>
        <browser>
          <acceptHeader>${escapeXml(acceptHeader)}</acceptHeader>
          <userAgentHeader>${escapeXml(userAgentHeader)}</userAgentHeader>
        </browser>
      </shopper>
    </order>
  </submit>
</paymentService>`;
}

function maskXmlSensitiveFields(xml: string) {
  return xml
    .replace(/<accountNumber>[^<]*<\/accountNumber>/, '<accountNumber>****MASKED****</accountNumber>')
    .replace(/<routingNumber>[^<]*<\/routingNumber>/, '<routingNumber>****MASKED****</routingNumber>');
}

function buildMaskedWorldPayPreview(
  merchantCode: string,
  body: AchPaymentRequestBody,
  metadata: WorldPayRequestMetadata,
) {
  return maskXmlSensitiveFields(buildWorldPayXml(merchantCode, body, metadata));
}

function humanizeWorldPayStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildWorldPayDeclineMessage(status?: string, processorCode?: string, processorMessage?: string) {
  const normalizedMessage = processorMessage?.toLowerCase() ?? '';

  if (status === 'REFUSED') {
    if (normalizedMessage.includes('insufficient funds')) {
      return 'The bank declined the ACH transaction for insufficient funds. Confirm another payment method or retry later.';
    }
    if (normalizedMessage.includes('account closed')) {
      return 'The bank declined the ACH transaction because the account is closed. Confirm a different bank account.';
    }
    if (normalizedMessage.includes('invalid account')) {
      return 'The bank declined the ACH transaction because the account number appears invalid. Confirm the account details and try again.';
    }
    if (normalizedMessage.includes('invalid routing')) {
      return 'The bank declined the ACH transaction because the routing number appears invalid. Confirm the routing details and try again.';
    }
    if (normalizedMessage.includes('unauthor') || normalizedMessage.includes('authorization')) {
      return 'The bank declined the ACH transaction because the authorization could not be confirmed. Re-read the authorization and retry if appropriate.';
    }
    return 'The bank declined the ACH transaction. Confirm the bank details or collect a different payment method.';
  }

  if (status === 'CANCELLED') {
    return 'The ACH transaction was cancelled before completion.';
  }

  if (normalizedMessage.includes('duplicate')) {
    return 'The processor rejected the ACH transaction as a duplicate order. Confirm whether this payment was already submitted before retrying.';
  }

  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('temporar') || normalizedMessage.includes('unavailable')) {
    return 'The payment processor is temporarily unavailable. Wait a moment and try the ACH transaction again.';
  }

  if (normalizedMessage.includes('invalid') && normalizedMessage.includes('account')) {
    return 'The processor rejected the ACH transaction because the account information appears invalid. Confirm the account details and retry.';
  }

  if (normalizedMessage.includes('invalid') && normalizedMessage.includes('routing')) {
    return 'The processor rejected the ACH transaction because the routing information appears invalid. Confirm the routing details and retry.';
  }

  if (processorCode) {
    return `The payment processor declined the ACH transaction (code ${processorCode}). ${processorMessage ?? 'Review the order details and try again.'}`;
  }

  if (processorMessage) {
    return `The payment processor declined the ACH transaction. ${processorMessage}`;
  }

  if (status) {
    return `The payment processor reported ${humanizeWorldPayStatus(status)} for this ACH transaction. Review the order details and try again if appropriate.`;
  }

  return 'The payment processor could not complete the ACH transaction. Review the order details and try again.';
}

function buildWorldPayHttpErrorMessage(httpStatus: number, parsedResult?: {
  error?: string;
  processorCode?: string;
  processorMessage?: string;
}) {
  if (parsedResult?.error && parsedResult.error !== 'Unexpected response from payment processor.') {
    return parsedResult.error;
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return 'WorldPay rejected the merchant credentials or test-endpoint configuration. Confirm the merchant code, XML password, and environment.';
  }

  if (httpStatus === 400) {
    return 'WorldPay rejected the ACH payload. Confirm the required field values and payload format for this merchant profile.';
  }

  if (httpStatus === 404) {
    return 'WorldPay could not process the ACH request at this endpoint. Confirm the test endpoint URL and merchant environment.';
  }

  if (httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) {
    return 'WorldPay is temporarily unavailable or throttling requests. Wait a moment and try the ACH transaction again.';
  }

  return 'Payment processor returned an error.';
}

function parseWorldPayResponse(xml: string): { success: boolean; status?: string; orderCode?: string; authorisationId?: string; error?: string; processorCode?: string; processorMessage?: string } {
  const lastEventMatch = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/);
  const lastEvent = lastEventMatch?.[1];

  const orderCodeMatch = xml.match(/orderCode="([^"]+)"/);
  const orderCode = orderCodeMatch?.[1];

  const authIdMatch = xml.match(/<AuthorisationId\s+id="([^"]+)"/);
  const authorisationId = authIdMatch?.[1];

  const errorCodeMatch = xml.match(/<error[^>]*code="([^"]+)"/);
  const processorCode = errorCodeMatch?.[1];
  const errorMatch = xml.match(/<error[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/error>/);
  const processorMessage = errorMatch?.[1]?.trim();

  if (lastEvent === 'AUTHORISED') {
    return {
      success: true,
      status: lastEvent,
      orderCode,
      authorisationId,
      processorCode,
      processorMessage,
    };
  }

  if (lastEvent) {
    return {
      success: false,
      status: lastEvent,
      orderCode,
      processorCode,
      processorMessage,
      error: buildWorldPayDeclineMessage(lastEvent, processorCode, processorMessage),
    };
  }

  if (processorMessage || processorCode) {
    return {
      success: false,
      processorCode,
      processorMessage,
      error: buildWorldPayDeclineMessage(undefined, processorCode, processorMessage),
    };
  }

  return { success: false, error: 'Unexpected response from payment processor.' };
}

/**
 * POST /api/payment/ach
 * Proxies ACH payment to WorldPay WPG
 */
app.post('/api/payment/ach', async (req, res) => {
  const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';
  const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
  const WP_XML_PASSWORD = process.env.WORLDPAY_XML_PASSWORD ?? '';

  if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
    console.error('[WorldPay] Missing WORLDPAY_MERCHANT_CODE or WORLDPAY_XML_PASSWORD env vars');
    return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
  }

  const body: AchPaymentRequestBody = req.body;

  const validationError = validateAchPaymentRequest(body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const xml = buildWorldPayXml(WP_MERCHANT_CODE, body, {
    sessionId: buildSessionId(),
    shopperIpAddress: normalizeShopperIpAddress(req),
    acceptHeader: req.get('accept') ?? '*/*',
    userAgentHeader: req.get('user-agent') ?? 'Unknown',
  });
  const credentials = Buffer.from(`${WP_MERCHANT_CODE}:${WP_XML_PASSWORD}`).toString('base64');

  try {
    console.log(`[WorldPay] Submitting ACH order ${body.orderCode}`);
    const wpResponse = await fetch(WP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        Authorization: `Basic ${credentials}`,
      },
      body: xml,
    });

    const responseText = await wpResponse.text();
    console.log(`[WorldPay] Response status: ${wpResponse.status}`);
    console.log(`[WorldPay] Raw response:\n${responseText}`);

    if (!wpResponse.ok) {
      console.error('[WorldPay] HTTP error status:', wpResponse.status);
      const parsedResult = parseWorldPayResponse(responseText);
      return res.status(502).json({
        success: false,
        status: parsedResult.status as 'AUTHORISED' | 'REFUSED' | 'ERROR' | 'CANCELLED' | undefined,
        orderCode: parsedResult.orderCode,
        processorCode: parsedResult.processorCode,
        processorMessage: parsedResult.processorMessage,
        error: buildWorldPayHttpErrorMessage(wpResponse.status, parsedResult),
      });
    }

    const result = parseWorldPayResponse(responseText);
    return res.status(result.success ? 200 : 402).json(result);
  } catch (error) {
    console.error('[WorldPay] Request failed:', error);
    return res.status(502).json({ success: false, error: 'Unable to reach payment processor. Please try again.' });
  }
});

app.post('/api/payment/ach/preview', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found.' });
  }

  const body: AchPaymentRequestBody = req.body;
  const validationError = validateAchPaymentRequest(body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const merchantCode = process.env.WORLDPAY_MERCHANT_CODE ?? '';
  if (!merchantCode) {
    return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
  }

  const maskedXml = buildMaskedWorldPayPreview(merchantCode, body, {
    sessionId: buildSessionId(),
    shopperIpAddress: normalizeShopperIpAddress(req),
    acceptHeader: req.get('accept') ?? '*/*',
    userAgentHeader: req.get('user-agent') ?? 'Unknown',
  });

  return res.json({
    success: true,
    maskedXml,
  });
});

app.get('/api/payment/ach/preview', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found.' });
  }

  return res.status(200).json({
    success: false,
    error: 'Use POST /api/payment/ach/preview with an ACH JSON payload to generate masked WorldPay XML.',
    samplePayload: {
      payerName: 'John Johnson',
      email: 'sp@worldpay.com',
      routingNumber: '000010101',
      bankName: 'Test Bank',
      accountNumber: '5186005800001012',
      accountType: 'CHECKING',
      achType: 'TEL',
      amount: 1499,
      orderCode: 'test6564',
      description: 'test order',
      address1: '8500 Govenors Hill Drive',
      address2: 'Symmes Township',
      city: 'Ohio',
      postalCode: '45249',
      checkNumber: '1104',
      customIdentifier: '6549',
    },
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────

export default app;
export { buildMaskedWorldPayPreview, buildWorldPayDeclineMessage, buildWorldPayHttpErrorMessage, buildWorldPayXml, escapeXml, isPositiveInteger, maskXmlSensitiveFields, parseWorldPayResponse, validateAchPaymentRequest };

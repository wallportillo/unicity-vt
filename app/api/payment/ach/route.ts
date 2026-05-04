import { NextRequest, NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AchPaymentRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  routingNumber: string;
  bankName: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  achType: 'TEL' | 'PPD' | 'CCD' | 'WEB';
  amount: number;
  orderCode: string;
  description: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  customIdentifier: string;
}

interface WorldPayRequestMetadata {
  sessionId: string;
  shopperIpAddress: string;
  acceptHeader: string;
  userAgentHeader: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatWorldPayAccountType(accountType: 'CHECKING' | 'SAVINGS') {
  return accountType === 'CHECKING' ? 'Checking' : 'Savings';
}

function buildSessionId() {
  return `ssn${Date.now()}`;
}

function normalizeShopperIpAddress(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const rawIp = (forwarded?.split(',')[0] ?? '127.0.0.1').trim();
  if (rawIp === '::1' || rawIp === '::ffff:127.0.0.1') return '127.0.0.1';
  return rawIp.replace(/^::ffff:/, '');
}

function validateAchPaymentRequest(body: AchPaymentRequestBody): string | null {
  if (!body.firstName || !body.lastName || !body.routingNumber || !body.accountNumber || !body.accountType || !body.amount || !body.orderCode) {
    return 'Missing required payment fields.';
  }
  if (!body.address1.trim()) return 'Street address is required.';
  if (!body.city.trim()) return 'City is required.';
  if (!/^\d{9}$/.test(body.routingNumber)) return 'Invalid routing number format.';
  if (!/^\d+$/.test(body.accountNumber)) return 'Invalid account number format.';
  if (!/^\d{5}$/.test(body.postalCode)) return 'Invalid ZIP code format.';
  if (!body.customIdentifier.trim()) return 'Custom identifier is required.';
  if (!isPositiveInteger(body.amount)) return 'Amount must be a positive whole number of cents.';
  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) return 'Invalid account type.';
  if (!['TEL', 'PPD', 'CCD', 'WEB'].includes(body.achType)) return 'Invalid ACH type.';
  return null;
}

function buildWorldPayXml(
  merchantCode: string,
  body: AchPaymentRequestBody,
  metadata: WorldPayRequestMetadata,
): string {
  const { firstName, lastName, email, routingNumber, accountNumber, accountType, amount, orderCode, description, address1, address2, city, state, postalCode, customIdentifier } = body;
  const { sessionId, shopperIpAddress, acceptHeader, userAgentHeader } = metadata;

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

function humanizeWorldPayStatus(status: string) {
  return status.toLowerCase().split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function buildWorldPayDeclineMessage(status?: string, processorCode?: string, processorMessage?: string): string {
  const msg = processorMessage?.toLowerCase() ?? '';

  if (status === 'REFUSED') {
    if (msg.includes('insufficient funds')) return 'The bank declined the ACH transaction for insufficient funds. Confirm another payment method or retry later.';
    if (msg.includes('account closed')) return 'The bank declined the ACH transaction because the account is closed. Confirm a different bank account.';
    if (msg.includes('invalid account')) return 'The bank declined the ACH transaction because the account number appears invalid. Confirm the account details and try again.';
    if (msg.includes('invalid routing')) return 'The bank declined the ACH transaction because the routing number appears invalid. Confirm the routing details and try again.';
    if (msg.includes('unauthor') || msg.includes('authorization')) return 'The bank declined the ACH transaction because the authorization could not be confirmed. Re-read the authorization and retry if appropriate.';
    return 'The bank declined the ACH transaction. Confirm the bank details or collect a different payment method.';
  }

  if (status === 'CANCELLED') return 'The ACH transaction was cancelled before completion.';
  if (msg.includes('duplicate')) return 'The processor rejected the ACH transaction as a duplicate order. Confirm whether this payment was already submitted before retrying.';
  if (msg.includes('timeout') || msg.includes('temporar') || msg.includes('unavailable')) return 'The payment processor is temporarily unavailable. Wait a moment and try the ACH transaction again.';
  if (msg.includes('invalid') && msg.includes('account')) return 'The processor rejected the ACH transaction because the account information appears invalid. Confirm the account details and retry.';
  if (msg.includes('invalid') && msg.includes('routing')) return 'The processor rejected the ACH transaction because the routing information appears invalid. Confirm the routing details and retry.';
  if (processorCode) return `The payment processor declined the ACH transaction (code ${processorCode}). ${processorMessage ?? 'Review the order details and try again.'}`;
  if (processorMessage) return `The payment processor declined the ACH transaction. ${processorMessage}`;
  if (status) return `The payment processor reported ${humanizeWorldPayStatus(status)} for this ACH transaction. Review the order details and try again if appropriate.`;
  return 'The payment processor could not complete the ACH transaction. Review the order details and try again.';
}

function buildWorldPayHttpErrorMessage(httpStatus: number, parsedResult?: { error?: string; processorCode?: string; processorMessage?: string }): string {
  if (parsedResult?.error && parsedResult.error !== 'Unexpected response from payment processor.') return parsedResult.error;
  if (httpStatus === 401 || httpStatus === 403) return 'WorldPay rejected the merchant credentials or test-endpoint configuration. Confirm the merchant code, XML password, and environment.';
  if (httpStatus === 400) return 'WorldPay rejected the ACH payload. Confirm the required field values and payload format for this merchant profile.';
  if (httpStatus === 404) return 'WorldPay could not process the ACH request at this endpoint. Confirm the test endpoint URL and merchant environment.';
  if (httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) return 'WorldPay is temporarily unavailable or throttling requests. Wait a moment and try the ACH transaction again.';
  return 'Payment processor returned an error.';
}

function parseWorldPayResponse(xml: string) {
  const lastEvent = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/)?.[1];
  const orderCode = xml.match(/orderCode="([^"]+)"/)?.[1];
  const authorisationId = xml.match(/<AuthorisationId\s+id="([^"]+)"/)?.[1];
  const processorCode = xml.match(/<error[^>]*code="([^"]+)"/)?.[1];
  const processorMessage = xml.match(/<error[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/error>/)?.[1]?.trim();

  if (lastEvent === 'AUTHORISED' || lastEvent === 'CAPTURED') {
    return { success: true, status: lastEvent, orderCode, authorisationId, processorCode, processorMessage };
  }
  if (lastEvent) {
    return { success: false, status: lastEvent, orderCode, processorCode, processorMessage, error: buildWorldPayDeclineMessage(lastEvent, processorCode, processorMessage) };
  }
  if (processorMessage || processorCode) {
    return { success: false, processorCode, processorMessage, error: buildWorldPayDeclineMessage(undefined, processorCode, processorMessage) };
  }
  return { success: false, error: 'Unexpected response from payment processor.' };
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';
  const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
  const WP_XML_PASSWORD = process.env.WORLDPAY_XML_PASSWORD ?? '';

  if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
    console.error('[WorldPay] Missing credentials env vars');
    return NextResponse.json({ success: false, error: 'Payment processor not configured.' }, { status: 503 });
  }

  const body: AchPaymentRequestBody = await request.json();

  const validationError = validateAchPaymentRequest(body);
  if (validationError) {
    return NextResponse.json({ success: false, error: validationError }, { status: 400 });
  }

  const xml = buildWorldPayXml(WP_MERCHANT_CODE, body, {
    sessionId: buildSessionId(),
    shopperIpAddress: normalizeShopperIpAddress(request),
    acceptHeader: request.headers.get('accept') ?? '*/*',
    userAgentHeader: request.headers.get('user-agent') ?? 'Unknown',
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
      const parsedResult = parseWorldPayResponse(responseText);
      return NextResponse.json({
        success: false,
        status: parsedResult.status,
        orderCode: parsedResult.orderCode,
        processorCode: parsedResult.processorCode,
        processorMessage: parsedResult.processorMessage,
        error: buildWorldPayHttpErrorMessage(wpResponse.status, parsedResult),
      }, { status: 502 });
    }

    const result = parseWorldPayResponse(responseText);
    return NextResponse.json(result, { status: result.success ? 200 : 402 });
  } catch (error) {
    console.error('[WorldPay] Request failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to reach payment processor. Please try again.' }, { status: 502 });
  }
}

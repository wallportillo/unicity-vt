import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { existsSync, appendFileSync } from 'fs';

// ─── Environment validation ───────────────────────────────────────────────────

const requiredEnv = ['WORLDPAY_MERCHANT_CODE', 'WORLDPAY_XML_PASSWORD', 'WORLDPAY_ENDPOINT'] as const;
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnv.forEach(key => console.error(`  ${key}`));
  console.error('  Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3001;

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

  const digits = routingNumber.split('').map(Number);
  const sum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  if (sum % 10 !== 0) {
    return res.status(400).json({ isValid: false, error: 'Invalid routing number checksum' });
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
      return res.status(404).json({
        isValid: false,
        error: apiData.error?.message || 'Routing number does not match any banks in the USA',
      });
    }

    return res.status(404).json({ isValid: false, error: 'Routing number does not match any banks in the USA' });
  } catch (error) {
    console.error('Routing API Error:', error);
    return res.status(500).json({ isValid: false, error: 'Unable to validate routing number. Please try again.' });
  }
});

// ─── WorldPay ACH ─────────────────────────────────────────────────────────────

const WP_ENDPOINT = process.env.WORLDPAY_ENDPOINT ?? 'https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp';
const WP_MERCHANT_CODE = process.env.WORLDPAY_MERCHANT_CODE ?? '';
const WP_XML_PASSWORD = process.env.WORLDPAY_XML_PASSWORD ?? '';

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
  city?: string;
  state?: string;
  postalCode: string;
}

function buildWorldPayXml(body: AchPaymentRequestBody): string {
  const { payerName, email, routingNumber, accountNumber, accountType, amount, orderCode, description, address1, city, state, postalCode } = body;

  const nameParts = payerName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN" "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${WP_MERCHANT_CODE}">
  <submit>
    <order orderCode="${orderCode}">
      <description>${description}</description>
      <amount value="${amount}" currencyCode="USD" exponent="2"/>
      <paymentDetails>
        <ACH_DIRECT_DEBIT-SSL>
          <echeckSale>
            <billingAddress>
              <address>
                <firstName>${firstName}</firstName>
                <lastName>${lastName}</lastName>
                ${address1 ? `<address1>${address1}</address1>` : ''}
                <postalCode>${postalCode}</postalCode>
                ${city ? `<city>${city}</city>` : ''}
                ${state ? `<state>${state}</state>` : ''}
                <countryCode>US</countryCode>
                <emailAddress>${email}</emailAddress>
              </address>
            </billingAddress>
            <bankAccountType>${accountType}</bankAccountType>
            <accountNumber>${accountNumber}</accountNumber>
            <routingNumber>${routingNumber}</routingNumber>
          </echeckSale>
        </ACH_DIRECT_DEBIT-SSL>
      </paymentDetails>
      <shopper>
        <shopperEmailAddress>${email}</shopperEmailAddress>
      </shopper>
    </order>
  </submit>
</paymentService>`;
}

function parseWorldPayResponse(xml: string): { success: boolean; status?: string; orderCode?: string; authorisationId?: string; error?: string } {
  // Extract lastEvent (AUTHORISED, REFUSED, etc.)
  const lastEventMatch = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/);
  const lastEvent = lastEventMatch?.[1];

  // Extract order code
  const orderCodeMatch = xml.match(/orderCode="([^"]+)"/);
  const orderCode = orderCodeMatch?.[1];

  // Extract authorisation ID
  const authIdMatch = xml.match(/<AuthorisationId\s+id="([^"]+)"/);
  const authorisationId = authIdMatch?.[1];

  // Extract error
  const errorMatch = xml.match(/<error[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/error>/);
  const errorText = errorMatch?.[1]?.trim();

  if (lastEvent === 'AUTHORISED') {
    return { success: true, status: lastEvent, orderCode, authorisationId };
  }

  if (lastEvent) {
    return { success: false, status: lastEvent, orderCode, error: `Payment ${lastEvent.toLowerCase()}.` };
  }

  if (errorText) {
    return { success: false, error: errorText };
  }

  return { success: false, error: 'Unexpected response from payment processor.' };
}

/**
 * POST /api/payment/ach
 * Proxies ACH payment to WorldPay WPG
 */
app.post('/api/payment/ach', async (req, res) => {
  if (!WP_MERCHANT_CODE || !WP_XML_PASSWORD) {
    console.error('[WorldPay] Missing WORLDPAY_MERCHANT_CODE or WORLDPAY_XML_PASSWORD env vars');
    return res.status(503).json({ success: false, error: 'Payment processor not configured.' });
  }

  const body: AchPaymentRequestBody = req.body;

  // Basic server-side validation
  if (!body.payerName || !body.routingNumber || !body.accountNumber || !body.accountType || !body.amount || !body.orderCode) {
    return res.status(400).json({ success: false, error: 'Missing required payment fields.' });
  }

  if (!['CHECKING', 'SAVINGS'].includes(body.accountType)) {
    return res.status(400).json({ success: false, error: 'Invalid account type.' });
  }

  if (!['TEL', 'PPD', 'CCD', 'WEB'].includes(body.achType)) {
    return res.status(400).json({ success: false, error: 'Invalid ACH type.' });
  }

  const xml = buildWorldPayXml(body);
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

    // Write to debug log so we can inspect it
    const logEntry = `\n=== ${new Date().toISOString()} ===\n--- REQUEST ---\n${xml}\n--- RESPONSE (${wpResponse.status}) ---\n${responseText}\n`;
    appendFileSync('worldpay-debug.log', logEntry);

    if (!wpResponse.ok) {
      console.error('[WorldPay] HTTP error:', wpResponse.status, responseText);
      return res.status(502).json({ success: false, error: 'Payment processor returned an error.' });
    }

    const result = parseWorldPayResponse(responseText);
    return res.status(result.success ? 200 : 402).json(result);
  } catch (error) {
    console.error('[WorldPay] Request failed:', error);
    return res.status(502).json({ success: false, error: 'Unable to reach payment processor. Please try again.' });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Production frontend serving ──────────────────────────────────────────────
// In production, serve the Vite-built frontend from dist/ so a single process
// handles both API and UI. In development, Vite's dev server runs separately.

if (process.env.NODE_ENV === 'production') {
  const distPath = join(process.cwd(), 'dist');

  if (existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    console.warn('⚠️  dist/ not found. Run `npm run build` before starting in production.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`   - Routing validation: GET /api/routing/:routingNumber`);
  console.log(`   - ACH payment:        POST /api/payment/ach`);
  console.log(`   - Health check:       GET /api/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`   - Frontend:           serving from dist/`);
  }
});

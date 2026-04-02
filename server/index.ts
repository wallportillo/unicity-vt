/**
 * Backend API Server
 * Proxies routing number validation to BankRouting.io API
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
}));

app.use(express.json());

// Simple in-memory cache for routing numbers
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (routing numbers rarely change)

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

  // Validate format
  if (!/^\d{9}$/.test(routingNumber)) {
    return res.status(400).json({
      isValid: false,
      error: 'Routing number must be exactly 9 digits',
    });
  }

  // Validate checksum
  const digits = routingNumber.split('').map(Number);
  const sum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  if (sum % 10 !== 0) {
    return res.status(400).json({
      isValid: false,
      error: 'Invalid routing number checksum',
    });
  }

  // Check cache
  const cached = cache.get(routingNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${routingNumber}`);
    return res.json(cached.data);
  }

  // Call BankRouting.io API
  try {
    console.log(`[API Call] ${routingNumber}`);
    const response = await fetch(`https://bankrouting.io/api/v1/aba/${routingNumber}`);

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          isValid: false,
          error: 'Rate limit exceeded. Please try again later.',
        });
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

      // Cache successful responses
      cache.set(routingNumber, { data: result, timestamp: Date.now() });

      return res.json(result);
    }

    if (apiData.status === 'error') {
      return res.status(404).json({
        isValid: false,
        error: apiData.error?.message || 'Routing number does not match any banks in the USA',
      });
    }

    return res.status(404).json({
      isValid: false,
      error: 'Routing number does not match any banks in the USA',
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      isValid: false,
      error: 'Unable to validate routing number. Please try again.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`   - Routing validation: GET /api/routing/:routingNumber`);
  console.log(`   - Health check: GET /api/health`);
});

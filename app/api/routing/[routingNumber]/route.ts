import { NextRequest, NextResponse } from 'next/server';

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

const routingCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ routingNumber: string }> }
) {
  const { routingNumber } = await params;

  if (!/^\d{9}$/.test(routingNumber)) {
    return NextResponse.json(
      { isValid: false, error: 'Routing number must be exactly 9 digits' },
      { status: 400 }
    );
  }

  const cached = routingCache.get(routingNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${routingNumber}`);
    return NextResponse.json(cached.data);
  }

  try {
    console.log(`[API Call] ${routingNumber}`);
    const response = await fetch(`https://bankrouting.io/api/v1/aba/${routingNumber}`);

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { isValid: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
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
      return NextResponse.json(result);
    }

    return NextResponse.json({
      isValid: true,
      error: 'Bank not found — please confirm the routing number is correct.',
    });
  } catch (error) {
    console.error('Routing API Error:', error);
    return NextResponse.json(
      { isValid: false, error: 'Unable to validate routing number. Please try again.' },
      { status: 500 }
    );
  }
}

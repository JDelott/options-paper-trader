import { NextRequest, NextResponse } from 'next/server';

// Cache management
interface CacheEntry {
  data: OptionChain;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_DURATIONS = {
  OPTIONS: 60 * 1000, // 1 minute for options data
};

function setCache(key: string, data: OptionChain, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

function getCache(key: string): OptionChain | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Tradier API configuration
const TRADIER_API_BASE = process.env.TRADIER_API_BASE || 'https://api.tradier.com/v1';
const TRADIER_ACCESS_TOKEN = process.env.TRADIER_API_KEY;

interface TradierOption {
  symbol: string;
  description: string;
  type: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  strike: number;
  volume: number;
  open_interest: number;
  expiration_date: string;
  option_type: 'put' | 'call';
  underlying: string;
}

interface TradierQuote {
  symbol: string;
  description: string;
  exch: string;
  type: string;
  last: number;
  change: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bid: number;
  ask: number;
  change_percentage: number;
  average_volume: number;
  last_volume: number;
  trade_date: number;
  prevclose: number;
  week_52_high: number;
  week_52_low: number;
  bidsize: number;
  asksize: number;
}

interface TradierQuoteResponse {
  quotes: {
    quote: TradierQuote;
  };
}

interface TradierOptionsResponse {
  options: {
    option: TradierOption[] | TradierOption;
  };
}

interface OptionChain {
  symbol: string;
  expiration: string;
  underlyingPrice: number;
  calls: TradierOption[];
  puts: TradierOption[];
  lastUpdated: string;
  source: string;
  fromCache: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string; expiration: string }> }
) {
  // Await params for Next.js 15 compatibility
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol.toUpperCase();
  const expiration = resolvedParams.expiration;
  const cacheKey = `options:${symbol}:${expiration}`;

  // Validate expiration format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
    return NextResponse.json(
      { error: 'Invalid expiration format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`📦 Cache HIT for options ${symbol} ${expiration}`);
    return NextResponse.json({ ...cached, fromCache: true });
  }

  try {
    console.log(`🌐 Fetching options chain for ${symbol} ${expiration}...`);

    // Get underlying price first
    const quoteResponse = await fetch(
      `${TRADIER_API_BASE}/markets/quotes?symbols=${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!quoteResponse.ok) {
      throw new Error(`Failed to get underlying quote: ${quoteResponse.status}`);
    }

    const quoteData: TradierQuoteResponse = await quoteResponse.json();
    const underlyingPrice = quoteData.quotes.quote.last;

    // Get options chain
    const optionsResponse = await fetch(
      `${TRADIER_API_BASE}/markets/options/chains?symbol=${symbol}&expiration=${expiration}`,
      {
        headers: {
          'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!optionsResponse.ok) {
      throw new Error(`Failed to get options chain: ${optionsResponse.status}`);
    }

    const optionsData: TradierOptionsResponse = await optionsResponse.json();
    
    if (!optionsData.options || !optionsData.options.option) {
      throw new Error(`No options data found for ${symbol} ${expiration}`);
    }

    const options = Array.isArray(optionsData.options.option) 
      ? optionsData.options.option 
      : [optionsData.options.option];

    const calls = options.filter((opt: TradierOption) => opt.option_type === 'call');
    const puts = options.filter((opt: TradierOption) => opt.option_type === 'put');

    const result: OptionChain = {
      symbol,
      expiration,
      underlyingPrice,
      calls,
      puts,
      lastUpdated: new Date().toISOString(),
      source: 'Tradier (Real-time)',
      fromCache: false
    };

    // Cache the result
    setCache(cacheKey, result, CACHE_DURATIONS.OPTIONS);

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error fetching options for ${symbol} ${expiration}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch options chain',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

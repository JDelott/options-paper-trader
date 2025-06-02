import { NextRequest, NextResponse } from 'next/server';

// Cache management
interface CacheEntry {
  data: QuoteResponse;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_DURATIONS = {
  QUOTES: 30 * 1000, // 30 seconds for real-time quotes
};

function setCache(key: string, data: QuoteResponse, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

function getCache(key: string): QuoteResponse | null {
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

interface QuoteResponse {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  marketCap?: number;
  lastUpdated: string;
  source: string;
  fromCache: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const cacheKey = `quote:${symbol}`;

  // Check cache first
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`📦 Cache HIT for quote ${symbol}`);
    return NextResponse.json({ ...cached, fromCache: true });
  }

  try {
    console.log(`🌐 Fetching real-time quote for ${symbol}...`);

    const response = await fetch(
      `${TRADIER_API_BASE}/markets/quotes?symbols=${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Tradier API error: ${response.status}`);
    }

    const data: TradierQuoteResponse = await response.json();
    const quote: TradierQuote = data.quotes.quote;

    if (!quote) {
      throw new Error(`No quote data found for ${symbol}`);
    }

    const result: QuoteResponse = {
      symbol: quote.symbol,
      price: quote.last,
      bid: quote.bid,
      ask: quote.ask,
      spread: Number(((quote.ask - quote.bid) / quote.last * 100).toFixed(2)),
      change: quote.change,
      changePercent: quote.change_percentage,
      volume: quote.volume,
      dayHigh: quote.high,
      dayLow: quote.low,
      week52High: quote.week_52_high,
      week52Low: quote.week_52_low,
      lastUpdated: new Date().toISOString(),
      source: 'Tradier (Real-time)',
      fromCache: false
    };

    // Cache the result
    setCache(cacheKey, result, CACHE_DURATIONS.QUOTES);

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

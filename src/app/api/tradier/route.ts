import { NextRequest, NextResponse } from 'next/server';
import { OptionsApiResponse, ErrorCacheData } from '../../types';

// Cache types and utilities
interface CacheEntry {
  data: OptionsApiResponse | ErrorCacheData;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_DURATIONS = {
  STOCK_PRICE: 2 * 60 * 1000,    // 2 minutes for stock prices
  OPTIONS_DATA: 5 * 60 * 1000,   // 5 minutes for options data
  ERROR_CACHE: 30 * 1000,        // 30 seconds for errors (avoid rapid retries)
};

function getCacheKey(type: string, symbol: string): string {
  return `${type}:${symbol}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

function setCache(key: string, data: OptionsApiResponse | ErrorCacheData, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

function getCache(key: string): (OptionsApiResponse | ErrorCacheData) | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (isExpired(entry)) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

// Tradier API types
// interface TradierOption {
//   root_symbol: string;
//   expiration_type: string;
//   // ... other fields
// }

// Add interface for individual option contract
interface TradierOptionContract {
  symbol: string;
  description: string;
  exch: string;
  type: string;
  last: number | null;
  change: number | null;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  bid: number | null;
  ask: number | null;
  underlying: string;
  strike: number;
  change_percentage: number | null;
  average_volume: number;
  last_volume: number;
  trade_date: number;
  prevclose: number | null;
  week_52_high: number;
  week_52_low: number;
  bidsize: number;
  bidexch: string;
  bid_date: number;
  asksize: number;
  askexch: string;
  ask_date: number;
  open_interest: number;
  contract_size: number;
  expiration_date: string;
  expiration_type: string;
  option_type: 'put' | 'call';
  root_symbol: string;
}

// Update TradierOptionsResponse to use the new interface
interface TradierOptionsResponse {
  options: {
    option: TradierOptionContract[];
  };
}

interface TradierQuoteResponse {
  quotes: {
    quote: {
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
      underlying: string;
      strike: number;
      change_percentage: number;
      average_volume: number;
      last_volume: number;
      trade_date: number;
      prevclose_date: number;
      week_52_high: number;
      week_52_low: number;
      bidsize: number;
      bidexch: string;
      bid_date: number;
      asksize: number;
      askexch: string;
      ask_date: number;
      open_interest: number;
      contract_size: number;
      expiration_date: string;
      expiration_type: string;
      option_type: string;
      root_symbol: string;
      underlying_price: number;
    };
  };
}

const TRADIER_API_BASE = 'https://sandbox.tradier.com/v1';  // Use sandbox endpoint
const TRADIER_ACCESS_TOKEN = 'GJejQh6ftSXPqRmjYjjkyTmAvQ4A';

export async function getTradierData(symbol: string): Promise<OptionsApiResponse> {
  const cacheKey = getCacheKey('tradier', symbol);
  
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached && 'puts' in cached) {
    console.log(`📦 Cache HIT for Tradier ${symbol}`);
    return { ...cached, fromCache: true };
  }

  console.log(`🌐 Cache MISS - Fetching ${symbol} from Tradier Sandbox...`);

  try {
    // Get real-time quote (will be 15-min delayed in sandbox)
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
      const errorText = await quoteResponse.text();
      console.error('Tradier quote response:', errorText);
      throw new Error(`Tradier quote API error: ${quoteResponse.status}`);
    }

    const quoteData: TradierQuoteResponse = await quoteResponse.json();
    const quote = quoteData.quotes.quote;
    const stockPrice = quote.last;

    console.log(`${symbol} delayed price (15-min): $${stockPrice}`);

    // Get options chain
    const expiration = getNextExpiration();
    console.log('Requesting options for expiration:', expiration);

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
      const errorText = await optionsResponse.text();
      console.error('Tradier options response:', errorText);
      throw new Error(`Tradier options API error: ${optionsResponse.status}`);
    }

    const optionsData: TradierOptionsResponse = await optionsResponse.json();
    
    // The options data is in optionsData.options.option array
    if (!optionsData.options || !Array.isArray(optionsData.options.option)) {
      console.log('No options data available for', symbol, 'on', expiration);
      throw new Error('No options data available');
    }

    // Filter and map the puts with proper typing
    const puts = optionsData.options.option
      .filter((opt: TradierOptionContract) => opt.option_type === 'put')
      .map((put: TradierOptionContract) => ({
        symbol: put.symbol,
        strike: put.strike,
        expiration: put.expiration_date,
        bid: put.bid || 0,
        ask: put.ask || 0,
        impliedVolatility: 0, // Tradier doesn't provide IV directly
        openInterest: put.open_interest || 0,
        volume: put.volume || 0,
        delta: 0, // Tradier doesn't provide Greeks
        gamma: 0,
        theta: 0,
        underlyingPrice: stockPrice
      }));

    const result: OptionsApiResponse = {
      success: true,
      puts,
      underlyingPrice: stockPrice,
      source: 'Tradier Sandbox (15-min Delayed)',
      timestamp: new Date().toISOString(),
      fromCache: false
    };

    // Cache the successful result
    setCache(cacheKey, result, CACHE_DURATIONS.OPTIONS_DATA);
    
    return result;

  } catch (error) {
    console.error('Tradier API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCache: ErrorCacheData = { error: errorMessage };
    setCache(cacheKey, errorCache, CACHE_DURATIONS.ERROR_CACHE);
    throw new Error(errorMessage);
  }
}

// Helper function to get next expiration date
function getNextExpiration(): string {
  const today = new Date();
  // Get the next monthly expiration (third Friday)
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const thirdFriday = new Date(nextMonth);
  thirdFriday.setDate(1 + (5 + 7 - nextMonth.getDay()) % 7 + 14); // Get to third Friday
  
  // If we're past the third Friday, get the next month's
  if (thirdFriday < today) {
    thirdFriday.setMonth(thirdFriday.getMonth() + 1);
    thirdFriday.setDate(1 + (5 + 7 - thirdFriday.getDay()) % 7 + 14);
  }
  
  return thirdFriday.toISOString().split('T')[0];
}

// Modify the GET handler to use Tradier
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Symbol parameter required. Example: ?symbol=SPY' }, 
      { status: 400 }
    );
  }

  try {
    const data = await getTradierData(symbol);
    
    const response = {
      ...data,
      cacheInfo: {
        fromCache: data.fromCache || false,
        cacheDuration: data.fromCache ? CACHE_DURATIONS.OPTIONS_DATA : null,
        provider: 'Tradier'
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Tradier failed for ${symbol}:`, errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get market data. Check API key:\n' +
               `• TRADIER_API_KEY: ${process.env.TRADIER_API_KEY ? 'configured' : 'missing'}`
      }, 
      { status: 500 }
    );
  }
}

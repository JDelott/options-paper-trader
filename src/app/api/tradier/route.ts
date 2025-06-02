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

const TRADIER_API_BASE = process.env.TRADIER_API_BASE || 'https://api.tradier.com/v1';
const TRADIER_ACCESS_TOKEN = process.env.TRADIER_API_KEY;

export async function getTradierData(symbol: string): Promise<OptionsApiResponse> {
  const cacheKey = getCacheKey('tradier', symbol);
  
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached && 'puts' in cached) {
    console.log(`📦 Cache HIT for Tradier ${symbol}`);
    return { ...cached, fromCache: true };
  }

  console.log(`🌐 Cache MISS - Fetching ${symbol} from Tradier Production...`);

  try {
    // Get real-time quote
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

    console.log(`${symbol} real-time price: $${stockPrice}`);

    // Get available expiration dates (this returns JSON)
    console.log('🔍 Fetching expirations...');
    const expirationsResponse = await fetch(
      `${TRADIER_API_BASE}/markets/options/expirations?symbol=${symbol}&includeAllRoots=true`,
      {
        headers: {
          'Authorization': `Bearer ${TRADIER_ACCESS_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    console.log('Expirations response status:', expirationsResponse.status);
    console.log('Expirations response headers:', Object.fromEntries(expirationsResponse.headers.entries()));

    if (!expirationsResponse.ok) {
      throw new Error(`Tradier expirations API error: ${expirationsResponse.status}`);
    }

    const expirationsText = await expirationsResponse.text();

    // Parse JSON response (not XML!)
    let expirationDates: string[] = [];

    try {
      const expirationsData = JSON.parse(expirationsText);
      console.log('✅ Parsed JSON response:', expirationsData);
      
      if (expirationsData.expirations && expirationsData.expirations.date) {
        if (Array.isArray(expirationsData.expirations.date)) {
          expirationDates = expirationsData.expirations.date;
        } else {
          // Single date case
          expirationDates = [expirationsData.expirations.date];
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('Raw response:', expirationsText);
      throw new Error('Failed to parse expirations response');
    }

    console.log('📅 Extracted expiration dates:', expirationDates);
    console.log('📊 Number of dates found:', expirationDates.length);

    if (expirationDates.length === 0) {
      console.log('❌ No expiration dates found for', symbol);
      throw new Error('No expiration dates available');
    }

    const availableExpirations = expirationDates
      .sort()
      .slice(0, 12); // Limit to first 12 expirations

    console.log(`✅ Found ${availableExpirations.length} expiration dates:`, availableExpirations);
    
    // Fetch options chains for each expiration
    const allPuts: {
      symbol: string;
      strike: number;
      expiration: string;
      bid: number;
      ask: number;
      impliedVolatility: number;
      openInterest: number;
      volume: number;
      delta: number;
      gamma: number;
      theta: number;
      underlyingPrice: number;
    }[] = [];
    
    for (let i = 0; i < availableExpirations.length; i++) {
      const expiration = availableExpirations[i];
      try {
        // Small delay to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Fetching options for ${symbol} expiring ${expiration}...`);
        
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
          console.warn(`Failed to get options for ${expiration}: ${optionsResponse.status}`);
          continue;
        }

        const optionsData: TradierOptionsResponse = await optionsResponse.json();
        
        if (optionsData.options && Array.isArray(optionsData.options.option)) {
          const puts = optionsData.options.option
            .filter((opt: TradierOptionContract) => opt.option_type === 'put')
            .map((put: TradierOptionContract) => ({
              symbol: put.symbol,
              strike: put.strike,
              expiration: put.expiration_date,
              bid: put.bid ?? 0,
              ask: put.ask ?? 0,
              impliedVolatility: 0,
              openInterest: put.open_interest || 0,
              volume: put.volume || 0,
              delta: 0,
              gamma: 0,
              theta: 0,
              underlyingPrice: stockPrice
            }));
          
          allPuts.push(...puts);
          console.log(`Added ${puts.length} puts from ${expiration}`);
        }
      } catch (optionsError) {
        console.warn(`Error fetching options for ${expiration}:`, optionsError);
        continue;
      }
    }

    console.log(`Total puts fetched: ${allPuts.length} across ${availableExpirations.length} expirations`);

    if (allPuts.length === 0) {
      throw new Error('No options data available for any expiration');
    }

    const result: OptionsApiResponse = {
      success: true,
      puts: allPuts,
      underlyingPrice: stockPrice,
      source: `Tradier Production (${availableExpirations.length} expirations, Real-time)`,
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
        provider: 'Tradier Production'
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

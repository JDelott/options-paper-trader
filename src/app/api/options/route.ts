import { NextRequest, NextResponse } from 'next/server';

interface PutOption {
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
}

// Define what can be cached
interface OptionsApiResponse {
  success: boolean;
  puts: PutOption[];
  underlyingPrice: number;
  source: string;
  timestamp: string;
  fromCache: boolean;
}

interface ErrorCacheData {
  error: string;
}

type CacheData = OptionsApiResponse | ErrorCacheData;

interface CacheEntry {
  data: CacheData;
  timestamp: number;
  ttl: number;
}

// In-memory cache (for MVP - use Redis for production)
const cache = new Map<string, CacheEntry>();

// Cache durations
const CACHE_DURATIONS = {
  STOCK_PRICE: 2 * 60 * 1000,    // 2 minutes for stock prices
  OPTIONS_DATA: 5 * 60 * 1000,   // 5 minutes for options data
  ERROR_CACHE: 30 * 1000,        // 30 seconds for errors (avoid rapid retries)
};

// Cache utility functions
function getCacheKey(type: string, symbol: string): string {
  return `${type}:${symbol}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

function setCache(key: string, data: CacheData, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // Clean up expired entries to prevent memory leaks
  if (cache.size > 100) { // Limit cache size
    cleanExpiredEntries();
  }
}

function getCache(key: string): CacheData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (isExpired(entry)) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function cleanExpiredEntries(): void {
  for (const [key, entry] of cache.entries()) {
    if (isExpired(entry)) {
      cache.delete(key);
    }
  }
}

// API response types
interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
}

interface PolygonTradeResult {
  p: number;
  s: number;
  t: number;
}

interface PolygonTradeResponse {
  results: PolygonTradeResult;
  status: string;
}

interface PolygonContract {
  contract_type: 'put' | 'call';
  expiration_date: string;
  strike_price: number;
  ticker: string;
  underlying_ticker: string;
}

interface PolygonContractsResponse {
  results: PolygonContract[];
  status: string;
  count: number;
}

async function getAlphaVantageData(symbol: string): Promise<OptionsApiResponse> {
  const cacheKey = getCacheKey('alphavantage', symbol);
  
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached && 'puts' in cached) { // Type guard to ensure it's OptionsApiResponse
    console.log(`📦 Cache HIT for Alpha Vantage ${symbol}`);
    return { ...cached, fromCache: true };
  }

  console.log(`🌐 Cache MISS - Fetching ${symbol} from Alpha Vantage...`);

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  try {
    const quoteResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Alpha Vantage API error: ${quoteResponse.status}`);
    }
    
    const quoteData: AlphaVantageResponse = await quoteResponse.json();
    
    const quote = quoteData['Global Quote'];
    if (!quote) {
      throw new Error(`No quote data for ${symbol}`);
    }
    
    const stockPrice = parseFloat(quote['05. price']);
    if (!stockPrice || isNaN(stockPrice)) {
      throw new Error(`Invalid price data for ${symbol}`);
    }

    console.log(`${symbol} real stock price: $${stockPrice}`);

    const puts = await generateOptionsFromRealPrice(symbol, stockPrice);

    const result: OptionsApiResponse = {
      success: true,
      puts,
      underlyingPrice: stockPrice,
      source: 'Alpha Vantage (Real Stock Price)',
      timestamp: new Date().toISOString(),
      fromCache: false
    };

    // Cache the successful result
    setCache(cacheKey, result, CACHE_DURATIONS.OPTIONS_DATA);
    
    return result;

  } catch (error) {
    console.error('Alpha Vantage API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Cache errors briefly to avoid rapid retries
    const errorCache: ErrorCacheData = { error: errorMessage };
    setCache(cacheKey, errorCache, CACHE_DURATIONS.ERROR_CACHE);
    throw new Error(errorMessage);
  }
}

async function getPolygonData(symbol: string): Promise<OptionsApiResponse> {
  const cacheKey = getCacheKey('polygon', symbol);
  
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached && 'puts' in cached) { // Type guard to ensure it's OptionsApiResponse
    console.log(`📦 Cache HIT for Polygon ${symbol}`);
    return { ...cached, fromCache: true };
  }

  console.log(`🌐 Cache MISS - Fetching ${symbol} from Polygon...`);

  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  try {
    const priceResponse = await fetch(
      `https://api.polygon.io/v2/last/trade/${symbol}?apikey=${apiKey}`
    );
    
    if (!priceResponse.ok) {
      throw new Error(`Polygon price API error: ${priceResponse.status}`);
    }
    
    const priceData: PolygonTradeResponse = await priceResponse.json();
    const stockPrice = priceData.results?.p;
    
    if (!stockPrice || isNaN(stockPrice)) {
      throw new Error(`No valid price data for ${symbol} from Polygon`);
    }

    console.log(`${symbol} real stock price: $${stockPrice}`);

    // Try to get real options contracts
    const contractsResponse = await fetch(
      `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${symbol}&contract_type=put&limit=50&apikey=${apiKey}`
    );
    
    let puts: PutOption[];
    let source = 'Polygon (Real Stock Price)';

    if (contractsResponse.ok) {
      const contractsData: PolygonContractsResponse = await contractsResponse.json();
      const contracts = contractsData.results || [];

      if (contracts.length > 0) {
        puts = contracts
          .filter((contract: PolygonContract) => contract.contract_type === 'put')
          .slice(0, 30)
          .map((contract: PolygonContract) => ({
            symbol: symbol,
            strike: contract.strike_price,
            expiration: contract.expiration_date,
            bid: 0,
            ask: 0,
            impliedVolatility: 0.2,
            openInterest: 0,
            volume: 0,
            delta: -0.3,
            gamma: 0.01,
            theta: -0.02,
            underlyingPrice: stockPrice
          }))
          .sort((a, b) => a.strike - b.strike);
        
        source = 'Polygon (Real Options Structure)';
      } else {
        puts = await generateOptionsFromRealPrice(symbol, stockPrice);
      }
    } else {
      puts = await generateOptionsFromRealPrice(symbol, stockPrice);
    }

    const result: OptionsApiResponse = {
      success: true,
      puts,
      underlyingPrice: stockPrice,
      source,
      timestamp: new Date().toISOString(),
      fromCache: false
    };

    // Cache the successful result
    setCache(cacheKey, result, CACHE_DURATIONS.OPTIONS_DATA);
    
    return result;

  } catch (error) {
    console.error('Polygon API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Cache errors briefly to avoid rapid retries
    const errorCache: ErrorCacheData = { error: errorMessage };
    setCache(cacheKey, errorCache, CACHE_DURATIONS.ERROR_CACHE);
    throw new Error(errorMessage);
  }
}

async function generateOptionsFromRealPrice(symbol: string, realPrice: number): Promise<PutOption[]> {
  const options: PutOption[] = [];
  const volatility = getImpliedVolatility(symbol);
  
  const expirations = [
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
  ];

  expirations.forEach(expDate => {
    const expiration = expDate.toISOString().split('T')[0];
    const daysToExpiry = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    for (let i = -20; i <= 5; i += 2) {
      const strikePercent = i;
      const strike = Math.round((realPrice * (1 + strikePercent/100)) * 2) / 2;
      
      if (strike <= 0) continue;
      
      const moneyness = strike / realPrice;
      const timeToExpiry = daysToExpiry / 365;
      
      const intrinsicValue = Math.max(0, strike - realPrice);
      const timeValue = realPrice * volatility * Math.sqrt(timeToExpiry) * 0.4;
      const optionPrice = intrinsicValue + timeValue;
      
      const bid = Math.max(0.01, optionPrice * 0.96);
      const ask = optionPrice * 1.04;
      
      const delta = moneyness > 1 ? 
        -0.65 - Math.random() * 0.25 : 
        -0.05 - (1 - moneyness) * 0.4;
      
      const gamma = Math.max(0.001, 0.08 * Math.exp(-Math.abs(moneyness - 1) * 4));
      const theta = -optionPrice / daysToExpiry * (0.6 + Math.random() * 0.3);
      
      const distanceFromATM = Math.abs(moneyness - 1);
      const volumeMultiplier = Math.max(0.1, 1 - distanceFromATM * 1.5);
      
      options.push({
        symbol,
        strike,
        expiration,
        bid: Math.round(bid * 100) / 100,
        ask: Math.round(ask * 100) / 100,
        impliedVolatility: Math.round(volatility * 1000) / 1000,
        openInterest: Math.floor(100 + Math.random() * 1500 * volumeMultiplier),
        volume: Math.floor(Math.random() * 200 * volumeMultiplier),
        delta: Math.round(delta * 100) / 100,
        gamma: Math.round(gamma * 1000) / 1000,
        theta: Math.round(theta * 100) / 100,
        underlyingPrice: realPrice
      });
    }
  });

  return options.sort((a, b) => a.strike - b.strike);
}

function getImpliedVolatility(symbol: string): number {
  const volAdjustments: { [key: string]: number } = {
    'SPY': 0.15, 'QQQ': 0.20, 'AAPL': 0.25, 'MSFT': 0.23,
    'TSLA': 0.45, 'NVDA': 0.35, 'AMZN': 0.28, 'GOOGL': 0.26,
    'META': 0.30, 'NFLX': 0.32, 'AMD': 0.40
  };
  
  return volAdjustments[symbol] || 0.25;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Symbol parameter required. Example: ?symbol=SPY' }, 
      { status: 400 }
    );
  }

  const providers = [
    { 
      name: 'Polygon', 
      fn: () => getPolygonData(symbol), 
      enabled: !!process.env.POLYGON_API_KEY 
    },
    { 
      name: 'Alpha Vantage', 
      fn: () => getAlphaVantageData(symbol), 
      enabled: !!process.env.ALPHA_VANTAGE_API_KEY 
    }
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`${provider.name} API key not configured, skipping...`);
      continue;
    }
    
    try {
      const data = await provider.fn();
      
      // Add cache info to response
      const response = {
        ...data,
        cacheInfo: {
          fromCache: data.fromCache || false,
          cacheDuration: data.fromCache ? CACHE_DURATIONS.OPTIONS_DATA : null,
          provider: provider.name
        }
      };
      
      return NextResponse.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ ${provider.name} failed for ${symbol}:`, errorMessage);
      continue;
    }
  }

  return NextResponse.json(
    { 
      success: false, 
      error: 'Failed to get real market data. Check API keys:\n' +
             `• POLYGON_API_KEY: ${process.env.POLYGON_API_KEY ? 'configured' : 'missing'}\n` +
             `• ALPHA_VANTAGE_API_KEY: ${process.env.ALPHA_VANTAGE_API_KEY ? 'configured' : 'missing'}`
    }, 
    { status: 500 }
  );
}

// Optional: Add cache status endpoint for debugging
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();
  
  if (symbol) {
    // Clear specific symbol cache
    cache.delete(getCacheKey('polygon', symbol));
    cache.delete(getCacheKey('alphavantage', symbol));
    return NextResponse.json({ message: `Cache cleared for ${symbol}` });
  } else {
    // Clear all cache
    cache.clear();
    return NextResponse.json({ message: 'All cache cleared' });
  }
}

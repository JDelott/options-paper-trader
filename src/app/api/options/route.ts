import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // For MVP, we'll use web search/scraping approach
    // In a real implementation, you'd scrape Yahoo Finance or use other free sources
    const optionsData = await fetchOptionsFromWeb(symbol);
    
    return NextResponse.json({
      success: true,
      symbol,
      underlyingPrice: optionsData.underlyingPrice,
      puts: optionsData.puts,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching options data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch options data' 
    }, { status: 500 });
  }
}

async function fetchOptionsFromWeb(symbol: string) {
  // This is where you'd implement web scraping for options data
  // For the MVP, we'll return simulated data since implementing web scraping
  // for Yahoo Finance requires handling CAPTCHAs, proxies, etc.
  
  // In a real implementation, you might:
  // 1. Use Puppeteer/Playwright to scrape Yahoo Finance options pages
  // 2. Parse JSON from embedded script tags on the pages
  // 3. Handle rate limiting and IP blocking with proxy rotation
  // 4. Cache results to minimize requests
  
  const simulatedData = generateSimulatedOptionsData(symbol);
  return simulatedData;
}

function generateSimulatedOptionsData(symbol: string) {
  const basePrices: { [key: string]: number } = {
    'SPY': 580,
    'QQQ': 525,
    'AAPL': 245,
    'MSFT': 450,
    'TSLA': 350,
    'NVDA': 900,
    'AMZN': 190,
    'GOOGL': 175
  };
  
  const underlyingPrice = basePrices[symbol] || 100;
  
  // Generate realistic options data
  const expirations = [
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  ];
  
  const puts = [];
  
  for (const expiration of expirations) {
    const timeToExpiry = (new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    // Generate strikes around the underlying price
    for (let i = -15; i <= 5; i++) {
      const strike = Math.round((underlyingPrice * (1 + i * 0.025)) * 100) / 100;
      const moneyness = strike / underlyingPrice;
      
      // Simple Black-Scholes approximation for demo
      const intrinsicValue = Math.max(0, strike - underlyingPrice);
      const volatility = 0.15 + Math.random() * 0.25; // Random IV between 15-40%
      const timeValue = Math.sqrt(timeToExpiry / 365) * underlyingPrice * volatility * 0.4;
      
      const theoreticalValue = intrinsicValue + timeValue;
      const bid = Math.max(0.01, theoreticalValue * (0.95 + Math.random() * 0.05));
      const ask = bid * (1.05 + Math.random() * 0.05);
      
      // Calculate Greeks (simplified)
      const delta = moneyness < 1 ? -(1 - moneyness) * 0.8 : -0.1;
      const gamma = Math.exp(-0.5 * Math.pow((underlyingPrice - strike) / (underlyingPrice * 0.2), 2)) * 0.01;
      const theta = -timeValue / timeToExpiry * 365;
      
      puts.push({
        symbol,
        strike,
        expiration,
        bid: Math.round(bid * 100) / 100,
        ask: Math.round(ask * 100) / 100,
        impliedVolatility: Math.round(volatility * 1000) / 1000,
        openInterest: Math.floor(Math.random() * 2000) + 100,
        volume: Math.floor(Math.random() * 500),
        delta: Math.round(delta * 100) / 100,
        gamma: Math.round(gamma * 1000) / 1000,
        theta: Math.round(theta * 100) / 100,
        underlyingPrice
      });
    }
  }
  
  return {
    underlyingPrice,
    puts: puts.sort((a, b) => a.expiration.localeCompare(b.expiration) || a.strike - b.strike)
  };
}

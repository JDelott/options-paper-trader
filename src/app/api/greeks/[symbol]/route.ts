import { NextRequest, NextResponse } from 'next/server';
import { TradierOption } from '../../../types';

// Black-Scholes Greeks calculations
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

interface GreeksCalculation {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

function calculateGreeks(
  S: number,    // Current stock price
  K: number,    // Strike price
  T: number,    // Time to expiration (in years)
  r: number,    // Risk-free rate
  sigma: number, // Volatility
  optionType: 'call' | 'put'
): GreeksCalculation {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let delta: number;
  let theta: number;
  let rho: number;

  if (optionType === 'call') {
    delta = Nd1;
    theta = (-S * nd1 * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2) / 365;
    rho = K * T * Math.exp(-r * T) * Nd2 / 100;
  } else {
    delta = Nd1 - 1;
    theta = (-S * nd1 * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
  }

  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = S * nd1 * Math.sqrt(T) / 100;

  return { delta, gamma, theta, vega, rho };
}

// Tradier API configuration
const TRADIER_API_BASE = process.env.TRADIER_API_BASE || 'https://api.tradier.com/v1';
const TRADIER_ACCESS_TOKEN = process.env.TRADIER_API_KEY;

interface GreeksResponse {
  symbol: string;
  underlyingPrice: number;
  options: Array<{
    strike: number;
    expiration: string;
    daysToExpiry: number;
    call: GreeksCalculation;
    put: GreeksCalculation;
  }>;
  lastUpdated: string;
  source: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const { searchParams } = new URL(request.url);
  const expiration = searchParams.get('expiration');

  if (!expiration) {
    return NextResponse.json(
      { error: 'Expiration parameter required. Example: ?expiration=2024-03-15' },
      { status: 400 }
    );
  }

  try {
    console.log(`🧮 Calculating Greeks for ${symbol} ${expiration}...`);

    // Get current stock price
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
      throw new Error(`Failed to get quote: ${quoteResponse.status}`);
    }

    const quoteData = await quoteResponse.json();
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
      throw new Error(`Failed to get options: ${optionsResponse.status}`);
    }

    const optionsData = await optionsResponse.json();
    
    if (!optionsData.options || !optionsData.options.option) {
      throw new Error(`No options data found for ${symbol} ${expiration}`);
    }

    const options: TradierOption[] = Array.isArray(optionsData.options.option) 
      ? optionsData.options.option 
      : [optionsData.options.option];

    // Calculate time to expiration
    const expiryDate = new Date(expiration);
    const now = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const timeToExpiry = daysToExpiry / 365;

    // Estimate implied volatility (simplified - in production, use more sophisticated methods)
    const impliedVolatility = 0.25; // 25% default IV
    const riskFreeRate = 0.05; // 5% risk-free rate

    // Get unique strikes and ensure they are numbers
    const strikes = [...new Set(options.map((opt: TradierOption) => Number(opt.strike)))]
      .filter((strike): strike is number => !isNaN(strike))
      .sort((a: number, b: number) => a - b);

    const greeksData = strikes.map((strike: number) => {
      const callGreeks = calculateGreeks(underlyingPrice, strike, timeToExpiry, riskFreeRate, impliedVolatility, 'call');
      const putGreeks = calculateGreeks(underlyingPrice, strike, timeToExpiry, riskFreeRate, impliedVolatility, 'put');

      return {
        strike,
        expiration,
        daysToExpiry,
        call: callGreeks,
        put: putGreeks
      };
    });

    const result: GreeksResponse = {
      symbol,
      underlyingPrice,
      options: greeksData,
      lastUpdated: new Date().toISOString(),
      source: 'Calculated (Black-Scholes, Real-time Data)'
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error calculating Greeks for ${symbol}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate Greeks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

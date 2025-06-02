import { PutOption } from '../types';

export interface OptionsMetrics {
  annualizedReturn: number;
  breakeven: number;
  daysToExpiration: number;
  premium: number;
  profitProbability: number;
  maxProfit: number;
  maxLoss: number;
}

export function calculateOptionsMetrics(option: PutOption): OptionsMetrics {
  // Calculate days to expiration
  const expirationDate = new Date(option.expiration);
  const today = new Date();
  const diffTime = expirationDate.getTime() - today.getTime();
  const daysToExpiration = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Calculate premium (mid-price)
  const premium = (option.bid + option.ask) / 2;

  // Calculate annualized return using your formula
  const annualizedReturn = (premium / (option.strike - premium)) * (365 / daysToExpiration);

  // Calculate breakeven
  const breakeven = option.strike - premium;

  // Estimate profit probability (simplified Black-Scholes approximation)
  const profitProbability = Math.abs(option.delta);

  // Calculate max profit/loss for put selling
  const maxProfit = premium;
  const maxLoss = option.strike - premium;

  return {
    annualizedReturn,
    breakeven,
    daysToExpiration,
    premium,
    profitProbability,
    maxProfit,
    maxLoss
  };
}

export function filterGoodTrades(
  options: PutOption[],
  minAnnualizedReturn: number = 0.20,
  deltaRange: { min: number; max: number } = { min: -0.5, max: -0.3 }
): PutOption[] {
  return options.filter(option => {
    const metrics = calculateOptionsMetrics(option);
    
    // Check annualized return criteria
    const meetsReturnCriteria = metrics.annualizedReturn >= minAnnualizedReturn;
    
    // Check delta criteria
    const meetsDeltaCriteria = option.delta >= deltaRange.min && option.delta <= deltaRange.max;
    
    return meetsReturnCriteria && meetsDeltaCriteria;
  });
}

export function sortByAnnualizedReturn(options: PutOption[], order: 'asc' | 'desc' = 'desc'): PutOption[] {
  return [...options].sort((a, b) => {
    const aReturn = calculateOptionsMetrics(a).annualizedReturn;
    const bReturn = calculateOptionsMetrics(b).annualizedReturn;
    
    return order === 'desc' ? bReturn - aReturn : aReturn - bReturn;
  });
}

// AI Integration Helper Functions
export function generateOptionsPrompt(symbol: string, criteria: {
  minReturn: number;
  deltaRange: { min: number; max: number };
}): string {
  return `Extract all ${symbol} put options with:
  - Delta between ${criteria.deltaRange.min} and ${criteria.deltaRange.max}
  - Calculate annualized return using formula: (premium / (strike - premium)) * (365 / daysToExpiration)
  - Show only options with annualized return > ${criteria.minReturn * 100}%
  - Include IV, theta, delta, breakeven, and expiration data
  - Sort by highest annualized return`;
}

export function extractOptionsFromText(text: string): Partial<PutOption>[] {
  // This function would parse options data from text/screenshot
  // Implementation would depend on the format of your data source
  const lines = text.split('\n');
  const options: Partial<PutOption>[] = [];
  
  lines.forEach(line => {
    // Parse each line for option data
    // This is a simplified example - you'd need to adapt based on your data format
    const parts = line.split(/\s+/);
    if (parts.length >= 6) {
      try {
        const option: Partial<PutOption> = {
          strike: parseFloat(parts[0]),
          bid: parseFloat(parts[1]),
          ask: parseFloat(parts[2]),
          delta: parseFloat(parts[3]),
          impliedVolatility: parseFloat(parts[4]),
          expiration: parts[5]
        };
        options.push(option);
      } catch (error) {
        // Skip invalid lines
        console.debug('Failed to parse option line:', error);
      }
    }
  });
  
  return options;
}

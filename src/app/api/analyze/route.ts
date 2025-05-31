import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PutOption } from '../../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Type definitions for the API request data
interface OptionAnalysisData {
  option: PutOption;
  underlyingPrice: number;
}

interface ChainAnalysisData {
  options: PutOption[];
  symbol: string;
  underlyingPrice: number;
}

interface PortfolioSuggestionData {
  portfolio: {
    cash: number;
    activePositions: number;
    unrealizedPnL: number;
  };
  availableOptions?: PutOption[];
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    let prompt = '';
    const systemPrompt = `You are an expert options trading analyst and educator. Provide clear, educational analysis focused on selling put options for premium collection. Always emphasize this is for educational/paper trading purposes and include risk warnings.`;

    switch (action) {
      case 'analyze_option':
        prompt = createOptionAnalysisPrompt(data as OptionAnalysisData);
        break;
      case 'analyze_chain':
        prompt = createChainAnalysisPrompt(data as ChainAnalysisData);
        break;
      case 'suggest_plays':
        prompt = createSuggestionPrompt(data as PortfolioSuggestionData);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze options' },
      { status: 500 }
    );
  }
}

function createOptionAnalysisPrompt(data: OptionAnalysisData): string {
  const { option, underlyingPrice } = data;
  
  return `Analyze this put option for selling (collecting premium):

**Option Details:**
- Symbol: ${option.symbol}
- Current Stock Price: $${underlyingPrice}
- Strike Price: $${option.strike}
- Expiration: ${option.expiration}
- Bid Price: $${option.bid}
- Implied Volatility: ${(option.impliedVolatility * 100).toFixed(1)}%
- Delta: ${option.delta}
- Days to Expiration: ${Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}

**Analysis Request:**
1. **Risk Assessment**: What's the probability of assignment? What happens if assigned?
2. **Reward Analysis**: Premium yield, annualized return potential
3. **Key Levels**: Break-even point, support/resistance considerations
4. **Market Context**: Is this IV high/low historically? Good time to sell puts?
5. **Recommendation**: Rate this trade 1-10 and explain why

Keep it concise but educational. Focus on the put-selling strategy specifically.`;
}

function createChainAnalysisPrompt(data: ChainAnalysisData): string {
  const { options, symbol, underlyingPrice } = data;
  
  const optionsSummary = options.slice(0, 10).map((opt: PutOption) => 
    `$${opt.strike} (${opt.bid}, IV: ${(opt.impliedVolatility * 100).toFixed(0)}%)`
  ).join(', ');

  return `Analyze this options chain for put selling opportunities:

**Market Overview:**
- Symbol: ${symbol}
- Current Price: $${underlyingPrice}
- Available Strikes: ${optionsSummary}

**Analysis Request:**
1. **Best Opportunities**: Which strikes offer the best risk/reward for selling puts?
2. **Market Sentiment**: What does the IV skew tell us about market expectations?
3. **Strategy Suggestions**: 
   - Conservative plays (lower risk)
   - Aggressive plays (higher premium)
   - Sweet spot recommendations
4. **Market Timing**: Based on IV levels, is this a good time to sell puts on ${symbol}?
5. **Risk Management**: What to watch out for with this underlying

Provide 2-3 specific strike recommendations with reasoning.`;
}

function createSuggestionPrompt(data: PortfolioSuggestionData): string {
  const { portfolio } = data;
  
  return `Based on this portfolio, suggest optimal put selling strategies:

**Current Portfolio:**
- Cash Available: $${portfolio.cash.toLocaleString()}
- Active Positions: ${portfolio.activePositions}
- Total P&L: $${portfolio.unrealizedPnL.toLocaleString()}

**Available Markets:** SPY, QQQ, AAPL, MSFT, TSLA, NVDA, AMZN, GOOGL and other liquid options

**Strategy Request:**
1. **Diversification**: How to spread risk across different underlyings
2. **Position Sizing**: Optimal contract quantities given portfolio size (${portfolio.cash.toLocaleString()} available)
3. **Risk Management**: Maximum allocation to any single position
4. **Income Strategy**: Best premium collection opportunities for current market conditions
5. **Specific Recommendations**: 3 concrete trades to consider with reasoning

Focus on building a balanced put-selling portfolio for steady premium income. Consider the portfolio size and existing exposure.`;
}

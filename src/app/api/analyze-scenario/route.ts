import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PutOption } from '@/app/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ScenarioAnalysisRequest {
  symbol: string;
  currentPrice: number;
  crashPrice: number;
  options: PutOption[];
  crashPercent: number;
  timeframe: string;
}

export async function POST(request: Request) {
  try {
    const data: ScenarioAnalysisRequest = await request.json();
    const { symbol, currentPrice, crashPrice, options, crashPercent, timeframe } = data;

    // Add options data to the prompt
    const optionsData = options
      .slice(0, 5) // Limit to top 5 options for conciseness
      .map(opt => (
        `• $${opt.strike} Put (${opt.expiration}): Premium $${opt.bid}, Buffer ${((crashPrice - opt.strike) / opt.strike * 100).toFixed(1)}%`
      ))
      .join('\n');

    const prompt = `This is a PAPER TRADING educational exercise analyzing a hypothetical ${crashPercent}% market correction scenario for ${symbol}. Please provide an educational analysis of this scenario for learning purposes:

Current Market Setup:
- ${symbol} Current Price: $${currentPrice} 
- Hypothetical Crash Target: $${crashPrice} (${crashPercent}% drop)
- Analysis Timeframe: ${timeframe}

Available Put Options for Educational Analysis:
${optionsData}

Please provide an EDUCATIONAL analysis in this format:

**Market Context**
• Historical perspective on ${crashPercent}% corrections
• Economic factors that could trigger such moves
• Market dynamics during similar scenarios

**Strike Analysis**
• Educational comparison of strike levels vs crash target
• Risk/reward analysis of different strike distances
• Theoretical safety margins for each level

**Risk Factors**
• Key risks in put-selling strategies during volatility
• Assignment probability considerations
• Market timing and volatility risks

**Educational Strategy Notes**
• General principles for crash protection
• Portfolio allocation concepts
• Risk management theory

This is for EDUCATIONAL/PAPER TRADING purposes only. Focus on teaching concepts and theoretical analysis rather than specific investment advice.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ 
        role: 'user', 
        content: prompt 
      }]
    });

    const analysis = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Analysis unavailable';

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Scenario analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze scenario'
    }, { status: 500 });
  }
}

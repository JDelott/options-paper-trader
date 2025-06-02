import { NextRequest, NextResponse } from 'next/server';
import { PutOption, OptionsAnalysisResult,  } from '../../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Portfolio {
  cash: number;
  totalValue: number;
  unrealizedPnL: number;
}

interface ChatRequest {
  message: string;
  context?: string;
  chatHistory?: ChatMessage[];
  step?: number;
  symbol?: string;
  price?: number;
  selectedOption?: PutOption;
  selectedOptions?: OptionsAnalysisResult[];
  portfolio?: Portfolio;
  // Existing AI Analysis props
  options?: PutOption[];
  underlyingPrice?: number;
  chatType?: 'global' | 'analysis'; // New field to distinguish
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { 
      message, 
      context, 
      chatHistory, 
      step, 
      symbol, 
      price, 
      selectedOption, 
      selectedOptions, 
      portfolio,
      options,
      underlyingPrice,
      chatType = 'analysis' // Default to existing behavior
    } = body;

    let systemPrompt = '';

    if (chatType === 'global') {
      // Global chat system prompt - use the context variables
      const currentStep = step || 1;
      const currentSymbol = symbol || 'Unknown';
      const currentPrice = price || underlyingPrice || 0;
      const hasSelectedOption = selectedOption !== undefined;
      const selectedOptionsCount = selectedOptions?.length || 0;
      const portfolioInfo = portfolio ? `Cash: $${portfolio.cash}, P&L: $${portfolio.unrealizedPnL}` : 'No portfolio data';

      systemPrompt = `You are an expert options trading AI assistant for a paper trading app. You help users learn put-selling strategies, analyze options, and understand risk management.

Current Context: ${context || `Step ${currentStep}, Symbol: ${currentSymbol}, Price: $${currentPrice}`}

Current State:
- Step: ${currentStep}
- Symbol: ${currentSymbol} (${currentPrice > 0 ? `$${currentPrice}` : 'price loading'})
- Selected Option: ${hasSelectedOption ? `$${selectedOption?.strike} put` : 'none'}
- Options for Comparison: ${selectedOptionsCount}
- Portfolio: ${portfolioInfo}

Key Capabilities:
- Explain options strategies and Greeks
- Analyze risk/reward scenarios
- Calculate annualized returns: (premium / (strike - premium)) * (365 / daysToExpiration)
- Provide step-by-step guidance
- Review portfolio performance
- Educational risk management advice

Guidelines:
- Always emphasize this is paper trading for education
- Be specific with calculations when analyzing options
- Use emojis sparingly but effectively
- Keep responses concise but informative
- Focus on practical, actionable advice
- Explain the "why" behind recommendations

Chat History: ${JSON.stringify(chatHistory?.slice(-3) || [])}`;
    } else {
      // Existing AI Analysis system prompt
      const analysisSymbol = symbol || 'Unknown';
      const analysisPrice = underlyingPrice || price || 0;
      const optionsCount = options?.length || 0;

      systemPrompt = `You are an expert options trading AI assistant. Analyze the provided options data and give specific trading advice for put-selling strategies.

Focus on:
- Risk assessment and probability of profit
- Annualized return calculations
- Time decay and expiration considerations
- Strike price selection relative to current price
- Market conditions and volatility

Current symbol: ${analysisSymbol}
Current price: $${analysisPrice}
Available options: ${optionsCount}

Provide specific, actionable advice with calculations where relevant.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser Question: ${message}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.content[0].text;

    return NextResponse.json({
      success: true,
      response: assistantResponse
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatScenarioRequest {
  message: string;
  context: {
    symbol: string;
    currentPrice: number;
    crashPercent: number;
    targetReturn: number;
    timeframe: string;
    crashPrice: number;
    results: {
      strike: number;
      premium: number;
      safetyBuffer: number;
      returnOnRisk: number;
    }[];
    aiAnalysis: string;
    previousMessages: ChatMessage[];
  };
}

export async function POST(request: Request) {
  try {
    const data: ChatScenarioRequest = await request.json();
    const { message, context } = data;

    // Build context string with current analysis
    const contextString = `
CURRENT ANALYSIS CONTEXT:
- Symbol: ${context.symbol}
- Current Price: $${context.currentPrice}
- Crash Scenario: ${context.crashPercent}% drop to $${context.crashPrice}
- Target Return: ${context.targetReturn}% annually
- Timeframe: ${context.timeframe}
- Results Found: ${context.results.length} crash-safe put options

TOP RESULTS:
${context.results.slice(0, 3).map((result, i) => 
  `${i + 1}. $${result.strike} Put - Premium: $${result.premium}, Safety Buffer: ${result.safetyBuffer.toFixed(1)}%, Return/Risk: ${result.returnOnRisk.toFixed(1)}%`
).join('\n')}

PREVIOUS AI ANALYSIS:
${context.aiAnalysis.substring(0, 500)}...

CONVERSATION HISTORY:
${context.previousMessages.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
`;

    const prompt = `You are a helpful AI assistant specializing in options education and paper trading analysis. You have full context of the user's current crash scenario analysis for ${context.symbol}.

Context: ${contextString}

User's Question: ${message}

Please provide a helpful, educational response that:
1. References the specific analysis context when relevant
2. Answers the user's question directly
3. Provides educational insights about options strategies
4. Maintains the educational/paper trading focus
5. Suggests follow-up analysis if helpful

Keep responses conversational but informative. Reference specific strikes, percentages, or results from their analysis when relevant.

This is for EDUCATIONAL/PAPER TRADING purposes only.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for faster chat responses
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ 
        role: 'user', 
        content: prompt 
      }]
    });

    const chatResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Sorry, I encountered an error processing your message.';

    return NextResponse.json({
      success: true,
      response: chatResponse
    });

  } catch (error) {
    console.error('Chat scenario error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message'
    }, { status: 500 });
  }
}

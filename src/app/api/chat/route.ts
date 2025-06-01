import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PutOption } from '../../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PortfolioDetails {
  cash: number;
  activePositions: number;
  unrealizedPnL: number;
}

interface ChatContext {
  type: 'option' | 'portfolio';
  symbol?: string;
  optionDetails?: PutOption;
  portfolioDetails?: PortfolioDetails;
  originalAnalysis?: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: ChatContext;
  newMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context, newMessage }: ChatRequest = await request.json();

    // Build the conversation history for Claude
    const conversationMessages = [
      {
        role: "user" as const,
        content: buildContextPrompt(context)
      },
      ...messages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: newMessage
      }
    ];

    const systemPrompt = `You are an expert options trading analyst continuing a conversation about options analysis. 

Key guidelines:
- This is for educational/paper trading purposes only
- Focus on put-selling strategies and premium collection
- Be conversational but informative
- Reference previous parts of the conversation when relevant
- Always include appropriate risk warnings
- Keep responses concise but helpful
- If asked about specific trades, provide educational analysis not financial advice`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      temperature: 0.7,
      system: systemPrompt,
      messages: conversationMessages
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

function buildContextPrompt(context: ChatContext): string {
  let prompt = `You are having a conversation about options trading analysis. Here's the context:\n\n`;
  
  if (context.type === 'option' && context.optionDetails) {
    const option = context.optionDetails;
    prompt += `**Current Option Being Discussed:**
- Symbol: ${option.symbol}
- Strike: $${option.strike}
- Expiration: ${option.expiration}
- Premium: $${option.bid}
- Current Stock Price: $${option.underlyingPrice}
- Implied Volatility: ${(option.impliedVolatility * 100).toFixed(1)}%\n\n`;
  }
  
  if (context.type === 'portfolio' && context.portfolioDetails) {
    const portfolio = context.portfolioDetails;
    prompt += `**Current Portfolio Being Discussed:**
- Cash Available: $${portfolio.cash.toLocaleString()}
- Active Positions: ${portfolio.activePositions}
- Unrealized P&L: $${portfolio.unrealizedPnL.toLocaleString()}\n\n`;
  }

  if (context.originalAnalysis) {
    prompt += `**Original Analysis:**
${context.originalAnalysis}\n\n`;
  }

  prompt += `The user will now ask follow-up questions about this analysis. Please provide helpful, educational responses focused on options trading education.`;
  
  return prompt;
}

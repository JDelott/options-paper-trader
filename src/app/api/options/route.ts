import { NextRequest, NextResponse } from 'next/server';

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
    // Make an internal API call to the tradier endpoint
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'  // Replace with your actual domain
      : 'http://localhost:3000';
    
    const tradierResponse = await fetch(`${baseUrl}/api/tradier?symbol=${symbol}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!tradierResponse.ok) {
      throw new Error(`Tradier API returned ${tradierResponse.status}`);
    }
    
    const data = await tradierResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling Tradier API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get market data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Cache clearing endpoint
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();
  
  return NextResponse.json({ 
    message: symbol ? `Cache clearing requested for ${symbol}` : 'Cache clearing requested for all symbols' 
  });
}

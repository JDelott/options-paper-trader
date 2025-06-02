import { NextRequest, NextResponse } from 'next/server';
import { Trade } from '../../types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '100');

  // Get trades from portfolio/storage
  const trades = getTradesFromStorage();
  
  let filteredTrades = trades;

  // Apply filters
  if (symbol) {
    filteredTrades = filteredTrades.filter((t: Trade) => t.symbol === symbol.toUpperCase());
  }

  if (startDate) {
    filteredTrades = filteredTrades.filter((t: Trade) => t.entryDate >= startDate);
  }

  if (endDate) {
    filteredTrades = filteredTrades.filter((t: Trade) => t.entryDate <= endDate);
  }

  // Sort by date (most recent first) and limit
  filteredTrades = filteredTrades
    .sort((a: Trade, b: Trade) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, limit);

  return NextResponse.json({
    trades: filteredTrades,
    total: filteredTrades.length,
    filters: { symbol, startDate, endDate, limit }
  });
}

function getTradesFromStorage(): Trade[] {
  // This would integrate with your existing localStorage trades
  // or database in production
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('paper-trades');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
}

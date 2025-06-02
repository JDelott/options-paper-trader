import {  NextResponse } from 'next/server';
import { Trade, PerformanceMetrics } from '../../types';

export async function GET() {
  try {
    const trades = getTradesFromStorage();
    const performance = calculatePerformanceMetrics(trades);
    
    return NextResponse.json(performance);
  } catch (error) {
    console.error('Error calculating performance:', error);
    return NextResponse.json(
      { error: 'Failed to calculate performance' },
      { status: 500 }
    );
  }
}

function calculatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const totalTrades = closedTrades.length;
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0
    };
  }

  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
  
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
    : 0;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / totalTrades) * 100,
    totalPnL,
    avgWin,
    avgLoss,
    profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
    sharpeRatio: calculateSharpeRatio(closedTrades),
    maxDrawdown: calculateMaxDrawdown(closedTrades)
  };
}

function calculateSharpeRatio(trades: Trade[]): number {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(t => (t.pnl || 0) / (t.premiumReceived || 1));
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev > 0 ? avgReturn / stdDev : 0;
}

function calculateMaxDrawdown(trades: Trade[]): number {
  let peak = 0;
  let maxDrawdown = 0;
  let runningTotal = 0;
  
  for (const trade of trades) {
    runningTotal += trade.pnl || 0;
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

function getTradesFromStorage(): Trade[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('paper-trades');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
}

import { NextRequest, NextResponse } from 'next/server';
import { Portfolio } from '../../types';

// In-memory storage (use database in production)
let portfolioData: Portfolio = {
  id: 'paper-portfolio-1',
  userId: 'paper-trader',
  cash: 10000,
  totalValue: 10000,
  dayChange: 0,
  dayChangePercent: 0,
  buyingPower: 10000,
  positions: [],
  orders: [],
  trades: [],
  performance: {
    totalReturn: 0,
    totalReturnPercent: 0,
    winRate: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  },
  lastUpdated: new Date().toISOString()
};

// Load from localStorage if browser-based (for compatibility with your existing system)
function loadPortfolio(): Portfolio {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('paper-portfolio');
    if (saved) {
      return JSON.parse(saved);
    }
  }
  return portfolioData;
}

function savePortfolio(portfolio: Portfolio): void {
  portfolioData = portfolio;
  if (typeof window !== 'undefined') {
    localStorage.setItem('paper-portfolio', JSON.stringify(portfolio));
  }
}

export async function GET() {
  try {
    const portfolio = loadPortfolio();
    
    // Update portfolio with real-time data
    const updatedPortfolio = await updatePortfolioValues(portfolio);
    savePortfolio(updatedPortfolio);

    return NextResponse.json(updatedPortfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const portfolio = loadPortfolio();
    
    const updatedPortfolio = {
      ...portfolio,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    savePortfolio(updatedPortfolio);

    return NextResponse.json(updatedPortfolio);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

async function updatePortfolioValues(portfolio: Portfolio): Promise<Portfolio> {
  // Update positions with current market prices
  const updatedPositions = await Promise.all(
    portfolio.positions.map(async (position) => {
      try {
        // Fetch current price from your quotes API
        const response = await fetch(`http://localhost:3000/api/quotes/${position.symbol}`);
        const quote = await response.json();
        
        const currentPrice = quote.price;
        const marketValue = position.quantity * currentPrice * (position.type === 'stock' ? 1 : 100);
        const unrealizedPnl = marketValue - (position.quantity * position.avgCost * (position.type === 'stock' ? 1 : 100));
        
        return {
          ...position,
          currentPrice,
          marketValue,
          unrealizedPnl,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error updating position ${position.symbol}:`, error);
        return position; // Return unchanged if error
      }
    })
  );

  const totalPositionValue = updatedPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalValue = portfolio.cash + totalPositionValue;
  const dayChange = totalValue - 10000; // Assuming starting value of $10,000

  return {
    ...portfolio,
    positions: updatedPositions,
    totalValue,
    dayChange,
    dayChangePercent: (dayChange / 10000) * 100,
    lastUpdated: new Date().toISOString()
  };
}

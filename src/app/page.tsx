"use client";

import { useState, useEffect, useCallback } from 'react';
import { OptionsSearch } from './components/OptionsSearch';
import { Portfolio } from './components/Portfolio';
import { TradeModal } from './components/TradeModal';
import { PutOption, Trade } from './types';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<PutOption | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [portfolio, setPortfolio] = useState({
    cash: 10000, // Starting with $10k paper money
    totalValue: 10000,
    unrealizedPnL: 0
  });

  // Memoize the calculatePortfolioValue function
  const calculatePortfolioValue = useCallback(() => {
    const activeTrades = trades.filter(trade => trade.status === 'active');
    const premiumCollected = activeTrades.reduce((sum, trade) => sum + trade.premiumReceived, 0);
    
    setPortfolio(prev => ({
      ...prev,
      totalValue: prev.cash + premiumCollected,
      unrealizedPnL: premiumCollected
    }));
  }, [trades]);

  // Load trades from localStorage on mount
  useEffect(() => {
    const savedTrades = localStorage.getItem('paper-trades');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Save trades to localStorage whenever trades change
  useEffect(() => {
    localStorage.setItem('paper-trades', JSON.stringify(trades));
    calculatePortfolioValue();
  }, [trades, calculatePortfolioValue]);

  const handleSellPut = (option: PutOption, contracts: number) => {
    const premium = option.bid * contracts * 100; // Options are per 100 shares
    const newTrade: Trade = {
      id: Date.now().toString(),
      symbol: option.symbol,
      type: 'put',
      action: 'sell',
      strike: option.strike,
      expiration: option.expiration,
      contracts,
      premiumReceived: premium,
      entryDate: new Date().toISOString(),
      status: 'active'
    };

    setTrades(prev => [...prev, newTrade]);
    setPortfolio(prev => ({
      ...prev,
      cash: prev.cash + premium
    }));
    setShowTradeModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Options Paper Trader
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Practice selling puts and collecting premiums
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                Cash: ${portfolio.cash.toLocaleString()}
              </div>
              <div className={`text-sm ${portfolio.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                P&L: ${portfolio.unrealizedPnL.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Options Search Section */}
          <div className="space-y-6">
            <OptionsSearch 
              onSelectOption={(option) => {
                setSelectedOption(option);
                setShowTradeModal(true);
              }}
            />
          </div>

          {/* Portfolio Section */}
          <div className="space-y-6">
            <Portfolio trades={trades} onCloseTrade={(tradeId) => {
              setTrades(prev => prev.map(trade => 
                trade.id === tradeId 
                  ? { ...trade, status: 'closed' as const, closeDate: new Date().toISOString() }
                  : trade
              ));
            }} />
          </div>
        </div>
      </main>

      {/* Trade Modal */}
      {showTradeModal && selectedOption && (
        <TradeModal
          option={selectedOption}
          onConfirm={handleSellPut}
          onCancel={() => setShowTradeModal(false)}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from 'react';
import { OptionsSearch } from './components/OptionsSearch';
import { Portfolio } from './components/Portfolio';
import { TradeModal } from './components/TradeModal';
import { AIAnalysis } from './components/AIAnalysis';
import { PutOption, Trade } from './types';

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<PutOption | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentOptions, setCurrentOptions] = useState<PutOption[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string>('SPY');
  const [currentPrice, setCurrentPrice] = useState<number>(580);
  const [portfolio, setPortfolio] = useState({
    cash: 10000,
    totalValue: 10000,
    unrealizedPnL: 0
  });

  const calculatePortfolioValue = useCallback(() => {
    const activeTrades = trades.filter(trade => trade.status === 'active');
    const premiumCollected = activeTrades.reduce((sum, trade) => sum + trade.premiumReceived, 0);
    
    setPortfolio(prev => ({
      ...prev,
      totalValue: prev.cash + premiumCollected,
      unrealizedPnL: premiumCollected
    }));
  }, [trades]);

  useEffect(() => {
    const savedTrades = localStorage.getItem('paper-trades');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('paper-trades', JSON.stringify(trades));
    calculatePortfolioValue();
  }, [trades, calculatePortfolioValue]);

  const handleSellPut = (option: PutOption, contracts: number) => {
    const premium = option.bid * contracts * 100;
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

  const handleOptionsLoaded = (options: PutOption[], symbol: string, underlyingPrice: number) => {
    setCurrentOptions(options);
    setCurrentSymbol(symbol);
    setCurrentPrice(underlyingPrice);
  };

  const activeTrades = trades.filter(trade => trade.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                Options Paper Trader
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Practice selling puts • Collect premiums • AI-powered analysis
              </p>
            </div>
            
            {/* Portfolio Stats - Horizontal Layout */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Value</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${portfolio.totalValue.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Cash</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ${portfolio.cash.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">P&L</div>
                <div className={`text-lg font-semibold ${portfolio.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ${portfolio.unrealizedPnL.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
        {/* Top Row - Options Chain and AI Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Options Chain - Takes 3/4 width */}
          <div className="lg:col-span-3">
            <OptionsSearch 
              onSelectOption={(option) => {
                setSelectedOption(option);
                setShowTradeModal(true);
              }}
              onOptionsLoaded={handleOptionsLoaded}
            />
          </div>
          
          {/* AI Analysis Sidebar - Takes 1/4 width, full height */}
          <div className="lg:col-span-1">
            <div className="h-[600px]">
              <AIAnalysis 
                options={currentOptions}
                selectedOption={selectedOption}
                symbol={currentSymbol}
                underlyingPrice={currentPrice}
                portfolio={{
                  cash: portfolio.cash,
                  activePositions: activeTrades.length,
                  unrealizedPnL: portfolio.unrealizedPnL
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row - Portfolio (Full Width) */}
        <div>
          <Portfolio trades={trades} onCloseTrade={(tradeId) => {
            setTrades(prev => prev.map(trade => 
              trade.id === tradeId 
                ? { ...trade, status: 'closed' as const, closeDate: new Date().toISOString() }
                : trade
            ));
          }} />
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

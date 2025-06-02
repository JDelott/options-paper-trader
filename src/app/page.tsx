"use client";

import { useState, useEffect, useCallback } from 'react';
import { Portfolio } from './components/Portfolio';
import { TradeModal } from './components/TradeModal';
import { AIAnalysis } from './components/AIAnalysis';
import { ScenarioAnalysis } from './components/ScenarioAnalysis';
import { PutOption, Trade } from './types';
import { OptionsScanner } from './components/OptionsScanner';
import { IVRankChart } from './components/IVRankChart';
import { RiskProfiler } from './components/RiskProfiler';
import { OpportunitiesDashboard } from './components/OpportunitiesDashboard';
import dynamic from 'next/dynamic';

const OptionsSearch = dynamic(() => import('./components/OptionsSearch').then(mod => ({ default: mod.OptionsSearch })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
    </div>
  )
});

// Add interface for stock data
interface StockData {
  symbol: string;
  name: string;
  price: number;
  loading: boolean;
  error?: string;
}

export default function Home() {
  const [selectedOption, setSelectedOption] = useState<PutOption | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentOptions, setCurrentOptions] = useState<PutOption[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string>('SPY');
  const [currentPrice, setCurrentPrice] = useState<number>(580);
  const [activeView, setActiveView] = useState<'trading' | 'scenario'>('trading');
  const [currentStep, setCurrentStep] = useState(1);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // State for default stocks with real-time prices
  const [defaultStocks, setDefaultStocks] = useState<StockData[]>([
    { symbol: 'SPY', name: 'S&P 500 ETF', price: 0, loading: true },
    { symbol: 'QQQ', name: 'Nasdaq ETF', price: 0, loading: true },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 0, loading: true },
    { symbol: 'MSFT', name: 'Microsoft', price: 0, loading: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 0, loading: true },
    { symbol: 'NVDA', name: 'NVIDIA', price: 0, loading: true }
  ]);

  const [portfolio, setPortfolio] = useState({
    cash: 10000,
    totalValue: 10000,
    unrealizedPnL: 0
  });

  // Function to fetch real-time stock price
  const fetchStockPrice = useCallback(async (symbol: string): Promise<number> => {
    try {
      const response = await fetch(`/api/tradier?symbol=${symbol.toUpperCase()}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch stock price');
      }
      
      return data.underlyingPrice || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }, []);

  // Function to validate and search for a symbol
  const handleSymbolSearch = useCallback(async (symbol: string) => {
    if (!symbol.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    
    try {
      const price = await fetchStockPrice(symbol);
      
      if (price > 0) {
        setCurrentSymbol(symbol.toUpperCase());
        setCurrentPrice(price);
        setCurrentStep(2);
        setSearchSymbol('');
      } else {
        setSearchError('Invalid symbol or no price data available');
      }
    } catch (error) {
      setSearchError('Symbol not found or invalid');
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [fetchStockPrice]);

  // Function to select a default stock
  const handleStockSelection = useCallback(async (stockData: StockData) => {
    if (stockData.loading) return;
    
    try {
      // Fetch fresh price to ensure accuracy
      const freshPrice = await fetchStockPrice(stockData.symbol);
      setCurrentSymbol(stockData.symbol);
      setCurrentPrice(freshPrice);
      setCurrentStep(2);
    } catch (error) {
      console.error(`Error selecting ${stockData.symbol}:`, error);
      // Fallback to cached price if fresh fetch fails
      setCurrentSymbol(stockData.symbol);
      setCurrentPrice(stockData.price);
      setCurrentStep(2);
    }
  }, [fetchStockPrice]);

  // Load real-time prices for default stocks on component mount
  useEffect(() => {
    const loadDefaultStockPrices = async () => {
      console.log('🔄 Loading real-time prices for default stocks...');
      
      const updatedStocks = await Promise.all(
        defaultStocks.map(async (stock) => {
          try {
            const price = await fetchStockPrice(stock.symbol);
            console.log(`✅ ${stock.symbol}: $${price}`);
            return { ...stock, price, loading: false };
          } catch (error) {
            console.error(`❌ Failed to load ${stock.symbol}:`, error);
            return { 
              ...stock, 
              price: 0, 
              loading: false, 
              error: 'Failed to load price' 
            };
          }
        })
      );
      
      setDefaultStocks(updatedStocks);
      console.log('✅ All default stock prices loaded');
    };

    loadDefaultStockPrices();
  }, [fetchStockPrice]);

  const calculatePortfolioValue = useCallback(() => {
    const premiumCollected = trades.filter(trade => trade.status === 'active').reduce((sum, trade) => sum + trade.premiumReceived, 0);
    
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
    
    // Navigate to portfolio step after successful trade
    setCurrentStep(4);
  };

  const handleOptionsLoaded = (options: PutOption[], symbol: string, underlyingPrice: number) => {
    setCurrentOptions(options);
    setCurrentSymbol(symbol);
    setCurrentPrice(underlyingPrice);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            
            {/* Portfolio Stats */}
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveView('trading')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'trading'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Live Trading
            </button>
            <button
              onClick={() => setActiveView('scenario')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeView === 'scenario'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Crash Scenario Analysis
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeView === 'trading' ? (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Step Indicator */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                      <span className="font-medium">Select Symbol</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                      <span className="font-medium">Browse Options</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                      <span className="font-medium">Analyze & Trade</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 4 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>4</div>
                      <span className="font-medium">Portfolio</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">P&L</div>
                      <div className={`font-bold ${portfolio.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${portfolio.unrealizedPnL.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Positions</div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {trades.filter(t => t.status === 'active').length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Step 1: Symbol Selection with Real-Time Data */}
              {currentStep === 1 && (
                <div className="max-w-4xl mx-auto text-center space-y-8">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                      Choose Your Symbol
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                      Select a stock or ETF to explore put selling opportunities
                    </p>
                  </div>
                  
                  {/* Real-Time Default Stocks */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {defaultStocks.map(stock => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleStockSelection(stock)}
                        disabled={stock.loading}
                        className={`p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all text-center group ${
                          stock.loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                        }`}
                      >
                        <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600">
                          {stock.symbol}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {stock.name}
                        </div>
                        <div className="mt-2">
                          {stock.loading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
                            </div>
                          ) : stock.error ? (
                            <div className="text-xs text-red-500">Error loading</div>
                          ) : (
                            <div className="text-lg font-semibold text-emerald-600">
                              ${stock.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Enhanced Search Section */}
                  <div className="mt-8 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-4">
                        <input
                          type="text"
                          placeholder="Enter any symbol (e.g., AMZN, GOOGL)..."
                          value={searchSymbol}
                          onChange={(e) => {
                            setSearchSymbol(e.target.value.toUpperCase());
                            setSearchError(''); // Clear error when typing
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSymbolSearch(searchSymbol);
                            }
                          }}
                          className="px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          disabled={searchLoading}
                        />
                        <button 
                          onClick={() => handleSymbolSearch(searchSymbol)}
                          disabled={searchLoading || !searchSymbol.trim()}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                        >
                          {searchLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Searching...</span>
                            </div>
                          ) : (
                            'Search'
                          )}
                        </button>
                      </div>
                      
                      {/* Search Error Message */}
                      {searchError && (
                        <div className="text-red-500 text-sm text-center">
                          {searchError}
                        </div>
                      )}
                      
                      {/* Popular symbols suggestion */}
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        <p>Popular symbols: AMD, AMZN, GOOGL, META, NFLX, CRM, DIS, BA, JPM, GE</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Options Discovery */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {currentSymbol} Options Chain
                      </h1>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        Current Price: <span className="font-semibold text-emerald-600">${currentPrice}</span> • 
                        Choose puts to sell for premium collection
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      ← Change Symbol
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-8">
                    {/* Options Table */}
                    <div className="col-span-8">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Put Options</h2>
                        </div>
                        <div className="overflow-x-auto">
                          <OptionsSearch 
                            symbol={currentSymbol}
                            onSelectOption={(option) => {
                              setSelectedOption(option);
                              setCurrentStep(3);
                            }}
                            onOptionsLoaded={handleOptionsLoaded}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Insights */}
                    <div className="col-span-4 space-y-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Picks</h3>
                        <OpportunitiesDashboard options={currentOptions} />
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unusual Activity</h3>
                        <OptionsScanner options={currentOptions} symbol={currentSymbol} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Analysis & Trading */}
              {currentStep === 3 && selectedOption && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Analyze Your Trade
                      </h1>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        {selectedOption.symbol} ${selectedOption.strike} Put • Premium: ${selectedOption.bid}
                      </p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        ← Back to Options
                      </button>
                      <button
                        onClick={() => setCurrentStep(4)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        View Portfolio
                      </button>
                    </div>
                  </div>

                  {/* Trade Summary Card */}
                  <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white p-8 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                      <div className="md:col-span-3">
                        <h2 className="text-2xl font-bold mb-2">
                          Sell {selectedOption.symbol} ${selectedOption.strike} Put
                        </h2>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="opacity-75">Premium per contract</div>
                            <div className="text-xl font-bold">${selectedOption.bid}</div>
                          </div>
                          <div>
                            <div className="opacity-75">Expires</div>
                            <div className="text-xl font-bold">
                              {Math.ceil((new Date(selectedOption.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
                            </div>
                          </div>
                          <div>
                            <div className="opacity-75">Success Probability</div>
                            <div className="text-xl font-bold">{((1 - Math.abs(selectedOption.delta)) * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2 text-center">
                        <button
                          onClick={() => setShowTradeModal(true)}
                          className="w-full bg-white text-emerald-600 px-8 py-4 text-xl font-bold rounded-lg hover:bg-gray-100 transition-all"
                        >
                          Execute Trade
                        </button>
                        <div className="text-sm opacity-75 mt-2">
                          Max Risk: ${((selectedOption.strike - selectedOption.bid) * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Risk Analysis</h3>
                        <RiskProfiler 
                          selectedOptions={[selectedOption]}
                          underlyingPrice={currentPrice}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Insights</h3>
                        <AIAnalysis 
                          options={currentOptions}
                          selectedOption={selectedOption}
                          symbol={currentSymbol}
                          underlyingPrice={currentPrice}
                          portfolio={{
                            cash: portfolio.cash,
                            activePositions: trades.filter(t => t.status === 'active').length,
                            unrealizedPnL: portfolio.unrealizedPnL
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Portfolio Management */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Portfolio Management
                      </h1>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        Track your active positions and performance
                      </p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
                      >
                        New Trade
                      </button>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-lg"
                      >
                        Browse Options
                      </button>
                    </div>
                  </div>

                  {/* Success Message for New Trades */}
                  {trades.length > 0 && trades[trades.length - 1].entryDate && 
                   new Date().getTime() - new Date(trades[trades.length - 1].entryDate).getTime() < 10000 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                            Trade Executed Successfully!
                          </h3>
                          <p className="text-emerald-700 dark:text-emerald-400">
                            Your {trades[trades.length - 1].symbol} ${trades[trades.length - 1].strike} put has been added to your portfolio.
                            Premium collected: ${trades[trades.length - 1].premiumReceived.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Portfolio trades={trades} onCloseTrade={(tradeId) => {
                    setTrades(prev => prev.map(trade => 
                      trade.id === tradeId 
                        ? { ...trade, status: 'closed' as const, closeDate: new Date().toISOString() }
                        : trade
                    ));
                  }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Crash Scenario Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <ScenarioAnalysis 
                  options={currentOptions}
                  symbol={currentSymbol}
                  currentPrice={currentPrice}
                />
              </div>
              <div>
                <IVRankChart 
                  options={currentOptions}
                  symbol={currentSymbol}
                />
              </div>
            </div>
          </>
        )}
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

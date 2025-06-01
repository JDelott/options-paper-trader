"use client";

import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface OptionsSearchProps {
  onSelectOption: (option: PutOption) => void;
  onOptionsLoaded?: (options: PutOption[], symbol: string, underlyingPrice: number) => void;
}

export function OptionsSearch({ onSelectOption, onOptionsLoaded }: OptionsSearchProps) {
  const [symbol, setSymbol] = useState('SPY');
  const [options, setOptions] = useState<PutOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);

  const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'];

  const searchOptions = async (searchSymbol: string) => {
    if (!searchSymbol) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/options?symbol=${searchSymbol.toUpperCase()}`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.puts || []);
        setUnderlyingPrice(data.underlyingPrice);
        
        if (onOptionsLoaded) {
          onOptionsLoaded(data.puts || [], searchSymbol.toUpperCase(), data.underlyingPrice);
        }
      } else {
        console.error('Failed to fetch options:', data.error);
        generateSimulatedOptions(searchSymbol);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
      generateSimulatedOptions(searchSymbol);
    }
    setLoading(false);
  };

  const generateSimulatedOptions = (searchSymbol: string) => {
    const basePrice = getBasePrice(searchSymbol);
    setUnderlyingPrice(basePrice);
    
    const expirations = [
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ];
    
    const simulatedOptions: PutOption[] = [];
    
    expirations.forEach(expiration => {
      for (let i = -10; i <= 5; i++) {
        const strike = Math.round((basePrice + (i * basePrice * 0.02)) * 100) / 100;
        const timeToExpiry = (new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const moneyness = strike / basePrice;
        
        const intrinsicValue = Math.max(0, strike - basePrice);
        const timeValue = Math.max(0.01, 0.1 * Math.sqrt(timeToExpiry / 365) * basePrice * 0.2);
        const bid = Math.max(0.01, intrinsicValue + timeValue * 0.9);
        const ask = bid * 1.1;
        
        simulatedOptions.push({
          symbol: searchSymbol,
          strike,
          expiration,
          bid: Math.round(bid * 100) / 100,
          ask: Math.round(ask * 100) / 100,
          impliedVolatility: 0.15 + Math.random() * 0.3,
          openInterest: Math.floor(Math.random() * 1000) + 100,
          volume: Math.floor(Math.random() * 500),
          delta: Math.round((moneyness < 1 ? 0.1 + (1 - moneyness) * 0.8 : 0.1) * 100) / 100,
          gamma: Math.round(Math.random() * 0.1 * 100) / 100,
          theta: -Math.round(Math.random() * 0.05 * 100) / 100,
          underlyingPrice: basePrice
        });
      }
    });
    
    const sortedOptions = simulatedOptions.sort((a, b) => a.strike - b.strike);
    setOptions(sortedOptions);
    
    if (onOptionsLoaded) {
      onOptionsLoaded(sortedOptions, searchSymbol.toUpperCase(), basePrice);
    }
  };

  const getBasePrice = (sym: string): number => {
    const prices: { [key: string]: number } = {
      'SPY': 580, 'QQQ': 525, 'AAPL': 245, 'MSFT': 450,
      'TSLA': 350, 'NVDA': 900, 'AMZN': 190, 'GOOGL': 175
    };
    return prices[sym] || 100;
  };

  useEffect(() => {
    searchOptions(symbol);
  }, []);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getMoneyness = (strike: number, underlying: number) => {
    if (strike < underlying * 0.95) return 'OTM';
    if (strike > underlying * 1.05) return 'ITM';
    return 'ATM';
  };

  const getMoneynessStyle = (moneyness: string) => {
    switch (moneyness) {
      case 'ITM': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
      case 'ATM': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'OTM': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-full">
      {/* Compact Header with Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Options Chain</h2>
            {underlyingPrice && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                {symbol} • {formatCurrency(underlyingPrice)}
              </div>
            )}
          </div>
        </div>
        
        {/* Compact Symbol Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-gray-900 dark:text-white"
            placeholder="Symbol"
          />
          <button
            onClick={() => searchOptions(symbol)}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
          
          {/* Popular Symbols - Inline */}
          <div className="flex gap-1 ml-2">
            {popularSymbols.slice(0, 6).map(sym => (
              <button
                key={sym}
                onClick={() => {
                  setSymbol(sym);
                  searchOptions(sym);
                }}
                className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Options Table */}
      {options.length > 0 && (
        <div className="overflow-auto max-h-[500px]">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strike</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Premium</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IV</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delta</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {options.map((option, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(option.strike)}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getMoneynessStyle(getMoneyness(option.strike, option.underlyingPrice))}`}>
                        {getMoneyness(option.strike, option.underlyingPrice)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(option.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(option.bid)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    {formatPercent(option.impliedVolatility)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    {option.delta.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onSelectOption(option)}
                      className="px-3 py-1 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded transition-colors"
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

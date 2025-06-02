"use client";

import { useState, useEffect, useRef } from 'react';
import { PutOption } from '../types';

interface OptionsSearchProps {
  onSelectOption: (option: PutOption) => void;
  onOptionsLoaded?: (options: PutOption[], symbol: string, underlyingPrice: number) => void;
  symbol?: string;
}

type SortOption = 'strike' | 'premium' | 'volume' | 'oi';

export function OptionsSearch({ onSelectOption, onOptionsLoaded, symbol = 'SPY' }: OptionsSearchProps) {
  const [options, setOptions] = useState<PutOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [underlyingPrice, setUnderlyingPrice] = useState<number>(0);
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('strike');
  const [filterOTM, setFilterOTM] = useState(false);
  
  const onOptionsLoadedRef = useRef(onOptionsLoaded);
  onOptionsLoadedRef.current = onOptionsLoaded;

  const getBasePrice = (sym: string): number => {
    const prices: { [key: string]: number } = {
      'SPY': 580, 'QQQ': 525, 'AAPL': 245, 'MSFT': 450,
      'TSLA': 350, 'NVDA': 900, 'AMZN': 190, 'GOOGL': 175
    };
    return prices[sym] || 100;
  };

  const generateSimulatedOptions = (searchSymbol: string) => {
    const basePrice = getBasePrice(searchSymbol);
    setUnderlyingPrice(basePrice);
    
    const expirations: string[] = [];
    const today = new Date();
    
    // Simple approach: Add specific days from today
    const daysToAdd = [
      7, 14, 21, 28,           // Weeklies
      35, 42, 49, 56,          // More weeklies
      70, 84, 98, 112,         // ~2-4 months
      140, 168, 196, 224,      // ~5-8 months
      252, 280, 308, 336,      // ~9-12 months
      365, 420, 475, 530,      // 1-1.5 years
      585, 640, 695, 750,      // 1.5-2 years
      730, 1095, 1460          // LEAPS
    ];
    
    daysToAdd.forEach(days => {
      const date = new Date(today);
      date.setDate(today.getDate() + days);
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      expirations.push(dateString);
    });
    
    // Add some monthly options for good measure
    for (let month = 1; month <= 24; month++) {
      const date = new Date(today);
      date.setMonth(today.getMonth() + month);
      date.setDate(15); // 15th of each month
      
      const year = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${day}`;
      
      expirations.push(dateString);
    }
    
    // Remove duplicates and sort
    const uniqueExpirations = [...new Set(expirations)].sort();
    
    console.log('Generated expirations:', uniqueExpirations);
    console.log('Total unique expirations:', uniqueExpirations.length);
    
    const simulatedOptions: PutOption[] = [];
    
    uniqueExpirations.forEach(expiration => {
      const timeToExpiry = (new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      // Generate strikes from 30% below to 15% above current price
      for (let i = -30; i <= 15; i++) {
        const strike = Math.round((basePrice * (1 + i * 0.01)) * 100) / 100;
        if (strike <= 0) continue;
        
        const moneyness = strike / basePrice;
        const intrinsicValue = Math.max(0, strike - basePrice);
        const timeValue = Math.max(0.01, 
          0.05 * Math.sqrt(timeToExpiry / 365) * basePrice * 
          (0.20 + Math.random() * 0.15) *
          Math.exp(-Math.abs(moneyness - 1) * 2)
        );
        
        const bid = Math.max(0.01, intrinsicValue + timeValue * 0.95);
        
        simulatedOptions.push({
          symbol: searchSymbol,
          strike,
          expiration,
          bid: Math.round(bid * 100) / 100,
          ask: Math.round(bid * 1.05 * 100) / 100,
          impliedVolatility: 0.15 + Math.random() * 0.25,
          openInterest: Math.floor(Math.random() * 1000) + 100,
          volume: Math.floor(Math.random() * 500) + 10,
          delta: Math.round((moneyness < 1 ? 0.05 + (1 - moneyness) * 0.9 : 0.05) * 1000) / 1000,
          gamma: Math.round(Math.random() * 0.1 * 1000) / 1000,
          theta: -Math.round((bid * 0.05 * (365 / Math.max(timeToExpiry, 1))) * 1000) / 1000,
          underlyingPrice: basePrice
        });
      }
    });
    
    console.log(`Generated ${simulatedOptions.length} total options across ${uniqueExpirations.length} expiration dates`);
    
    setOptions(simulatedOptions);
    
    if (onOptionsLoadedRef.current) {
      onOptionsLoadedRef.current(simulatedOptions, searchSymbol.toUpperCase(), basePrice);
    }
  };

  const searchOptions = async (searchSymbol: string) => {
    if (!searchSymbol) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/options?symbol=${searchSymbol.toUpperCase()}`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.puts || []);
        setUnderlyingPrice(data.underlyingPrice || 0);
        
        if (onOptionsLoadedRef.current) {
          onOptionsLoadedRef.current(data.puts || [], searchSymbol.toUpperCase(), data.underlyingPrice || 0);
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

  useEffect(() => {
    if (symbol !== currentSymbol) {
      setCurrentSymbol(symbol);
      searchOptions(symbol);
    }
  }, [symbol, currentSymbol]);

  useEffect(() => {
    if (options.length === 0) {
      searchOptions(symbol);
    }
  }, []);

  // Filter and sort options
  const filteredOptions = options.filter(option => {
    if (selectedExpiration !== 'all' && option.expiration !== selectedExpiration) {
      return false;
    }
    if (filterOTM && option.strike >= underlyingPrice * 0.95) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'premium':
        return b.bid - a.bid;
      case 'volume':
        return b.volume - a.volume;
      case 'oi':
        return b.openInterest - a.openInterest;
      default:
        return a.strike - b.strike;
    }
  });

  // Get unique expirations for filter
  const expirations = [...new Set(options.map(o => o.expiration))].sort();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading comprehensive options data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters and Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expiration
            </label>
            <select
              value={selectedExpiration}
              onChange={(e) => setSelectedExpiration(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Expirations ({expirations.length})</option>
              {expirations.map(exp => {
                const date = new Date(exp);
                const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const label = days > 365 
                  ? `${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${(days/365).toFixed(1)}y)`
                  : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${days}d)`;
                
                return (
                  <option key={exp} value={exp}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="strike">Strike Price</option>
              <option value="premium">Premium (High to Low)</option>
              <option value="volume">Volume (High to Low)</option>
              <option value="oi">Open Interest (High to Low)</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterOTM}
                onChange={(e) => setFilterOTM(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Only OTM Puts
              </span>
            </label>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredOptions.length} of {options.length} options
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current Price: ${underlyingPrice}
            </div>
          </div>
        </div>
      </div>

      {filteredOptions.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Strike</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Bid/Ask</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">IV / Greeks</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Volume / OI</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Expiration</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Analysis</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredOptions.map((option, ) => {
                const isOTM = option.strike < underlyingPrice * 0.95;
                const daysToExpiry = Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const successRate = (1 - Math.abs(option.delta)) * 100;
                const annualizedReturn = (option.bid / option.strike) * (365 / daysToExpiry) * 100;
                
                return (
                  <tr key={`${option.symbol}-${option.strike}-${option.expiration}`} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            ${option.strike}
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            isOTM 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                          }`}>
                            {isOTM ? 'OTM' : 'ITM'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        ${option.bid.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Ask: ${option.ask.toFixed(2)}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ${(option.bid * 100).toFixed(0)} total
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {(option.impliedVolatility * 100).toFixed(1)}% IV
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Δ: {option.delta.toFixed(3)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Θ: {option.theta.toFixed(3)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Vol: {option.volume.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        OI: {option.openInterest.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {daysToExpiry}d
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(option.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {successRate.toFixed(0)}% Win
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {annualizedReturn.toFixed(1)}% Ann.
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onSelectOption(option)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-all transform group-hover:scale-105 text-xs"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg font-medium">No options match your filters</div>
            <div className="text-sm mt-1">Try adjusting the expiration or OTM filter</div>
          </div>
        </div>
      )}
    </div>
  );
}

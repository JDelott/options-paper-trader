"use client";

import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface OptionsSearchProps {
  onSelectOption: (option: PutOption) => void;
}

export function OptionsSearch({ onSelectOption }: OptionsSearchProps) {
  const [symbol, setSymbol] = useState('SPY');
  const [options, setOptions] = useState<PutOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [underlyingPrice, setUnderlyingPrice] = useState<number | null>(null);

  const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'];

  const searchOptions = async (searchSymbol: string) => {
    if (!searchSymbol) return;
    
    setLoading(true);
    try {
      // Call our API route that will search for options data
      const response = await fetch(`/api/options?symbol=${searchSymbol.toUpperCase()}`);
      const data = await response.json();
      
      if (data.success) {
        setOptions(data.puts || []);
        setUnderlyingPrice(data.underlyingPrice);
      } else {
        console.error('Failed to fetch options:', data.error);
        // Fallback to simulated data for demo
        generateSimulatedOptions(searchSymbol);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
      // Fallback to simulated data for demo
      generateSimulatedOptions(searchSymbol);
    }
    setLoading(false);
  };

  // Generate simulated options data for demo purposes
  const generateSimulatedOptions = (searchSymbol: string) => {
    const basePrice = getBasePrice(searchSymbol);
    setUnderlyingPrice(basePrice);
    
    const expirations = [
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month
    ];
    
    const simulatedOptions: PutOption[] = [];
    
    expirations.forEach(expiration => {
      for (let i = -10; i <= 5; i++) {
        const strike = Math.round((basePrice + (i * basePrice * 0.02)) * 100) / 100;
        const timeToExpiry = (new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const moneyness = strike / basePrice;
        
        // Simple pricing model for demo
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
    
    setOptions(simulatedOptions.sort((a, b) => a.strike - b.strike));
  };

  const getBasePrice = (sym: string): number => {
    const prices: { [key: string]: number } = {
      'SPY': 580,
      'QQQ': 525,
      'AAPL': 245,
      'MSFT': 450,
      'TSLA': 350,
      'NVDA': 900,
      'AMZN': 190,
      'GOOGL': 175
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Options Search
      </h2>
      
      {/* Symbol Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stock Symbol
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter symbol (e.g., SPY)"
          />
          <button
            onClick={() => searchOptions(symbol)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
        
        {/* Popular symbols */}
        <div className="mt-2 flex flex-wrap gap-2">
          {popularSymbols.map(sym => (
            <button
              key={sym}
              onClick={() => {
                setSymbol(sym);
                searchOptions(sym);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Underlying Price */}
      {underlyingPrice && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Price</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(underlyingPrice)}
          </div>
        </div>
      )}

      {/* Options Chain */}
      {options.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Strike
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bid
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  IV
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {options.slice(0, 20).map((option, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(option.strike)}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        getMoneyness(option.strike, option.underlyingPrice) === 'ITM' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : getMoneyness(option.strike, option.underlyingPrice) === 'ATM'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {getMoneyness(option.strike, option.underlyingPrice)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(option.expiration).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(option.bid)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatPercent(option.impliedVolatility)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onSelectOption(option)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Sell Put
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

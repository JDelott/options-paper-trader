"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { PutOption } from '../types';

interface OptionsSearchProps {
  onSelectOption: (option: PutOption) => void;
  onOptionsLoaded?: (options: PutOption[], symbol: string, underlyingPrice: number) => void;
  symbol?: string;
}

type SortOption = 'strike' | 'premium' | 'volume' | 'oi';

// Define the Greeks API response type
interface GreeksCalculation {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface GreeksOption {
  strike: number;
  expiration: string;
  daysToExpiry: number;
  call: GreeksCalculation;
  put: GreeksCalculation;
}

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

  // Add a refresh key to force React to re-render everything
  const [refreshKey, setRefreshKey] = useState(0);

  // Add unique ID to track multiple instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  
  const [hasRealData, setHasRealData] = useState(false);
  
  console.log(`🏷️ OptionsSearch Instance: ${instanceId.current} - Rendering with ${options.length} options`);

  const fetchFallbackOptions = useCallback(async (searchSymbol: string) => {
    console.log(`🚫 FALLBACK DISABLED for ${searchSymbol} - preventing data contamination`);
    return;
  }, []);

  const searchOptions = useCallback(async (searchSymbol: string) => {
    if (!searchSymbol) return;
    
    // Prevent multiple simultaneous calls
    if (loading) {
      console.log(`🚫 Already loading ${searchSymbol}, skipping duplicate call`);
      return;
    }
    
    setLoading(true);
    
    // Clear ALL state immediately and aggressively
    setOptions([]);
    setUnderlyingPrice(0);
    setSelectedExpiration('all');
    setHasRealData(false);
    
    try {
      console.log(`🔍 Instance ${instanceId.current} - Fetching real-time data for ${searchSymbol}...`);
      
      const timestamp = Date.now();
      const response = await fetch(`/api/tradier?symbol=${searchSymbol.toUpperCase()}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      console.log(`✅ Instance ${instanceId.current} - Got real Tradier data: ${data.puts?.length} puts, price: $${data.underlyingPrice}`);
      
      // Verify data quality before using it
      const rawPuts = data.puts || [];
      const validPuts = rawPuts.filter((put: PutOption) => 
        put.strike > 0 && 
        put.expiration && 
        put.symbol && 
        put.strike >= 50 // Filter out fake low strikes
      );
      
      if (validPuts.length === 0) {
        throw new Error('No valid options data received');
      }
      
      console.log(`🧹 Instance ${instanceId.current} - Filtered ${rawPuts.length} -> ${validPuts.length} valid puts`);
      
      // Add basic Greeks
      const putsWithBasicGreeks = validPuts.map((put: PutOption, index: number) => ({
        ...put,
        delta: put.delta || -0.5,
        gamma: put.gamma || 0.01,
        theta: put.theta || -0.02,
        impliedVolatility: put.impliedVolatility || 0.25,
        _renderKey: `${instanceId.current}_${timestamp}_${index}` // Unique key per instance
      }));
      
      console.log(`🎯 Instance ${instanceId.current} - Setting ${putsWithBasicGreeks.length} valid options`);
      
      // ONLY set state if we have valid data
      setOptions(putsWithBasicGreeks);
      setUnderlyingPrice(data.underlyingPrice || 0);
      setRefreshKey(timestamp);
      setHasRealData(true);
      
      if (onOptionsLoadedRef.current) {
        onOptionsLoadedRef.current(putsWithBasicGreeks, searchSymbol.toUpperCase(), data.underlyingPrice || 0);
      }
      
      console.log(`✅ Instance ${instanceId.current} - State updated with ${putsWithBasicGreeks.length} options`);
      
    } catch (error) {
      console.error(`❌ Instance ${instanceId.current} - Error fetching real-time options:`, error);
      
      // COMPLETELY DISABLE FALLBACK for now to prevent contamination
      console.log(`🚫 Instance ${instanceId.current} - Fallback disabled to prevent data contamination`);
      
      // Just show error state instead
      setOptions([]);
      setUnderlyingPrice(0);
    }
    
    setLoading(false);
  }, [loading]); // Remove fetchFallbackOptions dependency

  useEffect(() => {
    if (symbol !== currentSymbol) {
      setCurrentSymbol(symbol);
      searchOptions(symbol);
    }
  }, [symbol, currentSymbol, searchOptions]);

  useEffect(() => {
    if (options.length === 0) {
      searchOptions(symbol);
    }
  }, [options.length, searchOptions, symbol]);

  // DEBUGGING: Log the actual options state
  console.log(`🔍 DEBUG: Current options state:`, {
    optionsLength: options.length,
    firstOption: options[0],
    sampleStrikes: options.slice(0, 5).map(o => o.strike),
    sampleExpirations: [...new Set(options.slice(0, 10).map(o => o.expiration))],
    underlyingPrice
  });

  // DEBUG: Check what's actually in the options array
  console.log(`🔍 DETAILED OPTIONS ANALYSIS:`, {
    totalOptions: options.length,
    first10Strikes: options.slice(0, 10).map(o => o.strike),
    uniqueStrikes: [...new Set(options.map(o => o.strike))].sort((a, b) => a - b),
    strikeRange: {
      min: Math.min(...options.map(o => o.strike)),
      max: Math.max(...options.map(o => o.strike))
    },
    expirations: [...new Set(options.map(o => o.expiration))]
  });

  // ADD THIS: Show exact values
  console.log(`🎯 EXACT VALUES:`, {
    first10Strikes: options.slice(0, 10).map(o => o.strike),
    allUniqueStrikes: [...new Set(options.map(o => o.strike))].sort((a, b) => a - b),
    allExpirations: [...new Set(options.map(o => o.expiration))].sort()
  });

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

  // DEBUGGING: Log filtered results
  console.log(`🔍 DEBUG: Filtered options:`, {
    filteredLength: filteredOptions.length,
    firstFiltered: filteredOptions[0],
    selectedExpiration,
    filterOTM
  });

  // Get unique expirations for filter
  const expirations = [...new Set(options.map(o => o.expiration))].sort();

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const formatGreek = (value: number) => value.toFixed(3);

  const calculateDaysToExpiry = (expiration: string) => {
    const expiryDate = new Date(expiration);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getMoneyness = (strike: number, underlyingPrice: number) => {
    if (strike < underlyingPrice * 0.95) return 'ITM';
    if (strike > underlyingPrice * 1.05) return 'OTM';
    return 'ATM';
  };

  console.log(`🖥️ Rendering with ${options.length} options. Sample option:`, options[0]);

  // Add this debugging right before the table render:
  console.log(`🎯 Instance ${instanceId.current} - About to render table with:`, {
    filteredOptionsLength: filteredOptions.length,
    firstStrike: filteredOptions[0]?.strike,
    firstExpiration: filteredOptions[0]?.expiration,
    tableKey: refreshKey
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Fetching real-time options data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {currentSymbol.toUpperCase()} Put Options (Instance: {instanceId.current})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current Price: <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(underlyingPrice)}
              </span>
              {options.length > 0 && (
                <span className="ml-4">
                  {filteredOptions.length} contracts ({options.length} total)
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedExpiration}
            onChange={(e) => setSelectedExpiration(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Expirations</option>
            {expirations.slice(0, 10).map(exp => (
              <option key={exp} value={exp}>
                {formatDate(exp)} ({calculateDaysToExpiry(exp)}d)
              </option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="strike">Sort by Strike</option>
            <option value="premium">Sort by Premium</option>
            <option value="volume">Sort by Volume</option>
            <option value="oi">Sort by Open Interest</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={filterOTM}
              onChange={(e) => setFilterOTM(e.target.checked)}
              className="rounded"
            />
            Hide Deep OTM
          </label>
          
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              setOptions([]);
              setRefreshKey(prev => prev + 1); // Also increment refresh key
              searchOptions(currentSymbol);
            }}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
          >
            Refresh Data
          </button>
          
          <button
            onClick={() => {
              console.log('🗑️ Clearing all caches...');
              // Clear all browser caches
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              // Clear local storage options-related data
              Object.keys(localStorage).forEach(key => {
                if (key.includes('option') || key.includes('quote')) {
                  localStorage.removeItem(key);
                }
              });
              // Force reload
              window.location.reload();
            }}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>

      {/* TEMP: Replace the entire table with debug output */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        <div className="text-sm font-mono">
          <div>Instance: {instanceId.current}</div>
          <div>Options in state: {options.length}</div>
          <div>Filtered options: {filteredOptions.length}</div>
          <div>Refresh key: {refreshKey}</div>
        </div>
        
        {filteredOptions.slice(0, 10).map((option, index) => (
          <div 
            key={`debug-${refreshKey}-${index}`}
            className="p-2 border border-gray-300 text-sm"
          >
            <div>Strike: ${option.strike}</div>
            <div>Exp: {option.expiration}</div>
            <div>Bid: ${option.bid} | Ask: ${option.ask}</div>
            <div>Delta: {option.delta?.toFixed(3)} | Theta: {option.theta?.toFixed(3)}</div>
            <div>Symbol: {option.symbol}</div>
          </div>
        ))}
      </div>
      
      {filteredOptions.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No options found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

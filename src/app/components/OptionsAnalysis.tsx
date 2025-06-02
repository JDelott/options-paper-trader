"use client";

import { useState, useMemo } from 'react';
import { PutOption, OptionsAnalysisResult, AnalysisFilters } from '../types';

interface OptionsAnalysisProps {
  options: PutOption[];
  underlyingPrice: number;
  symbol: string;
  onSelectOption?: (result: OptionsAnalysisResult) => void;
}

export function OptionsAnalysis({ 
  options, 
  underlyingPrice, 
  symbol, 
  onSelectOption
}: OptionsAnalysisProps) {
  const [filters, setFilters] = useState<AnalysisFilters>({
    minAnnualizedReturn: 0.20, // 20% minimum
    deltaRange: {
      min: -0.5,
      max: -0.3
    },
    enableDeltaFilter: true,
    minDaysToExpiration: 7,
    maxDaysToExpiration: 60,
    minPremium: 0.10,
    maxPremium: 10.00
  });

  const [sortBy, setSortBy] = useState<'annualizedReturn' | 'premium' | 'daysToExpiration' | 'delta'>('annualizedReturn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  // Calculate analysis results
  const analysisResults = useMemo(() => {
    const results: OptionsAnalysisResult[] = [];

    options.forEach(option => {
      // Calculate days to expiration
      const expirationDate = new Date(option.expiration);
      const today = new Date();
      const diffTime = expirationDate.getTime() - today.getTime();
      const daysToExpiration = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Calculate premium (mid-price)
      const premium = (option.bid + option.ask) / 2;
      
      // Skip if premium is too low to calculate meaningful returns
      if (premium <= 0.01 || option.strike <= premium) return;

      // Calculate annualized return using your formula
      const annualizedReturn = (premium / (option.strike - premium)) * (365 / daysToExpiration);

      // Calculate breakeven
      const breakeven = option.strike - premium;

      // Check if it meets the good trade criteria
      const isGoodTrade = annualizedReturn >= filters.minAnnualizedReturn;

      // Check delta filter
      const meetsDeltalFilter = !filters.enableDeltaFilter || 
        (option.delta >= filters.deltaRange.min && option.delta <= filters.deltaRange.max);

      results.push({
        option,
        annualizedReturn,
        daysToExpiration,
        premium,
        breakeven,
        isGoodTrade,
        meetsDeltalFilter
      });
    });

    return results;
  }, [options, filters]);

  // Filter results
  const filteredResults = useMemo(() => {
    return analysisResults.filter(result => {
      // Basic filters
      if (result.daysToExpiration < filters.minDaysToExpiration || 
          result.daysToExpiration > filters.maxDaysToExpiration) return false;
      
      if (result.premium < filters.minPremium || result.premium > filters.maxPremium) return false;
      
      // Annualized return filter
      if (result.annualizedReturn < filters.minAnnualizedReturn) return false;
      
      // Delta filter (if enabled)
      if (filters.enableDeltaFilter && !result.meetsDeltalFilter) return false;
      
      return true;
    });
  }, [analysisResults, filters]);

  // Sort results
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'annualizedReturn':
          comparison = a.annualizedReturn - b.annualizedReturn;
          break;
        case 'premium':
          comparison = a.premium - b.premium;
          break;
        case 'daysToExpiration':
          comparison = a.daysToExpiration - b.daysToExpiration;
          break;
        case 'delta':
          comparison = a.option.delta - b.option.delta;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [filteredResults, sortBy, sortOrder]);

  // Helper functions
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'desc' ? '↓' : '↑';
  };

  const handleOptionSelect = (result: OptionsAnalysisResult) => {
    const key = `${result.option.strike}-${result.option.expiration}`;
    const newSelected = new Set(selectedResults);
    
    if (selectedResults.has(key)) {
      newSelected.delete(key);
    } else if (selectedResults.size < 3) {
      newSelected.add(key);
      onSelectOption?.(result);
    }
    
    setSelectedResults(newSelected);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {symbol.toUpperCase()} Options Analysis
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Underlying: <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(underlyingPrice)}
          </span>
          <span className="ml-4">
            Showing {sortedResults.length} of {analysisResults.length} analyzed options
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Minimum Annualized Return */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min Annualized Return
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="2"
              value={filters.minAnnualizedReturn}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                minAnnualizedReturn: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatPercent(filters.minAnnualizedReturn)}
            </p>
          </div>

          {/* Delta Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <input
                type="checkbox"
                checked={filters.enableDeltaFilter}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  enableDeltaFilter: e.target.checked
                }))}
                className="mr-2"
              />
              Delta Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="-1"
                max="0"
                value={filters.deltaRange.min}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  deltaRange: { ...prev.deltaRange, min: parseFloat(e.target.value) || -1 }
                }))}
                disabled={!filters.enableDeltaFilter}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                placeholder="Min"
              />
              <input
                type="number"
                step="0.01"
                min="-1"
                max="0"
                value={filters.deltaRange.max}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  deltaRange: { ...prev.deltaRange, max: parseFloat(e.target.value) || 0 }
                }))}
                disabled={!filters.enableDeltaFilter}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Days to Expiration */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Days to Expiration
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={filters.minDaysToExpiration}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  minDaysToExpiration: parseInt(e.target.value) || 1
                }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                min="1"
                max="365"
                value={filters.maxDaysToExpiration}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  maxDaysToExpiration: parseInt(e.target.value) || 365
                }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Premium Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Premium Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={filters.minPremium}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  minPremium: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={filters.maxPremium}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  maxPremium: parseFloat(e.target.value) || 100
                }))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Select
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('annualizedReturn')}
              >
                Annualized Return {getSortIcon('annualizedReturn')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Strike
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('premium')}
              >
                Premium {getSortIcon('premium')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('daysToExpiration')}
              >
                Days to Exp {getSortIcon('daysToExpiration')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('delta')}
              >
                Delta {getSortIcon('delta')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                IV
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Theta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Breakeven
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedResults.slice(0, 50).map((result, index) => {
              const key = `${result.option.strike}-${result.option.expiration}`;
              const isSelected = selectedResults.has(key);
              
              return (
                <tr 
                  key={`${result.option.symbol}-${index}`}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleOptionSelect(result)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>

                  {/* Annualized Return */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`text-sm font-bold ${
                      result.annualizedReturn >= 0.30 ? 'text-green-600 dark:text-green-400' :
                      result.annualizedReturn >= 0.20 ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {formatPercent(result.annualizedReturn)}
                    </div>
                    {result.isGoodTrade && (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded mt-1">
                        Good Trade
                      </span>
                    )}
                  </td>

                  {/* Strike */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(result.option.strike)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(result.option.expiration)}
                    </div>
                  </td>

                  {/* Premium */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(result.premium)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(result.option.bid)} / {formatCurrency(result.option.ask)}
                    </div>
                  </td>

                  {/* Days to Expiration */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {result.daysToExpiration}d
                    </div>
                  </td>

                  {/* Delta */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`text-sm ${
                      result.meetsDeltalFilter ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {result.option.delta.toFixed(3)}
                    </div>
                  </td>

                  {/* IV */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatPercent(result.option.impliedVolatility)}
                    </div>
                  </td>

                  {/* Theta */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {result.option.theta.toFixed(3)}
                    </div>
                  </td>

                  {/* Breakeven */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(result.breakeven)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {((result.breakeven / underlyingPrice - 1) * 100).toFixed(1)}% down
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {result.isGoodTrade && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                          ✓ Return
                        </span>
                      )}
                      {result.meetsDeltalFilter && (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          ✓ Delta
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedResults.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No options meet the current filter criteria.
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Total Analyzed</div>
            <div className="font-semibold text-gray-900 dark:text-white">{analysisResults.length}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Good Trades</div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {sortedResults.filter(r => r.isGoodTrade).length}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Selected</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedResults.size}/3
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Best Return</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {sortedResults.length > 0 ? 
                formatPercent(Math.max(...sortedResults.map(r => r.annualizedReturn))) : 
                'N/A'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

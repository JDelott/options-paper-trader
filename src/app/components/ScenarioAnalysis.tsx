"use client";

import { useState } from 'react';
import { PutOption } from '../types';

interface ScenarioAnalysisProps {
  options: PutOption[];
  symbol: string;
  currentPrice: number;
}

interface ScenarioResult {
  strike: number;
  premium: number;
  safetyBuffer: number;
  annualizedReturn: number;
  wouldBeAssigned: boolean;
  expiration: string;
  daysToExpiry: number;
}

export function ScenarioAnalysis({ options, symbol, currentPrice }: ScenarioAnalysisProps) {
  const [crashPercent, setCrashPercent] = useState(30);
  const [targetReturn, setTargetReturn] = useState(20);
  const [results, setResults] = useState<ScenarioResult[]>([]);

  const analyzeScenario = () => {
    const crashPrice = currentPrice * (1 - crashPercent / 100);
    
    const scenarioResults: ScenarioResult[] = options
      .filter(option => option.strike < crashPrice) // Only strikes below crash price
      .map(option => {
        const daysToExpiry = Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const premium = option.bid;
        const safetyBuffer = ((crashPrice - option.strike) / option.strike) * 100;
        const annualizedReturn = (premium / option.strike) * (365 / daysToExpiry) * 100;
        
        return {
          strike: option.strike,
          premium,
          safetyBuffer,
          annualizedReturn,
          wouldBeAssigned: option.strike > crashPrice,
          expiration: option.expiration,
          daysToExpiry
        };
      })
      .filter(result => result.annualizedReturn >= targetReturn) // Only results meeting return target
      .sort((a, b) => b.annualizedReturn - a.annualizedReturn) // Sort by return
      .slice(0, 10); // Top 10 results

    setResults(scenarioResults);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Crash Scenario Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Find safe strikes that survive market crashes</p>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market Crash Scenario
            </label>
            <div className="relative">
              <input
                type="number"
                value={crashPercent}
                onChange={(e) => setCrashPercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="70"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {symbol} drops to {formatCurrency(currentPrice * (1 - crashPercent / 100))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Annual Return
            </label>
            <div className="relative">
              <input
                type="number"
                value={targetReturn}
                onChange={(e) => setTargetReturn(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="100"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={analyzeScenario}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
            >
              Analyze Scenario
            </button>
          </div>
        </div>

        {/* Current Market Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Current Price</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(currentPrice)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Crash Price</div>
              <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(currentPrice * (1 - crashPercent / 100))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">Safe Zone</div>
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                Below {formatCurrency(currentPrice * (1 - crashPercent / 100))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                Safe Strike Options ({results.length} found)
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                All strikes survive {crashPercent}% crash
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Strike
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Premium
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Annual Return
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Safety Buffer
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(result.strike)}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(result.premium)}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatPercent(result.annualizedReturn)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatPercent(result.safetyBuffer)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {result.daysToExpiry}d
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {result.annualizedReturn >= targetReturn * 1.5 && (
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 rounded">
                              Excellent
                            </span>
                          )}
                          {result.annualizedReturn >= targetReturn && result.annualizedReturn < targetReturn * 1.5 && (
                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 rounded">
                              Good
                            </span>
                          )}
                          {result.safetyBuffer > 20 && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded">
                              Very Safe
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Click &quot;Analyze Scenario&quot; to find safe put options that survive market crashes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

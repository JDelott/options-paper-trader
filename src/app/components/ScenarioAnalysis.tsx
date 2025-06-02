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
  maxLoss: number;
  returnOnRisk: number;
  volume: number;
  openInterest: number;
}

export function ScenarioAnalysis({ options, symbol, currentPrice }: ScenarioAnalysisProps) {
  const [crashPercent, setCrashPercent] = useState(30);
  const [targetReturn, setTargetReturn] = useState(20);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [timeframe, setTimeframe] = useState<'1m' | '3m' | '6m'>('3m');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const analyzeScenario = async () => {
    setLoading(true);
    const crashPrice = currentPrice * (1 - crashPercent / 100);
    
    const scenarioResults: ScenarioResult[] = options
      .filter(option => {
        const daysToExpiry = Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const monthsToExpiry = daysToExpiry / 30;
        return option.strike < crashPrice && 
               monthsToExpiry <= parseInt(timeframe.replace('m', ''));
      })
      .map(option => {
        const daysToExpiry = Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const premium = option.bid;
        const safetyBuffer = ((crashPrice - option.strike) / option.strike) * 100;
        const annualizedReturn = (premium / option.strike) * (365 / daysToExpiry) * 100;
        const maxLoss = option.strike * 100 - premium * 100;
        const returnOnRisk = (premium * 100 / maxLoss) * 100;
        
        return {
          strike: option.strike,
          premium,
          safetyBuffer,
          annualizedReturn,
          wouldBeAssigned: option.strike > crashPrice,
          expiration: option.expiration,
          daysToExpiry,
          maxLoss,
          returnOnRisk,
          volume: option.volume,
          openInterest: option.openInterest
        };
      })
      .filter(result => 
        result.annualizedReturn >= targetReturn && 
        result.safetyBuffer > 5
      )
      .sort((a, b) => b.returnOnRisk - a.returnOnRisk);

    setResults(scenarioResults);

    try {
      // Get AI analysis
      const response = await fetch('/api/analyze-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          currentPrice,
          crashPrice,
          options: scenarioResults,
          crashPercent,
          timeframe
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
        setAiAnalysis('Analysis unavailable. Please try again.');
      }
    } catch (error) {
      console.error('Error during analysis:', error);
      setAiAnalysis('Failed to get AI analysis. Please try again.');
    }

    setLoading(false);
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

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">
              Educational Analysis - Paper Trading Only
            </span>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as '1m' | '3m' | '6m')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
            </select>
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

        {/* Results Section */}
        <div className="space-y-6">
          {/* AI Analysis Section */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Analyzing scenario...</span>
            </div>
          )}

          {aiAnalysis && !loading && (
            <div className="space-y-4">
              {/* Debug: Show raw analysis first (remove this after testing) */}
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs text-gray-600 dark:text-gray-400">
                <details>
                  <summary>Debug: Raw AI Response</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{aiAnalysis}</pre>
                </details>
              </div>

              {/* Parse and display structured sections */}
              {(() => {
                // Update regex patterns to match actual AI response
                const marketContext = aiAnalysis.match(/\*\*Market Context\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const strikeAnalysis = aiAnalysis.match(/\*\*Strike Analysis\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const riskFactors = aiAnalysis.match(/\*\*Risk Factors\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const strategyNotes = aiAnalysis.match(/\*\*Educational Strategy Notes\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();

                // If structured sections exist, show them in containers
                if (marketContext || strikeAnalysis || riskFactors || strategyNotes) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Market Context & Strike Analysis */}
                      <div className="space-y-4">
                        {marketContext && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                Market Context
                              </h3>
                            </div>
                            <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                              {marketContext}
                            </div>
                          </div>
                        )}

                        {strikeAnalysis && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                Strike Analysis
                              </h3>
                            </div>
                            <div className="text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                              {strikeAnalysis}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Risk Factors & Strategy Notes */}
                      <div className="space-y-4">
                        {riskFactors && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                                Risk Factors
                              </h3>
                            </div>
                            <div className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap">
                              {riskFactors}
                            </div>
                          </div>
                        )}

                        {strategyNotes && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Strategy Notes
                              </h3>
                            </div>
                            <div className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                              {strategyNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Fallback: Show unstructured analysis
                  return (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          AI Scenario Analysis
                        </h3>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {aiAnalysis}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Existing Results Table */}
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
                        Return/Risk
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Max Loss
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Safety Buffer
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Volume/OI
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
                          {formatPercent(result.returnOnRisk)}
                        </td>
                        <td className="px-3 py-3 text-sm text-amber-600 dark:text-amber-400">
                          {formatCurrency(result.maxLoss)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatPercent(result.safetyBuffer)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {result.volume}/{result.openInterest}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {result.daysToExpiry}d
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {result.returnOnRisk >= 10 && result.safetyBuffer >= 20 && (
                              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 rounded">
                                Excellent
                              </span>
                            )}
                            {result.returnOnRisk >= 5 && result.returnOnRisk < 10 && result.safetyBuffer >= 10 && (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 rounded">
                                Good
                              </span>
                            )}
                            {result.safetyBuffer >= 30 && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded">
                                Ultra Safe
                              </span>
                            )}
                            {result.volume > 100 && result.openInterest > 500 && (
                              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded">
                                Liquid
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
        </div>

        {results.length === 0 && !loading && (
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

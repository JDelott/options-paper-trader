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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ScenarioAnalysis({ options, symbol, currentPrice }: ScenarioAnalysisProps) {
  const [crashPercent, setCrashPercent] = useState(30);
  const [targetReturn, setTargetReturn] = useState(20);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [timeframe, setTimeframe] = useState<'1m' | '3m' | '6m'>('3m');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Chat state - only keep what we actually use
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Send chat message with full context
      const response = await fetch('/api/chat-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          context: {
            symbol,
            currentPrice,
            crashPercent,
            targetReturn,
            timeframe,
            crashPrice: currentPrice * (1 - crashPercent / 100),
            results,
            aiAnalysis,
            previousMessages: chatMessages
          }
        }),
      });

      const data = await response.json();
      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Chat failed:', data.error);
      }
    } catch (error) {
      console.error('Error during chat:', error);
    }

    setChatLoading(false);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Safe Put Strike Finder</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Find puts that won&apos;t be assigned even if the market crashes</p>
          </div>
        </div>

        {/* Main Value Proposition */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                The Core Question: &quot;If {symbol} drops {crashPercent}%, what put position would be least likely to be assigned while still giving me {targetReturn}% returns?&quot;
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                We&apos;ll find strike prices below the crash level ({formatCurrency(currentPrice * (1 - crashPercent / 100))}) so you keep the premium even in a major downturn.
              </p>
            </div>
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
              If {symbol} Crashes By
            </label>
            <div className="relative">
              <input
                type="number"
                value={crashPercent}
                onChange={(e) => setCrashPercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="70"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              = {formatCurrency(currentPrice * (1 - crashPercent / 100))} crash price
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Still Want This Return
            </label>
            <div className="relative">
              <input
                type="number"
                value={targetReturn}
                onChange={(e) => setTargetReturn(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="100"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Annualized target
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Within Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as '1m' | '3m' | '6m')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="1m">1 Month</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Max time to expiry
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action
            </label>
            <button
              onClick={analyzeScenario}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Find Safe Strikes
            </button>
            <div className="text-xs text-gray-500 mt-1">
              Analyze crash scenario
            </div>
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
              <div className="text-sm text-gray-500 uppercase tracking-wider">Crash Target</div>
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(currentPrice * (1 - crashPercent / 100))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">No Assignment Zone</div>
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                Strikes Below {formatCurrency(currentPrice * (1 - crashPercent / 100))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Analyzing scenario...</span>
            </div>
          )}

          {/* AI Analysis Section */}
          {aiAnalysis && !loading && (
            <div className="space-y-6">
              {/* Parse and display structured sections */}
              {(() => {
                // Update regex patterns to match actual AI response
                const marketContext = aiAnalysis.match(/\*\*Market Context\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const strikeAnalysis = aiAnalysis.match(/\*\*Strike Analysis\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const riskFactors = aiAnalysis.match(/\*\*Risk Factors\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();
                const strategyNotes = aiAnalysis.match(/\*\*Educational Strategy Notes\*\*([\s\S]*?)(?=\*\*|$)/)?.[1]?.trim();

                // If structured sections exist, show them with strike analysis as the main focus
                if (marketContext || strikeAnalysis || riskFactors || strategyNotes) {
                  return (
                    <div className="space-y-6">
                      {/* Main Strike Analysis - Full Width & Prominent */}
                      {strikeAnalysis && (
                        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/20 rounded-lg p-6 border-2 border-emerald-200 dark:border-emerald-700">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                📊 Strike Analysis Results
                              </h3>
                              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                AI analysis of your crash-safe strike options
                              </p>
                            </div>
                          </div>
                          <div className="text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">
                            {strikeAnalysis}
                          </div>
                        </div>
                      )}

                      {/* Secondary Information - Smaller Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {marketContext && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                Market Context
                              </h4>
                            </div>
                            <div className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">
                              {marketContext}
                            </div>
                          </div>
                        )}

                        {riskFactors && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                                Risk Factors
                              </h4>
                            </div>
                            <div className="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">
                              {riskFactors}
                            </div>
                          </div>
                        )}

                        {strategyNotes && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-3 h-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                Strategy Notes
                              </h4>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                              {strategyNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Fallback: Show unstructured analysis with emphasis on being the main result
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/20 rounded-lg p-6 border-2 border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            📊 AI Scenario Analysis Results
                          </h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Your crash-safe strike analysis
                          </p>
                        </div>
                      </div>
                      <div className="text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">
                        {aiAnalysis}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <div className="overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                  🛡️ Crash-Safe Put Options ({results.length} found)
                </h4>
                <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ All won&apos;t be assigned even if {symbol} drops {crashPercent}%
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

          {/* Debug info - remove this after testing */}
          

          {/* Persistent Chat Interface - Show when we have either analysis or results */}
          {(aiAnalysis || results.length > 0) && !loading && (
            <div className="border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 border-b border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      💬 Chat About Your {symbol} Analysis
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Ask questions about crash scenarios • {results.length} results found • Context-aware AI assistant
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="font-medium mb-2">👋 Ready to chat about your {symbol} analysis!</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border">
                        <strong>Try asking:</strong>
                        <div className="mt-1 space-y-1">
                          <div>• &quot;Which strike has the best risk/reward?&quot;</div>
                          <div>• &quot;What if the crash is only 20%?&quot;</div>
                          {results[0] && <div>• &quot;How safe is the ${results[0].strike} strike?&quot;</div>}
                          <div>• &quot;Should I consider shorter expirations?&quot;</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-1 opacity-70`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                    placeholder={`Ask about ${symbol} crash scenario analysis...`}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  💡 The AI knows about your {symbol} analysis: {results.length} results, {crashPercent}% crash scenario, {targetReturn}% target return
                </div>
              </div>
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-center">
                <div className="font-medium mb-2">Ready to find crash-resistant put strikes?</div>
                <div className="text-sm">
                  Click &quot;Find Safe Strikes&quot; to discover put options that stay profitable even if {symbol} drops {crashPercent}% to {formatCurrency(currentPrice * (1 - crashPercent / 100))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScenarioAnalysis;

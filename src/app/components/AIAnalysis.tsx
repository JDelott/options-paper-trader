"use client";

import { useState } from 'react';
import { PutOption } from '../types';

interface AIAnalysisProps {
  options: PutOption[];
  selectedOption?: PutOption | null;
  symbol: string;
  underlyingPrice: number;
  portfolio: {
    cash: number;
    activePositions: number;
    unrealizedPnL: number;
  };
}

export function AIAnalysis({ options, selectedOption, underlyingPrice, portfolio }: AIAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'portfolio'>('single');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const analyzeSingleOption = async () => {
    if (!selectedOption) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_option',
          data: {
            option: selectedOption,
            underlyingPrice,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        console.error('Analysis failed:', data.error);
        setAnalysis('Analysis unavailable. Please check your API configuration.');
      }
    } catch (err) {
      console.error('Error during analysis:', err);
      setAnalysis('Network error occurred during analysis.');
    }
    setLoading(false);
  };

  const analyzePortfolio = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_plays',
          data: {
            portfolio,
            availableOptions: options.slice(0, 10),
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        console.error('Portfolio analysis failed:', data.error);
        setAnalysis('Portfolio analysis unavailable. Please check your API configuration.');
      }
    } catch (err) {
      console.error('Error during portfolio analysis:', err);
      setAnalysis('Network error occurred during portfolio analysis.');
    }
    setLoading(false);
  };

  const clearAnalysis = () => {
    setAnalysis('');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Analysis</h3>
          {analysis && (
            <button
              onClick={clearAnalysis}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Tab Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'single'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Option Analysis
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'portfolio'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Portfolio Review
          </button>
        </div>
      </div>

      {/* Content Area with Scrolling */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Action Buttons */}
        <div className="p-4 flex-shrink-0">
          {activeTab === 'single' ? (
            <div className="space-y-3">
              {selectedOption ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Selected Option</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedOption.symbol} ${selectedOption.strike} Put
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Expires {new Date(selectedOption.expiration).toLocaleDateString()} • Premium: ${selectedOption.bid}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    Select an option from the chain to analyze
                  </div>
                </div>
              )}
              
              <button
                onClick={analyzeSingleOption}
                disabled={!selectedOption || loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze Option'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Cash</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${portfolio.cash.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Positions</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {portfolio.activePositions}
                  </div>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">P&L</div>
                  <div className={`text-sm font-semibold ${portfolio.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    ${portfolio.unrealizedPnL.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <button
                onClick={analyzePortfolio}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Analyzing...' : 'Review Portfolio'}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Analysis Results */}
        {analysis && (
          <div className="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-800">
            <div className="h-full overflow-y-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {analysis}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center border-t border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                AI is analyzing your {activeTab === 'single' ? 'option' : 'portfolio'}...
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analysis && !loading && (
          <div className="flex-1 flex items-center justify-center border-t border-gray-200 dark:border-gray-800">
            <div className="text-center px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                {activeTab === 'single' 
                  ? 'Get AI-powered insights on risk, reward, and market conditions for individual options'
                  : 'Get comprehensive portfolio analysis and strategy recommendations'
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

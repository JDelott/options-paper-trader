"use client";

import { useState } from 'react';
import { PutOption } from '../types';

interface AIAnalysisProps {
  options?: PutOption[];
  selectedOption?: PutOption | null;
  symbol?: string;
  underlyingPrice?: number;
  portfolio?: {
    cash: number;
    activePositions: number;
    unrealizedPnL: number;
  };
}

export function AIAnalysis({ options, selectedOption, symbol, underlyingPrice, portfolio }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'chain' | 'portfolio'>('single');

  const analyzeOption = async (option: PutOption) => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_option',
          data: { option, underlyingPrice }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setAnalysis('Error: Unable to analyze option. Please try again.');
      }
    } catch (error) {
      console.error('Failed to analyze option:', error);
      setAnalysis('Error: Failed to connect to AI analysis service.');
    }
    setLoading(false);
  };

  const analyzeChain = async () => {
    if (!options || !symbol || !underlyingPrice) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_chain',
          data: { options, symbol, underlyingPrice }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setAnalysis('Error: Unable to analyze options chain. Please try again.');
      }
    } catch (error) {
      console.error('Failed to analyze options chain:', error);
      setAnalysis('Error: Failed to connect to AI analysis service.');
    }
    setLoading(false);
  };

  const getPortfolioSuggestions = async () => {
    if (!portfolio) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_plays',
          data: { portfolio, availableOptions: options }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setAnalysis('Error: Unable to generate portfolio suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Failed to get portfolio suggestions:', error);
      setAnalysis('Error: Failed to connect to AI analysis service.');
    }
    setLoading(false);
  };

  const formatAnalysis = (text: string) => {
    // Simple formatting to make the AI response more readable
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h4 key={index} className="font-semibold text-gray-900 dark:text-white mt-3 mb-1">
              {line.replace(/\*\*/g, '')}
            </h4>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 text-gray-700 dark:text-gray-300">
              {line.substring(2)}
            </li>
          );
        }
        if (line.trim()) {
          return (
            <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">
              {line}
            </p>
          );
        }
        return <br key={index} />;
      });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Analysis
        </h2>
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Powered by Claude
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeTab === 'single'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Single Option
        </button>
        <button
          onClick={() => setActiveTab('chain')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeTab === 'chain'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Options Chain
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-3 py-1 text-sm rounded-md ${
            activeTab === 'portfolio'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Portfolio Strategy
        </button>
      </div>

      {/* Analysis Triggers */}
      <div className="mb-4">
        {activeTab === 'single' && selectedOption && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Selected Option:</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {selectedOption.symbol} ${selectedOption.strike} Put - {new Date(selectedOption.expiration).toLocaleDateString()}
              </div>
              <div className="text-sm text-green-600">
                Bid: ${selectedOption.bid} | IV: {(selectedOption.impliedVolatility * 100).toFixed(1)}%
              </div>
            </div>
            <button
              onClick={() => analyzeOption(selectedOption)}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze This Option'}
            </button>
          </div>
        )}

        {activeTab === 'chain' && options && symbol && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Options Chain:</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {symbol} - {options.length} available puts
              </div>
              <div className="text-sm text-blue-600">
                Current Price: ${underlyingPrice}
              </div>
            </div>
            <button
              onClick={analyzeChain}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Options Chain'}
            </button>
          </div>
        )}

        {activeTab === 'portfolio' && portfolio && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Portfolio Overview:</div>
              <div className="font-medium text-gray-900 dark:text-white">
                Cash: ${portfolio.cash.toLocaleString()} | Active: {portfolio.activePositions}
              </div>
              <div className="text-sm text-green-600">
                P&L: ${portfolio.unrealizedPnL.toLocaleString()}
              </div>
            </div>
            <button
              onClick={getPortfolioSuggestions}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Get Portfolio Suggestions'}
            </button>
          </div>
        )}

        {activeTab === 'single' && !selectedOption && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            Click &ldquo;Sell Put&rdquo; on any option to analyze it here
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="border-t pt-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {formatAnalysis(analysis)}
            </div>
          </div>
        </div>
      )}

      {/* Educational Note */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Educational Purpose:</strong> This AI analysis is for learning and paper trading only. 
              Real trading involves significant risk. Always do your own research and consider consulting with financial professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

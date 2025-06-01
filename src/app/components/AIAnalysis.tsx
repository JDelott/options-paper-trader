"use client";

import { useState } from 'react';
import { PutOption } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface PortfolioDetails {
  cash: number;
  activePositions: number;
  unrealizedPnL: number;
}

interface AnalysisContext {
  type: 'option' | 'portfolio';
  symbol?: string;
  optionDetails?: PutOption;
  portfolioDetails?: PortfolioDetails;
  originalAnalysis?: string;
}

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

export function AIAnalysis({ options, selectedOption, symbol, underlyingPrice, portfolio }: AIAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'portfolio'>('single');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);

  const analyzeSingleOption = async () => {
    if (!selectedOption) return;
    
    setLoading(true);
    // Clear previous chat when starting new analysis
    setChatMessages([]);
    setAnalysisContext({
      type: 'option',
      symbol,
      optionDetails: selectedOption,
    });

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
        setAnalysisContext((prev: AnalysisContext | null) => prev ? { ...prev, originalAnalysis: data.analysis } : null);
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
    // Clear previous chat when starting new analysis
    setChatMessages([]);
    setAnalysisContext({
      type: 'portfolio',
      portfolioDetails: portfolio,
    });

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
        setAnalysisContext((prev: AnalysisContext | null) => prev ? { ...prev, originalAnalysis: data.analysis } : null);
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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !analysisContext || chatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          context: analysisContext,
          newMessage: userMessage.content,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Chat failed:', data.error);
      }
    } catch (err) {
      console.error('Error during chat:', err);
    }
    setChatLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const clearAnalysis = () => {
    setAnalysis('');
    setChatMessages([]);
    setAnalysisContext(null);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Analysis</h3>
          {(analysis || chatMessages.length > 0) && (
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

      {/* Content Area */}
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

        {/* Analysis and Chat Area */}
        {(analysis || chatMessages.length > 0) && (
          <div className="flex-1 min-h-0 border-t border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial Analysis */}
              {analysis && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">AI Analysis</span>
                  </div>
                  <div className="text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed">
                    {analysis}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.role === 'user' 
                        ? 'text-gray-300 dark:text-gray-600' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Chat Loading */}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask follow-up questions about this analysis..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Press Enter to send • Shift+Enter for new line
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
        {!analysis && !loading && chatMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-t border-gray-200 dark:border-gray-800">
            <div className="text-center px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.452l-3.746 1.582L7.5 15.845A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                {activeTab === 'single' 
                  ? 'Get AI-powered insights and chat about individual options analysis'
                  : 'Get comprehensive portfolio analysis and interactive guidance'
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

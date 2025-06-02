"use client";

import { useState, useRef, useEffect } from 'react';
import { PutOption, Trade, OptionsAnalysisResult } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    step: number;
    symbol?: string;
    price?: number;
    selectedOption?: PutOption;
    selectedOptions?: OptionsAnalysisResult[];
    trades?: Trade[];
  };
}

interface GlobalChatProps {
  currentStep: number;
  currentSymbol: string;
  currentPrice: number;
  selectedOption?: PutOption | null;
  selectedOptions?: OptionsAnalysisResult[];
  trades?: Trade[];
  currentOptions?: PutOption[];
  portfolio?: {
    cash: number;
    totalValue: number;
    unrealizedPnL: number;
  };
}

export function GlobalChat({
  currentStep,
  currentSymbol,
  currentPrice,
  selectedOption,
  selectedOptions = [],
  trades = [],
  currentOptions = [],
  portfolio
}: GlobalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your options trading AI assistant. I can help you with:\n\n• Analyzing options strategies\n• Explaining risk/reward calculations\n• Reviewing your portfolio\n• Step-by-step guidance\n• Market insights\n\nWhat would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getContextualInfo = () => {
    let contextDescription = `Current Context:\n`;
    contextDescription += `• Step ${currentStep}: `;
    
    switch (currentStep) {
      case 1:
        contextDescription += `Symbol Selection\n`;
        break;
      case 2:
        contextDescription += `Browsing Options for ${currentSymbol} ($${currentPrice})\n`;
        contextDescription += `• ${currentOptions.length} options available\n`;
        if (selectedOptions.length > 0) {
          contextDescription += `• ${selectedOptions.length} options selected for comparison\n`;
        }
        break;
      case 3:
        if (selectedOptions.length > 1) {
          contextDescription += `Comparing ${selectedOptions.length} Options\n`;
          selectedOptions.forEach((opt, i) => {
            contextDescription += `  ${i + 1}. $${opt.option.strike} Put (${(opt.annualizedReturn * 100).toFixed(1)}% return)\n`;
          });
        } else if (selectedOption) {
          contextDescription += `Analyzing ${selectedOption.symbol} $${selectedOption.strike} Put\n`;
          contextDescription += `• Premium: $${selectedOption.bid}\n`;
          contextDescription += `• Expires: ${selectedOption.expiration}\n`;
        }
        break;
      case 4:
        contextDescription += `Portfolio Management\n`;
        contextDescription += `• ${trades.filter(t => t.status === 'active').length} active positions\n`;
        contextDescription += `• P&L: $${portfolio?.unrealizedPnL || 0}\n`;
        break;
    }

    return contextDescription;
  };

  const generateQuickQuestions = () => {
    const questions: string[] = [];

    switch (currentStep) {
      case 1:
        questions.push(
          "What makes a good stock for put selling?",
          "How do I choose between different symbols?",
          "What's the difference between ETFs and individual stocks?"
        );
        break;
      case 2:
        questions.push(
          `Analyze the best ${currentSymbol} put options`,
          "What delta range should I target?",
          "How do I filter for good opportunities?",
          "Explain the annualized return calculation"
        );
        break;
      case 3:
        if (selectedOptions.length > 1) {
          questions.push(
            "Which option should I choose and why?",
            "Compare the risk/reward of my selections",
            "Explain the probability of profit"
          );
        } else if (selectedOption) {
          questions.push(
            `Analyze this ${selectedOption.symbol} $${selectedOption.strike} put`,
            "What are the main risks?",
            "Calculate different scenarios"
          );
        }
        break;
      case 4:
        questions.push(
          "Review my portfolio performance",
          "What trades should I consider closing?",
          "How's my risk management?"
        );
        break;
    }

    return questions;
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Generate context information
    const contextInfo = getContextualInfo();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      context: {
        step: currentStep,
        symbol: currentSymbol,
        price: currentPrice,
        selectedOption: selectedOption || undefined,
        selectedOptions,
        trades: trades.slice(0, 5)
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: contextInfo, // Now using the context variable
          chatHistory: messages.slice(-5),
          step: currentStep,
          symbol: currentSymbol,
          price: currentPrice,
          selectedOption,
          selectedOptions,
          portfolio,
          chatType: 'global'
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
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = generateQuickQuestions();

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-lg transition-all transform hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-600 text-white rounded-t-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">AI Assistant</h3>
                <p className="text-sm opacity-90">Step {currentStep} • {currentSymbol}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 opacity-70`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {quickQuestions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</div>
              <div className="space-y-1">
                {quickQuestions.slice(0, 2).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    className="w-full text-left text-xs p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(inputValue)}
                placeholder="Ask about options, strategies, analysis..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

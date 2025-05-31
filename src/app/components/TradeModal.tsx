"use client";

import { useState } from 'react';
import { PutOption } from '../types';

interface TradeModalProps {
  option: PutOption;
  onConfirm: (option: PutOption, contracts: number) => void;
  onCancel: () => void;
}

export function TradeModal({ option, onConfirm, onCancel }: TradeModalProps) {
  const [contracts, setContracts] = useState(1);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const totalPremium = option.bid * contracts * 100;
  const maxRisk = (option.strike * contracts * 100) - totalPremium;
  const daysToExpiry = Math.ceil((new Date(option.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Sell Put Option
        </h3>
        
        {/* Option Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
            <span className="font-medium text-gray-900 dark:text-white">{option.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Strike:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(option.strike)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Expiration:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(option.expiration).toLocaleDateString()} ({daysToExpiry}d)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(option.underlyingPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Bid:</span>
            <span className="font-medium text-green-600">{formatCurrency(option.bid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Implied Volatility:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatPercent(option.impliedVolatility)}</span>
          </div>
        </div>

        {/* Contracts Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Contracts
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={contracts}
            onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Trade Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Premium Collected:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPremium)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Max Risk:</span>
              <span className="font-medium text-red-600">{formatCurrency(maxRisk)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Profit if Expires Worthless:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPremium)} (100%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Breakeven:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(option.strike - option.bid)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Risk:</strong> If {option.symbol} falls below {formatCurrency(option.strike)}, you may be assigned shares and face significant losses.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(option, contracts)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Sell {contracts} Put{contracts > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

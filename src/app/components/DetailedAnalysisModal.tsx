"use client";

import { useState } from 'react';
import { OptionsAnalysisResult } from '../types';

interface DetailedAnalysisModalProps {
  result: OptionsAnalysisResult;
  underlyingPrice: number;
  onClose: () => void;
  onProceedToOrder: (contracts: number) => void;
}

export function DetailedAnalysisModal({ 
  result, 
  underlyingPrice, 
  onClose, 
  onProceedToOrder 
}: DetailedAnalysisModalProps) {
  const [contracts, setContracts] = useState(1);
  
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ${result.option.strike} Put Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Expires {new Date(result.option.expiration).toLocaleDateString()} 
                • {result.daysToExpiration} days
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Metrics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Annualized Return:</span>
                  <span className="font-bold text-green-600">
                    {formatPercent(result.annualizedReturn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Premium:</span>
                  <span>{formatCurrency(result.premium)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Breakeven:</span>
                  <span>{formatCurrency(result.breakeven)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delta:</span>
                  <span>{result.option.delta.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Position Sizing</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Number of Contracts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={contracts}
                    onChange={(e) => setContracts(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Total Premium:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(result.premium * contracts * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capital Required:</span>
                    <span>{formatCurrency(result.option.strike * contracts * 100)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Risk Assessment</h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Assignment risk if stock falls below ${result.option.strike}</li>
              <li>• Requires {formatCurrency(result.option.strike * contracts * 100)} in buying power</li>
              <li>• {result.daysToExpiration} days of time decay exposure</li>
              <li>• Current downside buffer: {formatPercent(((underlyingPrice - result.option.strike) / underlyingPrice) * 100)}</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onProceedToOrder(contracts)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Create Paper Trade Order
          </button>
        </div>
      </div>
    </div>
  );
}

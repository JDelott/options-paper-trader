"use client";

import { OptionsAnalysisResult } from '../types';

interface OptionsComparisonProps {
  selectedOptions: OptionsAnalysisResult[];
  onRemoveOption: (index: number) => void;
  onProceedToTrade: (option: OptionsAnalysisResult) => void;
}

export function OptionsComparison({ selectedOptions, onRemoveOption, onProceedToTrade }: OptionsComparisonProps) {
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mt-4">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Compare Selected Options ({selectedOptions.length}/3)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click on options in the table above to add them here for comparison
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {selectedOptions.map((result, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  ${result.option.strike} Put
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Expires {new Date(result.option.expiration).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => onRemoveOption(index)}
                className="text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Annualized Return:</span>
                <span className="font-semibold text-green-600">
                  {formatPercent(result.annualizedReturn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Premium:</span>
                <span>{formatCurrency(result.premium)}</span>
              </div>
              <div className="flex justify-between">
                <span>Days to Exp:</span>
                <span>{result.daysToExpiration}d</span>
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
            
            <button
              onClick={() => onProceedToTrade(result)}
              className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Analyze & Trade
            </button>
          </div>
        ))}
        
        {selectedOptions.length === 0 && (
          <div className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
            Click on options in the table above to compare them here
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from 'react';
import { OptionsAnalysis } from './OptionsAnalysis';
import { AdvancedOptionsComparison } from './AdvancedOptionsComparison';
import { DetailedAnalysisModal } from './DetailedAnalysisModal';
import { PutOption, OptionsAnalysisResult } from '../types';

interface OptionsAnalysisWorkflowProps {
  options: PutOption[];
  underlyingPrice: number;
  symbol: string;
  onCreateTrade?: (option: PutOption, contracts: number) => void;
}

export function OptionsAnalysisWorkflow({
  options,
  underlyingPrice,
  symbol,
  onCreateTrade
}: OptionsAnalysisWorkflowProps) {
  const [selectedOptions, setSelectedOptions] = useState<OptionsAnalysisResult[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<OptionsAnalysisResult | null>(null);
  const [workflowStep, setWorkflowStep] = useState<'analysis' | 'comparison' | 'execution'>('analysis');

  const handleOptionSelect = useCallback((result: OptionsAnalysisResult) => {
    if (selectedOptions.length >= 3) {
      alert('You can compare up to 3 options at a time');
      return;
    }

    const exists = selectedOptions.find(opt => 
      opt.option.symbol === result.option.symbol && 
      opt.option.strike === result.option.strike &&
      opt.option.expiration === result.option.expiration
    );

    if (!exists) {
      setSelectedOptions(prev => [...prev, result]);
      if (selectedOptions.length === 0) {
        setWorkflowStep('comparison');
      }
    }
  }, [selectedOptions]);

  const handleRemoveOption = useCallback((index: number) => {
    setSelectedOptions(prev => prev.filter((_, i) => i !== index));
    if (selectedOptions.length === 1) {
      setWorkflowStep('analysis');
    }
  }, [selectedOptions.length]);

  const handleClearAll = useCallback(() => {
    setSelectedOptions([]);
    setWorkflowStep('analysis');
  }, []);

  const handleProceedToTrade = useCallback((result: OptionsAnalysisResult, contractsCount: number) => {
    setShowDetailModal(result);
    setWorkflowStep('execution');
    console.log('Proceeding to trade with', contractsCount, 'contracts');
  }, []);

  const handleCreateTrade = useCallback((contractsCount: number) => {
    if (showDetailModal && onCreateTrade) {
      onCreateTrade(showDetailModal.option, contractsCount);
      setShowDetailModal(null);
      setWorkflowStep('analysis');
    }
  }, [showDetailModal, onCreateTrade]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Options Analysis Workflow
          </h2>
          <div className="flex items-center space-x-4">
            {['analysis', 'comparison', 'execution'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  workflowStep === step
                    ? 'bg-emerald-600 text-white'
                    : index < ['analysis', 'comparison', 'execution'].indexOf(workflowStep)
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {step}
                </span>
                {index < 2 && (
                  <div className={`ml-4 w-8 h-0.5 ${
                    index < ['analysis', 'comparison', 'execution'].indexOf(workflowStep)
                      ? 'bg-emerald-200'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Options Analysis */}
      <OptionsAnalysis
        options={options}
        underlyingPrice={underlyingPrice}
        symbol={symbol}
        onSelectOption={handleOptionSelect}
      />

      {/* Step 2: Advanced Comparison */}
      {selectedOptions.length > 0 && (
        <AdvancedOptionsComparison
          selectedOptions={selectedOptions}
          underlyingPrice={underlyingPrice}
          symbol={symbol}
          onRemoveOption={handleRemoveOption}
          onProceedToTrade={handleProceedToTrade}
          onClearAll={handleClearAll}
        />
      )}

      {/* Step 3: Detailed Analysis Modal */}
      {showDetailModal && (
        <DetailedAnalysisModal
          result={showDetailModal}
          underlyingPrice={underlyingPrice}
          onClose={() => {
            setShowDetailModal(null);
            setWorkflowStep('comparison');
          }}
          onProceedToOrder={handleCreateTrade}
        />
      )}

      {/* Summary Stats */}
      {options.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {options.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Options</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {selectedOptions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Selected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedOptions.length > 0 
                  ? `${((selectedOptions.reduce((sum, opt) => sum + opt.annualizedReturn, 0) / selectedOptions.length) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Return</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(underlyingPrice)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Price</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

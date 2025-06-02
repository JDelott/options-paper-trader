"use client";

import { useState, useMemo } from 'react';
import { OptionsAnalysisResult } from '../types';

interface ComparisonMetrics {
  result: OptionsAnalysisResult;
  probabilityOfProfit: number;
  expectedReturn: number;
  riskAdjustedReturn: number;
  capitalEfficiency: number;
  timeDecay: number;
  volatilityRisk: number;
  liquidityScore: number;
  overallScore: number;
  rank: number;
}

interface AdvancedOptionsComparisonProps {
  selectedOptions: OptionsAnalysisResult[];
  underlyingPrice: number;
  symbol: string;
  onRemoveOption: (index: number) => void;
  onProceedToTrade: (option: OptionsAnalysisResult, contracts: number) => void;
  onClearAll: () => void;
}

type AnalysisView = 'summary' | 'detailed' | 'scenarios';

export function AdvancedOptionsComparison({ 
  selectedOptions, 
  underlyingPrice,
  symbol,
  onRemoveOption, 
  onProceedToTrade,
  onClearAll
}: AdvancedOptionsComparisonProps) {
  const [analysisView, setAnalysisView] = useState<AnalysisView>('summary');
  const [selectedContracts, setSelectedContracts] = useState<{[key: string]: number}>({});

  // Advanced calculations for each option
  const comparisonMetrics = useMemo<ComparisonMetrics[]>(() => {
    const metrics = selectedOptions.map((result) => {
      const { option, annualizedReturn, daysToExpiration, premium } = result;
      
      // Probability of Profit (simplified Black-Scholes approximation)
      const probabilityOfProfit = Math.abs(option.delta) * 100;

      // Expected Return (probability-weighted)
      const maxProfit = premium;
      const maxLoss = option.strike - premium;
      const expectedReturn = (probabilityOfProfit / 100) * maxProfit - 
                           ((100 - probabilityOfProfit) / 100) * maxLoss;

      // Risk-Adjusted Return (Sharpe-like ratio)
      const volatilityRisk = option.impliedVolatility;
      const riskAdjustedReturn = annualizedReturn / volatilityRisk;

      // Capital Efficiency
      const capitalRequired = option.strike;
      const capitalEfficiency = (premium / capitalRequired) * 100;

      // Time Decay Risk
      const timeDecay = Math.abs(option.theta) * daysToExpiration;

      // Liquidity Score (based on volume and open interest)
      const liquidityScore = Math.min(100, 
        (option.volume * 0.3 + option.openInterest * 0.7) / 100 * 100
      );

      // Overall Score (weighted composite)
      const overallScore = (
        annualizedReturn * 100 * 0.30 +        // 30% weight on return
        probabilityOfProfit * 0.25 +           // 25% weight on probability
        capitalEfficiency * 0.20 +             // 20% weight on capital efficiency
        liquidityScore * 0.15 +                // 15% weight on liquidity
        (1 / volatilityRisk) * 100 * 0.10      // 10% weight on low volatility
      );

      return {
        result,
        probabilityOfProfit,
        expectedReturn,
        riskAdjustedReturn,
        capitalEfficiency,
        timeDecay,
        volatilityRisk,
        liquidityScore,
        overallScore,
        rank: 0 // Will be calculated after sorting
      };
    });

    // Rank by overall score
    metrics.sort((a, b) => b.overallScore - a.overallScore);
    metrics.forEach((metric, index) => {
      metric.rank = index + 1;
    });

    return metrics;
  }, [selectedOptions, underlyingPrice]);

  // Scenario Analysis
  const scenarioAnalysis = useMemo(() => {
    const scenarios = [
      { name: 'Bear Case', priceChange: -0.15, probability: 0.15 },
      { name: 'Mild Bear', priceChange: -0.08, probability: 0.20 },
      { name: 'Sideways', priceChange: 0.00, probability: 0.30 },
      { name: 'Mild Bull', priceChange: 0.08, probability: 0.20 },
      { name: 'Bull Case', priceChange: 0.15, probability: 0.15 }
    ];

    return scenarios.map(scenario => {
      const finalPrice = underlyingPrice * (1 + scenario.priceChange);
      const results = comparisonMetrics.map(metric => {
        const { option, premium } = metric.result;
        let pnl: number;
        
        if (finalPrice >= option.strike) {
          // Option expires worthless - keep premium
          pnl = premium;
        } else {
          // Option assigned - calculate loss
          pnl = premium - (option.strike - finalPrice);
        }
        
        const roi = (pnl / option.strike) * 100;
        
        return {
          strike: option.strike,
          pnl,
          roi
        };
      });

      return {
        ...scenario,
        finalPrice,
        results
      };
    });
  }, [comparisonMetrics, underlyingPrice]);

  // Get best/worst performers for each metric
  const getBestWorst = (metricKey: keyof ComparisonMetrics) => {
    if (comparisonMetrics.length === 0) return { best: null, worst: null };
    
    const sorted = [...comparisonMetrics].sort((a, b) => {
      const aVal = typeof a[metricKey] === 'number' ? a[metricKey] as number : 0;
      const bVal = typeof b[metricKey] === 'number' ? b[metricKey] as number : 0;
      return bVal - aVal;
    });
    
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  };

  // Special function for annualized return since it's nested in result
  const getBestWorstAnnualizedReturn = () => {
    if (comparisonMetrics.length === 0) return { best: null, worst: null };
    
    const sorted = [...comparisonMetrics].sort((a, b) => {
      return b.result.annualizedReturn - a.result.annualizedReturn;
    });
    
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getContracts = (result: OptionsAnalysisResult) => {
    const key = `${result.option.strike}-${result.option.expiration}`;
    return selectedContracts[key] || 1;
  };

  const setContracts = (result: OptionsAnalysisResult, contracts: number) => {
    const key = `${result.option.strike}-${result.option.expiration}`;
    setSelectedContracts(prev => ({ ...prev, [key]: contracts }));
  };

  if (selectedOptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mt-4">
        <div className="p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Options Selected for Comparison
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Select up to 3 options from the analysis table above to compare them side-by-side
          </p>
          <div className="flex justify-center items-center gap-2 text-sm text-gray-500">
            <span>💡</span>
            <span>Tip: Look for options with high annualized returns and good delta ranges</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mt-4">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Options Comparison Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Comparing {selectedOptions.length} {symbol} put options • Underlying: {formatCurrency(underlyingPrice)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClearAll}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['summary', 'detailed', 'scenarios'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setAnalysisView(view)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                analysisView === view
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary View */}
      {analysisView === 'summary' && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {comparisonMetrics.map((metric, index) => (
              <div
                key={index}
                className={`border-2 rounded-xl p-6 transition-all ${
                  metric.rank === 1
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : metric.rank === 2
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header with Rank */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        ${metric.result.option.strike} Put
                      </h4>
                      {metric.rank === 1 && (
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-full">
                          #1 BEST
                        </span>
                      )}
                      {metric.rank === 2 && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          #2
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Expires {new Date(metric.result.option.expiration).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveOption(index)}
                    className="text-gray-400 hover:text-red-500 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPercent(metric.result.annualizedReturn * 100)}
                    </div>
                    <div className="text-xs text-gray-500">Annualized Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatPercent(metric.probabilityOfProfit)}
                    </div>
                    <div className="text-xs text-gray-500">Profit Probability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(metric.result.premium)}
                    </div>
                    <div className="text-xs text-gray-500">Premium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {metric.result.daysToExpiration}d
                    </div>
                    <div className="text-xs text-gray-500">Days to Exp</div>
                  </div>
                </div>

                {/* Advanced Metrics */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Capital Efficiency:</span>
                    <span className="font-medium">{formatPercent(metric.capitalEfficiency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Risk-Adj Return:</span>
                    <span className="font-medium">{metric.riskAdjustedReturn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Liquidity Score:</span>
                    <span className="font-medium">{metric.liquidityScore.toFixed(0)}/100</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Overall Score:</span>
                    <span className="font-bold text-emerald-600">
                      {metric.overallScore.toFixed(0)}/100
                    </span>
                  </div>
                </div>

                {/* Position Sizing */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contracts:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={getContracts(metric.result)}
                      onChange={(e) => setContracts(metric.result, parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center"
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Total Premium: <span className="font-semibold text-emerald-600">
                      {formatCurrency(metric.result.premium * getContracts(metric.result) * 100)}
                    </span>
                  </div>
                  <button
                    onClick={() => onProceedToTrade(metric.result, getContracts(metric.result))}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      metric.rank === 1
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {metric.rank === 1 ? '🚀 Trade Best Option' : '📊 Analyze & Trade'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Comparison Table */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Metric</th>
                    {comparisonMetrics.map((metric, index) => (
                      <th key={index} className="px-4 py-3 text-center">
                        ${metric.result.option.strike}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[
                    { 
                      key: 'annualizedReturn' as const, 
                      label: 'Annualized Return', 
                      format: (v: number) => formatPercent(v * 100),
                      getValue: (metric: ComparisonMetrics) => metric.result.annualizedReturn,
                      getBestWorst: getBestWorstAnnualizedReturn
                    },
                    { 
                      key: 'probabilityOfProfit' as const, 
                      label: 'Profit Probability', 
                      format: (v: number) => formatPercent(v),
                      getValue: (metric: ComparisonMetrics) => metric.probabilityOfProfit,
                      getBestWorst: () => getBestWorst('probabilityOfProfit')
                    },
                    { 
                      key: 'capitalEfficiency' as const, 
                      label: 'Capital Efficiency', 
                      format: (v: number) => formatPercent(v),
                      getValue: (metric: ComparisonMetrics) => metric.capitalEfficiency,
                      getBestWorst: () => getBestWorst('capitalEfficiency')
                    },
                    { 
                      key: 'liquidityScore' as const, 
                      label: 'Liquidity Score', 
                      format: (v: number) => `${v.toFixed(0)}/100`,
                      getValue: (metric: ComparisonMetrics) => metric.liquidityScore,
                      getBestWorst: () => getBestWorst('liquidityScore')
                    },
                    { 
                      key: 'overallScore' as const, 
                      label: 'Overall Score', 
                      format: (v: number) => `${v.toFixed(0)}/100`,
                      getValue: (metric: ComparisonMetrics) => metric.overallScore,
                      getBestWorst: () => getBestWorst('overallScore')
                    }
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {row.label}
                      </td>
                      {comparisonMetrics.map((metric, index) => {
                        const value = row.getValue(metric);
                        const { best, worst } = row.getBestWorst();
                        const isBest = best && metric === best;
                        const isWorst = worst && metric === worst && comparisonMetrics.length > 1;
                        
                        return (
                          <td 
                            key={index} 
                            className={`px-4 py-3 text-center font-medium ${
                              isBest ? 'text-emerald-600 dark:text-emerald-400' :
                              isWorst ? 'text-red-600 dark:text-red-400' :
                              'text-gray-900 dark:text-white'
                            }`}
                          >
                            {row.format(value)}
                            {isBest && ' 🥇'}
                            {isWorst && ' 🔻'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {analysisView === 'detailed' && (
        <div className="p-6">
          <div className="space-y-8">
            {comparisonMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      ${metric.result.option.strike} Put - Rank #{metric.rank}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Expires {new Date(metric.result.option.expiration).toLocaleDateString()} 
                      • {metric.result.daysToExpiration} days
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      {metric.overallScore.toFixed(0)}/100
                    </div>
                    <div className="text-sm text-gray-500">Overall Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Returns Analysis */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                      Returns Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Annualized Return:</span>
                        <span className="font-bold text-emerald-600">
                          {formatPercent(metric.result.annualizedReturn * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Return:</span>
                        <span>{formatCurrency(metric.expectedReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk-Adjusted:</span>
                        <span>{metric.riskAdjustedReturn.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capital Efficiency:</span>
                        <span>{formatPercent(metric.capitalEfficiency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-red-800 dark:text-red-200 mb-3">
                      Risk Analysis
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Loss:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(metric.result.option.strike - metric.result.premium)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Breakeven:</span>
                        <span>{formatCurrency(metric.result.breakeven)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buffer:</span>
                        <span>
                          {formatPercent(((underlyingPrice - metric.result.option.strike) / underlyingPrice) * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volatility Risk:</span>
                        <span>{formatPercent(metric.volatilityRisk * 100)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Greeks & Time */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                      Greeks & Time
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Delta:</span>
                        <span>{metric.result.option.delta.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Theta:</span>
                        <span>{metric.result.option.theta.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Decay:</span>
                        <span>{formatCurrency(metric.timeDecay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IV:</span>
                        <span>{formatPercent(metric.result.option.impliedVolatility * 100)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Market & Liquidity */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">
                      Market & Liquidity
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Volume:</span>
                        <span>{metric.result.option.volume.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Open Interest:</span>
                        <span>{metric.result.option.openInterest.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bid-Ask Spread:</span>
                        <span>
                          {formatCurrency(metric.result.option.ask - metric.result.option.bid)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Liquidity Score:</span>
                        <span>{metric.liquidityScore.toFixed(0)}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenarios View */}
      {analysisView === 'scenarios' && (
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Scenario Analysis - Price Movement Impact
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">Scenario</th>
                  <th className="px-4 py-3 text-center">Final Price</th>
                  <th className="px-4 py-3 text-center">Probability</th>
                  {comparisonMetrics.map((metric, index) => (
                    <th key={index} className="px-4 py-3 text-center">
                      ${metric.result.option.strike} Put
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scenarioAnalysis.map((scenario, scenarioIndex) => (
                  <tr key={scenarioIndex}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          scenario.priceChange < -0.1 ? 'bg-red-500' :
                          scenario.priceChange < 0 ? 'bg-yellow-500' :
                          scenario.priceChange === 0 ? 'bg-gray-500' :
                          scenario.priceChange < 0.1 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}></span>
                        {scenario.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatCurrency(scenario.finalPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatPercent(scenario.probability * 100)}
                    </td>
                    {scenario.results.map((result, resultIndex) => (
                      <td key={resultIndex} className="px-4 py-3 text-center">
                        <div className={`font-medium ${
                          result.pnl > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(result.pnl)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatPercent(result.roi)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expected Value Calculation */}
          <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Expected Values (Probability-Weighted)
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisonMetrics.map((metric, index) => {
                const expectedValue = scenarioAnalysis.reduce((sum, scenario) => {
                  const result = scenario.results[index];
                  return sum + (result.pnl * scenario.probability);
                }, 0);

                const expectedROI = scenarioAnalysis.reduce((sum, scenario) => {
                  const result = scenario.results[index];
                  return sum + (result.roi * scenario.probability);
                }, 0);

                return (
                  <div key={index} className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${metric.result.option.strike} Put
                    </div>
                    <div className={`text-2xl font-bold ${
                      expectedValue > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(expectedValue)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Expected P&L ({formatPercent(expectedROI)} ROI)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

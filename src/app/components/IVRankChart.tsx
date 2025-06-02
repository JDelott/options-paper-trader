import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface IVRankProps {
  options: PutOption[];
  symbol: string;
}

export function IVRankChart({ options, symbol }: IVRankProps) {
  const [ivRank, setIVRank] = useState(0);
  const [ivPercentile, setIVPercentile] = useState(0);
  
  useEffect(() => {
    // Calculate current IV (average across ATM options)
    const currentIV = options
      .filter(opt => Math.abs(opt.strike - opt.underlyingPrice) / opt.underlyingPrice < 0.05)
      .reduce((sum, opt) => sum + opt.impliedVolatility, 0) / options.length;
    
    // In real implementation, you'd fetch historical IV data
    // For demo, we'll simulate historical data
    const historicalIV = Array.from({ length: 252 }, () => 
      Math.random() * 0.5 + 0.1 // Random IV between 10% and 60%
    );
    
    const ivRank = ((currentIV - Math.min(...historicalIV)) / 
      (Math.max(...historicalIV) - Math.min(...historicalIV))) * 100;
    
    const ivPercentile = (historicalIV.filter(iv => iv < currentIV).length / 
      historicalIV.length) * 100;
    
    setIVRank(Math.round(ivRank));
    setIVPercentile(Math.round(ivPercentile));
  }, [options]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          IV Analysis for {symbol}
        </h2>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">IV Rank</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {ivRank}%
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">IV Percentile</div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {ivPercentile}%
            </div>
          </div>
        </div>
        
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div 
            className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${ivRank}%` }}
          />
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {ivRank < 25 ? (
            "IV is relatively low - good time to buy options"
          ) : ivRank > 75 ? (
            "IV is relatively high - good time to sell options"
          ) : (
            "IV is in the middle range"
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface RiskProfilerProps {
  selectedOptions: PutOption[];
  underlyingPrice: number;
}

interface ProfitPoint {
  price: number;
  profit: number;
}

export function RiskProfiler({ selectedOptions, underlyingPrice }: RiskProfilerProps) {
  const [profitCurve, setProfitCurve] = useState<ProfitPoint[]>([]);
  
  useEffect(() => {
    // Generate profit/loss curve points
    const points: ProfitPoint[] = [];
    const priceRange = underlyingPrice * 0.5; // Calculate 50% up/down
    
    for (let i = -50; i <= 50; i++) {
      const price = underlyingPrice + (priceRange * i / 50);
      let totalProfit = 0;
      
      selectedOptions.forEach(option => {
        const premium = option.bid;
        // For puts: max loss = strike - premium, max profit = premium
        if (price < option.strike) {
          totalProfit += (option.strike - price) - (premium * 100);
        } else {
          totalProfit += premium * 100;
        }
      });
      
      points.push({ price, profit: totalProfit });
    }
    
    setProfitCurve(points);
  }, [selectedOptions, underlyingPrice]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Strategy Risk Profile
        </h2>
      </div>
      
      <div className="p-4">
        <div className="h-64 relative">
          {/* Simple SVG chart - in production use a proper charting library */}
          <svg className="w-full h-full">
            <path
              d={`M ${profitCurve.map((point,) => 
                `${(point.price / underlyingPrice * 100)}% ${50 + (point.profit / 100)}`
              ).join(' L ')}`}
              fill="none"
              stroke="currentColor"
              className="text-emerald-500"
              strokeWidth={2}
            />
          </svg>
          
          {/* Break-even lines */}
          <div className="absolute inset-0 border-b border-gray-300 dark:border-gray-700" 
               style={{ top: '50%' }} />
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Max Loss:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              ${Math.abs(Math.min(...profitCurve.map(p => p.profit))).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Max Profit:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              ${Math.max(...profitCurve.map(p => p.profit)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

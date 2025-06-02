import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface OpportunityScore {
  option: PutOption;
  score: number;
  reason: string;
}

export function OpportunitiesDashboard({ options }: { options: PutOption[] }) {
  const [putOpportunities, setPutOpportunities] = useState<OpportunityScore[]>([]);
  
  useEffect(() => {
    // Score each put option based on criteria
    const scoredPuts = options.map(option => {
      let score = 0;
      const reasons = [];
      
      // Delta-based probability
      if (Math.abs(option.delta) < 0.3) {
        score += 30;
        reasons.push('Favorable probability');
      }
      
      // Theta decay
      if (option.theta < -0.05) {
        score += 20;
        reasons.push('Strong theta decay');
      }
      
      // Volume/liquidity
      if (option.volume > 100 && option.openInterest > 500) {
        score += 20;
        reasons.push('Good liquidity');
      }
      
      return {
        option,
        score,
        reason: reasons.join(', ')
      };
    });
    
    // Sort by score and take top 5
    setPutOpportunities(
      scoredPuts
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    );
  }, [options]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Trading Opportunities
        </h2>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {putOpportunities.map((opportunity, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    ${opportunity.option.strike} Put
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Delta: {opportunity.option.delta.toFixed(2)} | 
                    Theta: {opportunity.option.theta.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Score: {opportunity.score}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {opportunity.reason}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

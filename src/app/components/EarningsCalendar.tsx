import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface EarningsEvent {
  symbol: string;
  date: string;
  impliedMove: number;
  options: PutOption[];
}

export function EarningsCalendar({ options, symbol }: { options: PutOption[], symbol: string }) {
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  
  useEffect(() => {
    // In production, fetch real earnings calendar data
    // For demo, we'll simulate some earnings events
    const mockEarnings: EarningsEvent[] = [{
      symbol,
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      impliedMove: 8.5,
      options: options.filter(opt => 
        new Date(opt.expiration).getTime() > 
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).getTime()
      )
    }];
    
    setEarningsEvents(mockEarnings);
  }, [options, symbol]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upcoming Earnings Events
        </h2>
      </div>
      
      <div className="p-4">
        {earningsEvents.map((event, index) => (
          <div key={index} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {event.symbol} Earnings
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(event.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Expected Move: ±{event.impliedMove}%
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Elevated IV Options
              </div>
              {event.options
                .filter(opt => opt.impliedVolatility > 0.5) // Filter high IV options
                .slice(0, 3) // Show top 3
                .map((option, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      ${option.strike} Put
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      IV: {(option.impliedVolatility * 100).toFixed(1)}%
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

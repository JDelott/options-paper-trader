import { useState, useEffect } from 'react';
import { PutOption } from '../types';

interface OptionsScannerProps {
  options: PutOption[];
  symbol: string;
}

export function OptionsScanner({ options, }: OptionsScannerProps) {
  const [unusualOptions, setUnusualOptions] = useState<PutOption[]>([]);
  
  useEffect(() => {
    // Calculate average volume and OI
    const avgVolume = options.reduce((sum, opt) => sum + opt.volume, 0) / options.length;
    const avgOI = options.reduce((sum, opt) => sum + opt.openInterest, 0) / options.length;
    
    // Find options with unusual activity
    const unusual = options.filter(opt => 
      opt.volume > avgVolume * 2 || // 2x average volume
      opt.openInterest > avgOI * 1.5 // 1.5x average OI
    );
    
    setUnusualOptions(unusual);
  }, [options]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Unusual Options Activity Scanner
        </h2>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {unusualOptions.length > 0 ? (
            <div className="space-y-4">
              {unusualOptions.map((option, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        ${option.strike} Strike Put
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Expires {new Date(option.expiration).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Volume: {option.volume}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Open Interest: {option.openInterest}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400 py-8">
              No unusual activity detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

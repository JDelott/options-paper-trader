"use client";

import { Trade } from '../types';

interface PortfolioProps {
  trades: Trade[];
  onCloseTrade: (tradeId: string) => void;
}

export function Portfolio({ trades, onCloseTrade }: PortfolioProps) {
  const activeTrades = trades.filter(trade => trade.status === 'active');
  const closedTrades = trades.filter(trade => trade.status === 'closed');

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const calculateDaysToExpiry = (expiration: string) => {
    const expiryDate = new Date(expiration);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysLeft: number) => {
    if (daysLeft <= 0) return { status: 'expired', style: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' };
    if (daysLeft <= 7) return { status: 'soon', style: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' };
    return { status: 'active', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' };
  };

  // Calculate totals
  const totalPremium = trades.reduce((sum, trade) => sum + trade.premiumReceived, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="lg:col-span-3 grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Trades</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{trades.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Active Positions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeTrades.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Premium</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalPremium)}</div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-fit">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Positions</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{activeTrades.length} open positions</p>
        </div>
        
        {activeTrades.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strike</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Premium</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {activeTrades.map((trade) => {
                  const daysToExpiry = calculateDaysToExpiry(trade.expiration);
                  const expiryInfo = getExpiryStatus(daysToExpiry);
                  
                  return (
                    <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">{trade.symbol}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(trade.strike)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{formatDate(trade.expiration)}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{trade.contracts}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(trade.premiumReceived)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${expiryInfo.style}`}>
                          {daysToExpiry > 0 ? `${daysToExpiry}d` : 'Expired'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => onCloseTrade(trade.id)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade History */}
      <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-fit">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent History</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{closedTrades.length} completed</p>
        </div>
        
        {closedTrades.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">No history yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <div className="p-2">
              {closedTrades.slice(-10).reverse().map((trade) => (
                <div key={trade.id} className="p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{trade.symbol}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{formatCurrency(trade.strike)} • {formatDate(trade.entryDate)}</div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(trade.premiumReceived)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

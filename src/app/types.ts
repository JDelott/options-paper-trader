export interface PutOption {
  symbol: string;
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  impliedVolatility: number;
  openInterest: number;
  volume: number;
  delta: number;
  gamma: number;
  theta: number;
  underlyingPrice: number;
}

export interface OptionsApiResponse {
  success: boolean;
  puts: PutOption[];
  underlyingPrice: number;
  source: string;
  timestamp: string;
  fromCache: boolean;
}

export interface ErrorCacheData {
  error: string;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'put' | 'call';
  action: 'buy' | 'sell';
  strike: number;
  expiration: string;
  contracts: number;
  premiumReceived: number;
  entryDate: string;
  closeDate?: string;
  status: 'active' | 'closed' | 'expired';
  pnl?: number;
}

export interface OptionsChain {
  symbol: string;
  underlyingPrice: number;
  puts: PutOption[];
  lastUpdated: string;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'put' | 'call' | 'stock';
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  limitPrice?: number;
  stopPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';
  submittedAt: string;
  filledAt?: string;
  fillPrice?: number;
  slippage?: number;
  strike?: number;
  expiration?: string;
  estimatedValue: number;
  actualValue?: number;
  cancelledAt?: string;
  lastModified?: string;
}

export interface Position {
  symbol: string;
  type: 'put' | 'call' | 'stock';
  side: 'long' | 'short';
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dayChange: number;
  dayChangePercent: number;
  strike?: number;
  expiration?: string;
  lastUpdated: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  cash: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  buyingPower: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  lastUpdated: string;
}

export interface TradierOption {
  symbol: string;
  description: string;
  type: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  strike: number;
  volume: number;
  open_interest: number;
  expiration_date: string;
  option_type: 'put' | 'call';
  underlying: string;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

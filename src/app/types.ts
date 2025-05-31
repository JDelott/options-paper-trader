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

import { NextRequest, NextResponse } from 'next/server';
import { Order, PutOption } from '../../types';

// In-memory storage (use database in production)
const orders: Order[] = [];

// Slippage configuration
const SLIPPAGE_CONFIG = {
  market_orders: {
    stocks: 0.01,     // 1 cent
    options: 0.05,    // 5 cents
  },
  liquidity_impact: {
    low_volume_multiplier: 1.5,
    large_order_multiplier: 1.2,
  }
};

export async function GET() {
  return NextResponse.json({
    orders: orders.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    total: orders.length
  });
}

export async function POST(request: NextRequest) {
  try {
    const orderRequest = await request.json();
    
    // Validate order
    const validation = validateOrder(orderRequest);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create order
    const order: Order = {
      id: generateOrderId(),
      symbol: orderRequest.symbol.toUpperCase(),
      type: orderRequest.type,
      side: orderRequest.side,
      quantity: orderRequest.quantity,
      orderType: orderRequest.orderType,
      limitPrice: orderRequest.limitPrice,
      stopPrice: orderRequest.stopPrice,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      strike: orderRequest.strike,
      expiration: orderRequest.expiration,
      estimatedValue: orderRequest.estimatedValue || 0
    };

    // Simulate order execution
    const executedOrder = await simulateOrderExecution(order);
    orders.push(executedOrder);

    return NextResponse.json(executedOrder, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

function validateOrder(orderRequest: Partial<Order>): { valid: boolean; error?: string } {
  if (!orderRequest.symbol) {
    return { valid: false, error: 'Symbol is required' };
  }
  
  if (!orderRequest.type || !['put', 'call', 'stock'].includes(orderRequest.type)) {
    return { valid: false, error: 'Invalid order type' };
  }
  
  if (!orderRequest.side || !['buy', 'sell'].includes(orderRequest.side)) {
    return { valid: false, error: 'Invalid order side' };
  }
  
  if (!orderRequest.quantity || orderRequest.quantity <= 0) {
    return { valid: false, error: 'Invalid quantity' };
  }
  
  if (!orderRequest.orderType || !['market', 'limit', 'stop'].includes(orderRequest.orderType)) {
    return { valid: false, error: 'Invalid order type' };
  }

  return { valid: true };
}

async function simulateOrderExecution(order: Order): Promise<Order> {
  try {
    // Get current market data
    let bid: number;
    let ask: number;

    if (order.type === 'stock') {
      // Get stock quote
      const response = await fetch(`http://localhost:3000/api/quotes/${order.symbol}`);
      const quote = await response.json();
      bid = quote.bid;
      ask = quote.ask;
    } else {
      // Get options data
      if (!order.expiration) {
        throw new Error('Expiration required for options');
      }
      
      const response = await fetch(`http://localhost:3000/api/options/${order.symbol}/${order.expiration}`);
      const optionsData = await response.json();
      
      const option = order.type === 'call' 
        ? optionsData.calls.find((c: PutOption) => c.strike === order.strike)
        : optionsData.puts.find((p: PutOption) => p.strike === order.strike);
      
      if (!option) {
        throw new Error('Option not found');
      }
      
      bid = option.bid;
      ask = option.ask;
    }

    // Simulate fill based on order type
    let fillPrice: number;
    let slippage = 0;

    if (order.orderType === 'market') {
      // Market orders fill immediately with slippage
      const baseSlippage = order.type === 'stock' 
        ? SLIPPAGE_CONFIG.market_orders.stocks
        : SLIPPAGE_CONFIG.market_orders.options;
      
      slippage = baseSlippage * (order.side === 'buy' ? 1 : -1);
      fillPrice = order.side === 'buy' ? ask + slippage : bid - slippage;
      
      return {
        ...order,
        status: 'filled',
        fillPrice,
        slippage: Math.abs(slippage),
        actualValue: fillPrice * order.quantity * (order.type === 'stock' ? 1 : 100),
        filledAt: new Date().toISOString()
      };
    } else if (order.orderType === 'limit') {
      // Limit orders check if they can be filled
      const canFill = order.side === 'buy' 
        ? (order.limitPrice! >= ask)
        : (order.limitPrice! <= bid);
      
      if (canFill) {
        return {
          ...order,
          status: 'filled',
          fillPrice: order.limitPrice!,
          actualValue: order.limitPrice! * order.quantity * (order.type === 'stock' ? 1 : 100),
          filledAt: new Date().toISOString()
        };
      } else {
        // Order remains pending
        return {
          ...order,
          status: 'pending'
        };
      }
    }

    // For other order types, keep pending for now
    return {
      ...order,
      status: 'pending'
    };

  } catch (error) {
    console.error('Error simulating order execution:', error);
    return {
      ...order,
      status: 'rejected'
    };
  }
}

function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

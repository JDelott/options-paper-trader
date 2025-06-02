import { NextRequest, NextResponse } from 'next/server';
import { Order } from '../../../types';

// In-memory storage (use database in production)
const orders: Order[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = orders.find(o => o.id === params.id);
  
  if (!order) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const orderIndex = orders.findIndex(o => o.id === params.id);
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const currentOrder = orders[orderIndex];
    
    // Only allow modifications if order is pending
    if (currentOrder.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot modify non-pending order' },
        { status: 400 }
      );
    }

    const updatedOrder: Order = {
      ...currentOrder,
      ...updates,
      lastModified: new Date().toISOString()
    };

    orders[orderIndex] = updatedOrder;

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderIndex = orders.findIndex(o => o.id === params.id);
    
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orders[orderIndex];
    
    // Only allow cancellation if order is pending
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot cancel non-pending order' },
        { status: 400 }
      );
    }

    // Mark as cancelled instead of deleting
    const cancelledOrder: Order = {
      ...order,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    };

    orders[orderIndex] = cancelledOrder;

    return NextResponse.json(cancelledOrder);

  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is currently disabled due to schema limitations:
    // 1. Product model doesn't have stockLevel field (only stockQuantity)
    // 2. Product model doesn't have direct orderItems relation
    // 3. OrderItem model doesn't have price field (price comes from Product)
    // 4. Need to calculate stats through proper relations
    
    return NextResponse.json({ 
      error: 'Product stats not available - schema limitations',
      details: {
        message: 'Product stats require schema updates or proper relation queries',
        missingFields: ['stockLevel (use stockQuantity)', 'price in OrderItem'],
        missingRelations: ['direct orderItems relation (use through Order)'],
        availableFields: ['stockQuantity', 'price', 'weightKg', 'dimensions']
      },
      stats: {
        total: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        topSelling: 0,
        newThisMonth: 0,
        categories: []
      }
    }, { status: 501 });
  } catch (error) {
    console.error('Product stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
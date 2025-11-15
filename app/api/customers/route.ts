import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is currently disabled due to schema limitations:
    // 1. User model doesn't support customer-specific fields (name, phone, address, city, state, country, status, tier, loyaltyPoints, preferredPaymentMethod, tags)
    // 2. No direct orders relation (orders are linked to Business via businessId, not individual Users)
    // 3. No CUSTOMER role (available roles: ADMIN, MERCHANT, MERCHANT_STAFF, LOGISTICS)
    // 4. Customer data is represented as customerName, customerEmail, customerAddress in Order model
    
    return NextResponse.json({ 
      error: 'Customer management not available - schema limitations',
      details: {
        message: 'User model requires schema update to support customer-specific fields and relations',
        missingFields: ['name', 'phone', 'address', 'city', 'state', 'country', 'status', 'tier', 'loyaltyPoints', 'preferredPaymentMethod', 'tags'],
        missingRelations: ['orders (direct user-to-orders relation)'],
        missingRoles: ['CUSTOMER']
      },
      customers: []
    }, { status: 501 });
  } catch (error) {
    console.error('Customer management error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
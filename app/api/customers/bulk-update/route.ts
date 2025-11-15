import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is currently disabled as the User model doesn't have:
    // - CUSTOMER role (available roles: ADMIN, MERCHANT, MERCHANT_STAFF, LOGISTICS)
    // - status field for bulk updates
    return NextResponse.json({ 
      error: 'Customer bulk update not available - schema limitations',
      details: 'User model requires schema update to support customer status field'
    }, { status: 501 });
  } catch (error) {
    console.error('Customer bulk update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
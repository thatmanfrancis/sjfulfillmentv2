import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    // Get parsed session
    const session = await getCurrentSession();
    
    return NextResponse.json({
      hasSessionToken: !!sessionToken,
      sessionToken: sessionToken ? sessionToken.substring(0, 20) + '...' : null,
      session: session ? {
        userId: session.userId,
        email: session.email,
        role: session.role,
        businessId: session.businessId
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
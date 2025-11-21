import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    console.log('🔍 Debug: Session token exists:', !!sessionToken);
    if (sessionToken) {
      console.log('🔍 Debug: Token preview:', sessionToken.substring(0, 50) + '...');
    }
    
    // Get parsed session
    const session = await getCurrentSession();
    console.log('🔍 Debug: Parsed session:', session);
    
    let userDetails = null;
    let userExists = false;
    let allUsers: any[] = [];
    let canCreateMerchants = false;
    let message = 'No session found';
    
    if (session?.userId) {
      console.log('🔍 Debug: Looking up user with ID:', session.userId);
      
      userDetails = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          businessId: true,
          isVerified: true,
        },
      });
      
      userExists = !!userDetails;
      console.log('🔍 Debug: User exists:', userExists);
      
      // Get a few users to compare
      allUsers = await prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
        take: 3
      });
      console.log('🔍 Debug: All users sample:', allUsers);
      
      canCreateMerchants = userDetails?.role === 'ADMIN';
      message = userExists 
        ? canCreateMerchants 
          ? 'You have admin privileges and can create merchants' 
          : `You are logged in as ${userDetails?.role || 'UNKNOWN'}, but need ADMIN role to create merchants`
        : `Session contains user ID ${session.userId} but user not found in database`;
    }
    
    return NextResponse.json({
      hasSessionToken: !!sessionToken,
      sessionToken: sessionToken ? sessionToken.substring(0, 20) + '...' : null,
      session: session ? {
        userId: session.userId,
        email: session.email,
        role: session.role,
        businessId: session.businessId
      } : null,
      userDetails,
      userExists,
      allUsers,
      canCreateMerchants,
      message,
      instruction: canCreateMerchants 
        ? 'You can proceed to create merchants'
        : session?.userId 
          ? userExists 
            ? 'You need to either: 1) Log in as an admin, 2) Create an admin account, or 3) Have your role changed to ADMIN'
            : `Session user ID ${session.userId} not found in database - session may be stale`
          : 'You need to log in first',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
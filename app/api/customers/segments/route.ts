import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Customer segments temporarily disabled - tier field not implemented
    // TODO: Add tier and orders relation to User schema
    return NextResponse.json({
      segments: [],
      totalCustomers: await prisma.user.count(),
      message: "Customer segments disabled - schema update required"
    });

  } catch (error) {
    console.error('Customer segments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer segments' },
      { status: 500 }
    );
  }
}
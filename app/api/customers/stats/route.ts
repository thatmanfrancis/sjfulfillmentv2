import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Customer stats temporarily disabled - schema fields not implemented
    // TODO: Add tier, status, and orders relation to User schema
    return NextResponse.json({
      totalCustomers: await prisma.user.count(),
      activeCustomers: 0, // Requires status field
      totalRevenue: 0, // Requires orders relation
      averageOrderValue: 0, // Requires orders relation
      customersWithMultipleOrders: 0, // Requires orders relation
      message: "Customer stats disabled - schema update required"
    });

  } catch (error) {
    console.error('Customer stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Product categories temporarily disabled - categoryId field not implemented
    // TODO: Add categoryId field to Product schema
    return NextResponse.json({
      categories: [],
      message: "Product categories disabled - schema update required"
    });

  } catch (error) {
    console.error('Product categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product categories' },
      { status: 500 }
    );
  }
}
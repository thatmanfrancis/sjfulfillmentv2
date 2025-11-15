import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Customer status update temporarily disabled - status field not implemented
    // TODO: Add status field to User schema
    return NextResponse.json({
      error: "Customer status update disabled - schema update required"
    }, { status: 501 });

  } catch (error) {
    console.error('Update customer status error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer status' },
      { status: 500 }
    );
  }
}
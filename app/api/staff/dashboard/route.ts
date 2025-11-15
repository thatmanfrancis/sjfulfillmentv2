import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only MERCHANT_STAFF can access staff dashboard
    if (authResult.user.role !== "MERCHANT_STAFF") {
      return NextResponse.json(
        { error: "Only staff members can access this dashboard" },
        { status: 403 }
      );
    }

    // Staff dashboard temporarily disabled due to schema limitations
    // TODO: Re-implement when assignedStaffId, orderItems, and priority fields are added
    const dashboardData = {
      todaysAssignments: 0,
      completedTasks: 0,
      pendingTasks: 0,
      weeklyProgress: 0,
      monthlyStats: {
        tasksCompleted: 0,
        ordersProcessed: 0,
        averageHandlingTime: 0,
        performanceScore: 0
      },
      recentTasks: [],
      priorityTasks: [],
      lowStockAlerts: [],
      message: "Staff dashboard features temporarily disabled - schema update required"
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("Staff dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
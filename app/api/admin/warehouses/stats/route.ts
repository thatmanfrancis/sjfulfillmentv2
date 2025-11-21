import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses,
      maintenanceWarehouses,
      capacityData,
      stockAllocationData
    ] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
      prisma.warehouse.count({ where: { status: 'INACTIVE' } }),
      prisma.warehouse.count({ where: { status: 'MAINTENANCE' } }),
      prisma.warehouse.aggregate({
        _sum: { capacity: true }
      }),
      prisma.stockAllocation.aggregate({
        _sum: { allocatedQuantity: true }
      })
    ]);

    const totalCapacity = capacityData._sum.capacity || 0;
    const totalStock = stockAllocationData._sum.allocatedQuantity || 0;
    const utilizationRate = totalCapacity > 0 ? ((totalStock / totalCapacity) * 100) : 0;

    return NextResponse.json({
      totalWarehouses,
      activeWarehouses,
      inactiveWarehouses,
      maintenanceWarehouses,
      totalCapacity,
      totalStock,
      utilizationRate: Math.round(utilizationRate * 100) / 100 // Round to 2 decimal places
    });

  } catch (error) {
    console.error('Error fetching warehouse stats:', error);
    return NextResponse.json(
      { 
        totalWarehouses: 0,
        activeWarehouses: 0,
        inactiveWarehouses: 0,
        maintenanceWarehouses: 0,
        totalCapacity: 0,
        totalStock: 0,
        utilizationRate: 0
      },
      { status: 200 }
    );
  }
}
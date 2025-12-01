import { randomUUID } from 'crypto';
import { sendEmail } from '@/lib/email';
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import bcrypt from 'bcryptjs';




export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }
    const { firstName, lastName, email, phone } = await req.json();
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    // Generate password
    const password = Math.random().toString(36).slice(-10) + "Aa1!";
    const passwordHash = await bcrypt.hash(password, 12);
    // Create user with LOGISTICS role (auto-verified)
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        firstName,
        lastName,
        email,
        phone,
        role: 'LOGISTICS',
        isVerified: true,
        passwordHash,
        updatedAt: new Date(),
      },
    });
    // Send welcome email with credentials
    await sendEmail({
      to: email,
      subject: 'Welcome to SJFulfillment Logistics – Your Account Details',
      html: `<p>Hello ${firstName},</p>
        <p>Your logistics account has been created. You can now log in using the credentials below:</p>
        <p><b>Email:</b> ${email}<br/><b>Password:</b> ${password}</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.sjfulfillment.com'}/auth/login">Log in to SJFulfillment</a></p>
        <p>If you did not expect this invitation, you can ignore this email.</p>
        <p>Thank you,<br/>SJFulfillment Team</p>`
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add logistics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const adminUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    // Get logistics regions (using warehouses as regions)
    const warehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get logistics regions (junction table records)
    const logisticsRegions = await prisma.logisticsRegion.findMany({
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          },
        },
        Warehouse: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
      },
    });

    // Get logistics users with their assigned orders
    const logisticsUsers = await prisma.user.findMany({
      where: { 
        role: 'LOGISTICS' 
      },
      include: {
        // assignedOrders: {
        //   select: {
        //     id: true,
        //     status: true,
        //   },
        // },
        Order: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get warehouses for assignment (using the same warehouses data)
    const warehousesForAssignment = warehouses.map(w => ({
      id: w.id,
      name: w.name,
      region: w.region || 'Unknown'
    }));

    // Calculate stats
    const totalRegions = warehouses.length;
    const activeRegions = warehouses.length; // All warehouses are considered active
    const totalLogisticsUsers = logisticsUsers.length;
    const activeLogisticsUsers = logisticsUsers.filter(u => u.isVerified).length; // Use isVerified as proxy for active
    
    // Calculate total deliveries and completion rate
    const allAssignedOrders = logisticsUsers.flatMap(u => u.Order);
    const totalDeliveries = allAssignedOrders.length;
    const completedDeliveries = allAssignedOrders.filter(o => o.status === 'DELIVERED').length;
    const completionRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

    // Transform users data
    const transformedUsers = logisticsUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isVerified, // Use isVerified as proxy for active
      regionId: null, // Not applicable with current schema
      region: null,
      phone: user.phone,
      role: user.role,
      totalOrders: user.Order.length,
      completedOrders: user.Order.filter(o => o.status === 'DELIVERED').length,
      createdAt: user.createdAt.toISOString(),
    }));

    // Transform regions data (use warehouses as regions)
    const transformedRegions = warehouses.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code || warehouse.name.substring(0, 3).toUpperCase(),
      isActive: true,
      coverage: warehouse.region || 'Unknown',
      createdAt: new Date().toISOString(), // Fallback since no createdAt in Warehouse
      updatedAt: new Date().toISOString(), // Fallback since no updatedAt in Warehouse
    }));

    return NextResponse.json({
      regions: transformedRegions,
      users: transformedUsers,
      warehouses: warehousesForAssignment,
      stats: {
        totalRegions,
        activeRegions,
        totalLogisticsUsers,
        activeLogisticsUsers,
        totalDeliveries,
        completionRate,
      },
    });

  } catch (error) {
    console.error('Get logistics data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
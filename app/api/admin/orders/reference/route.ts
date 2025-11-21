import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all businesses and their products for reference
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        Product: {
          select: {
            sku: true,
            name: true,
            StockAllocation: {
              select: {
                allocatedQuantity: true,
                Warehouse: {
                  select: {
                    name: true,
                    region: true
                  }
                }
              }
            }
          },
          orderBy: {
            sku: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format the response for easy reference
    const formattedData = businesses.map(business => ({
      businessName: business.name,
      products: business.Product.map(product => ({
        sku: product.sku,
        name: product.name,
        totalStock: product.StockAllocation.reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0),
        warehouses: product.StockAllocation.map(allocation => ({
          name: allocation.Warehouse.name,
          region: allocation.Warehouse.region,
          stock: allocation.allocatedQuantity
        }))
      }))
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      summary: {
        totalBusinesses: businesses.length,
        totalProducts: businesses.reduce((sum, business) => sum + business.Product.length, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching products and businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
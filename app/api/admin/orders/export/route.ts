
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function POST(request: NextRequest) {
     try {
       const session = await getCurrentSession();
       if (!session?.userId) {
         return NextResponse.json(
           { error: "Authentication required" },
           { status: 401 }
         );
       }

       const { merchantId, dateFrom, dateTo, allMerchants } =
         await request.json();
       let where: any = {};

       if (!allMerchants && merchantId) {
         where.merchantId = merchantId;
       }
       if (dateFrom) {
         where.orderDate = { ...where.orderDate, gte: new Date(dateFrom) };
       }
       if (dateTo) {
         where.orderDate = { ...where.orderDate, lte: new Date(dateTo) };
       }

       const orders = await prisma.order.findMany({
         where,
         include: {
           Business: { select: { name: true } },
           OrderItem: {
             include: { Product: { select: { name: true, sku: true } } },
           },
         },
         orderBy: { orderDate: "desc" },
       });

       return NextResponse.json({ orders });
     } catch (error) {
       console.error("Export orders error:", error);
       return NextResponse.json(
         { error: "Internal server error" },
         { status: 500 }
       );
     }
}

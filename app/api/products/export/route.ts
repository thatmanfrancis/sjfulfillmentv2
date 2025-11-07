import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json(
      { message: `Error occured while exporting products` },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");

    const { isAdmin, merchantIds } = await getUserMerchantContext(
      auth.userId as string
    );

    const where: any = {
      deletedAt: null,
    };

    if (merchantId) {
      where.merchantId = merchantId;
    } else if (!isAdmin) {
      where.merchantId = { in: merchantIds };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
    });

    // Convert to CSV
    const headers = [
      "SKU",
      "Name",
      "Category",
      "Cost Price",
      "Selling Price",
      "Status",
    ];
    const rows = products.map((p: any) => [
      p.sku,
      p.name,
      p.category?.name || "",
      p.costPrice || 0,
      p.sellingPrice || 0,
      p.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=products.csv",
      },
    });
  } catch (error) {
    console.error("Export products error:", error);
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}

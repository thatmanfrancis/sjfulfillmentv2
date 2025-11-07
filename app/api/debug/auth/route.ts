import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";
import { checkRouteAccess, getAccessibleRoutes } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ 
      message: `Debug auth failed: ${auth.error}`,
      details: auth,
      headers: Object.fromEntries(req.headers.entries())
    }, { status: 400 });
  }

  try {
    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(
      auth.userId as string
    );

    const accessibleRoutes = getAccessibleRoutes(userRole as any);
    const canAccessWarehouse = checkRouteAccess(userRole as any, "/warehouse");

    return NextResponse.json({
      userId: auth.userId,
      userRole,
      isAdmin,
      merchantIds,
      accessibleRoutes,
      canAccessWarehouse,
      warehouseInRoutes: accessibleRoutes.includes("/warehouse"),
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Failed to get debug info" },
      { status: 500 }
    );
  }
}
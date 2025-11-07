import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  try {
    // Return available role enums from the schema
    const roles = [
      { value: "ADMIN", label: "Administrator" },
      { value: "MERCHANT", label: "Merchant" },
      { value: "MERCHANT_STAFF", label: "Merchant Staff" },
      { value: "LOGISTICS_PERSONNEL", label: "Logistics Personnel" },
      { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager" },
    ];

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    error: "Role creation is deprecated. Roles are now fixed enums on the User model." 
  }, { status: 410 });
}

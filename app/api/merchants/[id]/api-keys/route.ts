import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: merchantId } = await params;
    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(auth.userId as string);

    // merchant staff & merchant owner can view keys for their merchant
    if (!isAdmin && !merchantIds.includes(merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const keys = await prisma.apiKey.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
    // For security, don't return secrets for staff viewers; only return meta (but the creator/owner/admin can see full key on creation)
    const sanitized = keys.map(k => ({ id: k.id, keyName: k.keyName, prefix: k.prefix, environment: k.environment, status: k.status, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt }));

    return NextResponse.json({ apiKeys: sanitized });
  } catch (error: any) {
    console.error("List API keys error:", error);
    return NextResponse.json({ error: "Failed to list api keys" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: merchantId } = await params;
    const body = await req.json();
    const { keyName, environment = "LIVE" } = body;

    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(auth.userId as string);

    // Only admin or merchant owner (merchantIds) can create keys.
    // Merchant staff (MERCHANT_STAFF) are explicitly forbidden from creating keys.
    if (!isAdmin && !merchantIds.includes(merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!isAdmin && userRole === "MERCHANT_STAFF") {
      return NextResponse.json({ error: "Merchant staff cannot create API keys" }, { status: 403 });
    }

    // generate key and secret
    const apiKey = crypto.randomBytes(24).toString("hex");
    const apiSecret = crypto.randomBytes(32).toString("hex");
    const prefix = apiKey.slice(0, 8);

    const created = await prisma.apiKey.create({
      data: {
        merchantId,
        keyName: keyName || "default",
        apiKey,
        apiSecret,
        prefix,
        environment: environment as any,
        permissions: {},
        createdBy: auth.userId as string,
      },
    });

    // Return the plaintext key and secret once (clients must persist)
    return NextResponse.json({ apiKey: created.apiKey, apiSecret: created.apiSecret, id: created.id });
  } catch (error: any) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create api key" }, { status: 500 });
  }
}

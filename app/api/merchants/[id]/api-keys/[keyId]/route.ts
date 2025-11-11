import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserMerchantContext } from "@/lib/merchant-context";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: merchantId, keyId } = await params;
    const body = await req.json();
    const { action } = body; // 'revoke' or 'activate'

    const { isAdmin, merchantIds, userRole } = await getUserMerchantContext(auth.userId as string);
    if (!isAdmin && !merchantIds.includes(merchantId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Prevent merchant staff from revoking/activating keys — only ADMIN or merchant owner may perform this
    if (!isAdmin && userRole === "MERCHANT_STAFF") {
      return NextResponse.json({ error: "Merchant staff cannot modify API keys" }, { status: 403 });
    }

    if (action === 'revoke') {
      const updated = await prisma.apiKey.update({ where: { id: keyId }, data: { status: 'REVOKED', revokedAt: new Date() } });
      return NextResponse.json({ message: 'API key revoked', key: { id: updated.id, status: updated.status } });
    }

    if (action === 'activate') {
      const updated = await prisma.apiKey.update({ where: { id: keyId }, data: { status: 'ACTIVE', revokedAt: null } });
      return NextResponse.json({ message: 'API key activated', key: { id: updated.id, status: updated.status } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API key patch error:', error);
    return NextResponse.json({ error: 'Failed to update api key' }, { status: 500 });
  }
}

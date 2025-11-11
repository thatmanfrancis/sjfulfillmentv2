import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    if (!state) return NextResponse.json({ colleagues: [] });

    // Query colleagues who cover the state, include their current active attempt count and capacity
    const rows: Array<any> = await prisma.$queryRaw`
      SELECT u.id, u.first_name as firstName, u.last_name as lastName, lp.capacity as capacity,
        (SELECT COUNT(*) FROM delivery_attempts da WHERE da.handler_id = u.id AND da.status <> 'DELIVERED')::int as activeCount
      FROM logistics_profiles lp
      JOIN users u ON u.id = lp.user_id
      WHERE lp.active = true
        AND lp.coverage_states @> ${JSON.stringify([state])}::jsonb
        AND u.id <> ${String(auth.userId)}
    `;

    return NextResponse.json({ colleagues: rows });
  } catch (error) {
    console.error('Get colleagues error:', error);
    return NextResponse.json({ error: 'Failed to fetch colleagues' }, { status: 500 });
  }
}

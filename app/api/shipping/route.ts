import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching shipping carriers` }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const carriers = await prisma.shippingCarrier.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ carriers });
  } catch (error) {
    console.error("Get carriers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch carriers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching shipping carriers` }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, code, logoUrl, trackingUrlTemplate, apiConfig } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const carrier = await prisma.shippingCarrier.create({
      data: {
        name,
        code: code.toUpperCase(),
        logoUrl,
        trackingUrlTemplate,
        apiConfig,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        message: "Carrier created successfully",
        carrier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create carrier error:", error);
    return NextResponse.json(
      { error: "Failed to create carrier" },
      { status: 500 }
    );
  }
}

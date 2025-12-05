import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/notes - Create a new note
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, orderId, shipmentId } = body;

    // Validate that either orderId or shipmentId is provided, but not both
    if ((!orderId && !shipmentId) || (orderId && shipmentId)) {
      return NextResponse.json(
        {
          error: "Either orderId or shipmentId must be provided, but not both",
        },
        { status: 400 }
      );
    }

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        content: content.trim(),
        authorId: authResult.user.id,
        ...(orderId && { orderId }),
        ...(shipmentId && { shipmentId }),
      },
      include: {
        Author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

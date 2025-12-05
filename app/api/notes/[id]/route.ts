import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/notes/[id] - Update a note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user is the author or an admin
    if (
      existingNote.authorId !== authResult.user.id &&
      authResult.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "You can only edit your own notes" },
        { status: 403 }
      );
    }

    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
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

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user is the author or an admin
    if (
      existingNote.authorId !== authResult.user.id &&
      authResult.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "You can only delete your own notes" },
        { status: 403 }
      );
    }

    // Delete the note
    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

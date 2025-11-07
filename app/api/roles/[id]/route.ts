import { NextRequest, NextResponse } from "next/server";

// This endpoint is deprecated as we no longer use a Role table
// Individual roles are stored directly on the User model

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ 
    error: "This endpoint is deprecated. Roles are now stored directly on users." 
  }, { status: 410 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ 
    error: "This endpoint is deprecated. Roles are now stored directly on users." 
  }, { status: 410 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ 
    error: "This endpoint is deprecated. Roles are now stored directly on users." 
  }, { status: 410 });
}

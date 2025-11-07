import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // In a production app, you might want to:
  // 1. Invalidate the refresh token in a blacklist
  // 2. Clear any server-side session data
  // For JWT-based auth, logout is mainly handled client-side by removing tokens

  return NextResponse.json({
    message: "Logout successful",
  });
}

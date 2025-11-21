import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  
  return NextResponse.json({
    hasSession: !!sessionCookie?.value,
    sessionPreview: sessionCookie?.value ? sessionCookie.value.substring(0, 50) + '...' : null,
    allCookies: Object.fromEntries([...request?.cookies || []]),
    timestamp: new Date().toISOString()
  });
}
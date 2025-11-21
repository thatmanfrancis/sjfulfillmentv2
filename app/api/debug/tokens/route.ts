import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Skip auth check for debugging - REMOVE IN PRODUCTION
    console.log('🔍 Debug: Starting token investigation...');

    // Also search for the specific failing token
    const failingToken = '91dff405b06692a0e081907d780163578e488f4b809acf9fde00285616b4491f';
    const specificToken = await prisma.verificationToken.findFirst({
      where: {
        token: failingToken
      },
      include: {
        User: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    // Search for partial token matches
    const partialMatch = await prisma.verificationToken.findFirst({
      where: {
        token: {
          contains: '91dff405b06692a0e081907d780163578e488f4b809acf9f'
        }
      }
    });

    // Count total tokens
    const totalTokens = await prisma.verificationToken.count();
    
    // Get recent tokens for ncis@gmail.com
    const ncisUser = await prisma.user.findUnique({
      where: { email: 'ncis@gmail.com' },
      include: {
        VerificationToken: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    // Get all verification tokens
    const tokens = await prisma.verificationToken.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        User: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    console.log('🔍 Debug results:', {
      totalTokens,
      specificTokenFound: !!specificToken,
      partialMatchFound: !!partialMatch,
      ncisUserFound: !!ncisUser,
      tokensCount: tokens.length
    });

    return NextResponse.json({
      success: true,
      totalTokens,
      failingTokenFound: !!specificToken,
      partialMatchFound: !!partialMatch,
      ncisUserFound: !!ncisUser,
      ncisTokens: ncisUser?.VerificationToken?.map(t => ({
        id: t.id,
        token: t.token.substring(0, 16) + '...',
        fullToken: t.token === failingToken ? 'MATCH!' : 'no match',
        type: t.type,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt
      })) || [],
      specificTokenDetails: specificToken ? {
        id: specificToken.id,
        token: specificToken.token.substring(0, 16) + '...',
        type: specificToken.type,
        expiresAt: specificToken.expiresAt,
        createdAt: specificToken.createdAt,
        user: specificToken.User,
        isExpired: specificToken.expiresAt < new Date()
      } : null,
      data: tokens.map(token => ({
        id: token.id,
        token: token.token.substring(0, 16) + '...',
        type: token.type,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        user: token.User,
        isExpired: token.expiresAt < new Date()
      }))
    });

  } catch (error) {
    console.error('Debug tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
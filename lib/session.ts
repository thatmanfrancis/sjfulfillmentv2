'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSession, getSessionFromToken, sessionCookieConfig } from './auth';

// Server action for creating a session and setting the cookie
export async function createSessionCookie(userId: string) {
  const sessionToken = await createSession(userId);
  const cookieStore = await cookies();
  
  console.log('Setting session cookie for user:', userId);
  console.log('Session token created:', !!sessionToken);
  console.log('Cookie config:', sessionCookieConfig);
  
  cookieStore.set('session', sessionToken, sessionCookieConfig);
  
  // Verify the cookie was set
  const verifyToken = cookieStore.get('session')?.value;
  console.log('Cookie verification:', !!verifyToken, verifyToken === sessionToken);
  
  return sessionToken;
}

// Server action for getting current session
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  console.log('getCurrentSession called, token exists:', !!sessionToken);
  
  if (!sessionToken) {
    console.log('No session token found');
    return null;
  }
  
  try {
    // For JWT tokens, verify them directly
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
    const payload = jwt.verify(sessionToken, JWT_SECRET);
    
    console.log('✅ Session verified for user:', payload.userId);
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId
    };
  } catch (error) {
    console.log('❌ Session verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Server action for deleting session
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

// Server action for logout with redirect
export async function logoutAction() {
  await deleteSession();
  redirect('/login');
}
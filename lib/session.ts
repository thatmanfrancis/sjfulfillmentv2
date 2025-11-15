'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSession, getSessionFromToken, sessionCookieConfig } from './auth';

// Server action for creating a session and setting the cookie
export async function createSessionCookie(userId: string) {
  const sessionToken = await createSession(userId);
  const cookieStore = await cookies();
  
  cookieStore.set('session', sessionToken, sessionCookieConfig);
  
  return sessionToken;
}

// Server action for getting current session
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) return null;
  
  return await getSessionFromToken(sessionToken);
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
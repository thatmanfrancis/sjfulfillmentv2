import { SignJWT, jwtVerify } from 'jose';
import prisma from './prisma';
import { hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { addDays, addMinutes } from 'date-fns';

const secretKey = process.env.JWT_SECRET || 'secret';
const key = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  businessId?: string;
  iat?: number;
  exp?: number;
  [key: string]: any; // Index signature for JWTPayload compatibility
}

// JWT Functions
export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionPayload;
}

// Session Management
export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      businessId: true,
      isVerified: true,
      mfaEnabled: true,
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    businessId: user.businessId || undefined,
  };

  const session = await encrypt(payload);
  return session;
}

// Cookie configuration
export const sessionCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/',
  sameSite: 'lax' as const
};

// Get session from token (for use in middleware or API routes)
export async function getSessionFromToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  
  try {
    return await decrypt(token);
  } catch {
    return null;
  }
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// MFA utilities
export function generateMFASecret(): string {
  return randomBytes(32).toString('base64');
}

export function generateMFABackupCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Email verification tokens
export async function generateVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = addDays(new Date(), 1); // 24 hours

  await prisma.verificationToken.create({
    data: {
      userId,
      token,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    }
  });

  return token;
}

export async function generatePasswordResetToken(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('User not found');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = addMinutes(new Date(), 30); // 30 minutes

  // Delete existing reset tokens
  await prisma.verificationToken.deleteMany({
    where: {
      userId: user.id,
      type: 'PASSWORD_RESET'
    }
  });

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      type: 'PASSWORD_RESET',
      expiresAt,
    }
  });

  return token;
}

export async function verifyToken(token: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      type,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!verificationToken) {
    throw new Error('Invalid or expired token');
  }

  return verificationToken;
}

// Rate limiting
const attempts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const userAttempts = attempts.get(identifier);

  if (!userAttempts || now > userAttempts.resetTime) {
    attempts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userAttempts.count >= maxAttempts) {
    return false;
  }

  userAttempts.count++;
  return true;
}

export function clearRateLimit(identifier: string) {
  attempts.delete(identifier);
}

// Password Generation
export function generateRandomPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  
  // Ensure at least one character from each category
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Add remaining random characters to reach length of 12
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// TOTP (Time-based One-Time Password) Functions
export function generateTOTPSecret(): string {
  // Generate a base32 encoded secret for TOTP
  const secret = randomBytes(20).toString('base64url');
  return secret;
}

export function verifyTOTP(secret: string, token: string): boolean {
  // Simple TOTP verification - in production, use a proper TOTP library
  // This is a placeholder implementation
  try {
    const crypto = require('crypto');
    const time = Math.floor(Date.now() / 30000); // 30-second time window
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64url'));
    hmac.update(Buffer.from(time.toString()));
    const hash = hmac.digest();
    
    // Extract dynamic binary code
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
    
    const otp = binary % 1000000;
    const expectedToken = otp.toString().padStart(6, '0');
    
    return expectedToken === token;
  } catch {
    return false;
  }
}

// MFA Backup Codes
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    // Generate 8-digit backup codes
    const code = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    codes.push(code);
  }
  return codes;
}

// Auth verification for API routes
export async function verifyAuth(request: Request): Promise<{success: boolean, user?: any, error?: string}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, error: 'No token provided' };
    }

    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
        isVerified: true,
        mfaEnabled: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
}

export function hasRole(user: any, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}
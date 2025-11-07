// lib/otp.ts
import crypto from "crypto";
import prisma from "./prisma";

export async function generateOtp(userId: string, length = 6): Promise<string> {
  const code = crypto
    .randomInt(0, Math.pow(10, length))
    .toString()
    .padStart(length, "0");

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Delete any existing OTPs for this user
  await prisma.otp.deleteMany({
    where: { userId }
  });

  // Create new OTP
  await prisma.otp.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  console.log(`[OTP] Generated for user ${userId}: ${code}`); // Debug log

  return code;
}

export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  console.log(`[OTP] Verifying for user ${userId}`); // Debug log
  console.log(`[OTP] Provided code: "${code}" (type: ${typeof code}, length: ${code?.length})`); // Debug log

  // Clean up expired OTPs first
  await prisma.otp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  // Find the OTP
  const stored = await prisma.otp.findFirst({
    where: {
      userId,
      expiresAt: {
        gt: new Date() // Not expired
      }
    },
    orderBy: {
      createdAt: 'desc' // Get the most recent one
    }
  });

  console.log(`[OTP] Stored data:`, stored); // Debug log

  if (!stored) {
    console.log(`[OTP] No valid OTP found for user ${userId}`);
    return false;
  }

  // Check if expired (double check)
  if (stored.expiresAt <= new Date()) {
    console.log(`[OTP] OTP expired for user ${userId}. Expires at: ${stored.expiresAt.getTime()}, Current: ${Date.now()}`);
    await prisma.otp.delete({
      where: { id: stored.id }
    });
    return false;
  }

  // Trim whitespace and compare
  const trimmedCode = code.trim();
  const trimmedStoredCode = stored.code.trim();

  // Check if code matches
  if (trimmedStoredCode !== trimmedCode) {
    console.log(`[OTP] Code mismatch. Expected: "${trimmedStoredCode}", Got: "${trimmedCode}"`);
    console.log(`[OTP] Code comparison details: Expected length: ${trimmedStoredCode.length}, Got length: ${trimmedCode.length}`);
    return false;
  }

  // Valid OTP - delete it (one-time use)
  await prisma.otp.delete({
    where: { id: stored.id }
  });
  
  console.log(`[OTP] OTP verified successfully for user ${userId}`);

  return true;
}

// Optional: Clear all OTPs for a user (for testing)
export async function clearUserOtps(userId: string): Promise<void> {
  await prisma.otp.deleteMany({
    where: { userId }
  });
  console.log(`[OTP] All OTPs cleared for user ${userId}`);
}

// Optional: Clear all expired OTPs (cleanup function)
export async function clearExpiredOtps(): Promise<void> {
  const result = await prisma.otp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  console.log(`[OTP] Cleared ${result.count} expired OTPs`);
}

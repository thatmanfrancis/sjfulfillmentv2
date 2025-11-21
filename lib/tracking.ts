import prisma from './prisma';

/**
 * Generates a unique 5-character tracking number with numbers and letters
 * Format: Alphanumeric (uppercase letters and numbers)
 */
export async function generateUniqueTrackingNumber(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let trackingNumber = '';
    for (let i = 0; i < 5; i++) {
      trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if this tracking number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { trackingNumber },
      select: { id: true }
    });

    if (!existingOrder) {
      return trackingNumber;
    }

    attempts++;
  }

  // If we can't generate a unique number after maxAttempts, throw an error
  throw new Error('Unable to generate unique tracking number');
}

/**
 * Validates a tracking number format
 */
export function isValidTrackingNumber(trackingNumber: string): boolean {
  return /^[A-Z0-9]{5}$/.test(trackingNumber);
}
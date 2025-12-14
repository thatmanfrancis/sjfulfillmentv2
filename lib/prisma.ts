import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error"],
    errorFormat: "pretty",
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["error", "warn"],
      errorFormat: "pretty",
    });

    // Ensure connection on startup
    global.__prisma.$connect().catch(console.error);
  }
  prisma = global.__prisma;
}

// Helper function to ensure connection before each query
export async function ensureConnected() {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error("Prisma connection error:", error);
    throw error;
  }
  return prisma;
}

export default prisma;

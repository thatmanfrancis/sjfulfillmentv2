import prisma from "@/lib/prisma";

export async function getUserMerchantContext(id: string): Promise<{
  isAdmin: boolean;
  merchantIds: string[];
  userRole: string | null;
}> {
  // Get user with their role and merchant relationships
  const user = await prisma.user.findUnique({
    where: { id },
    select: { 
      role: true,
      ownedMerchants: {
        select: { id: true }
      },
      merchantStaff: {
        select: { merchantId: true }
      }
    },
  });

  if (!user) {
    return { isAdmin: false, merchantIds: [], userRole: null };
  }

  const isAdmin = user.role === "ADMIN";
  
  // Get merchant IDs from owned merchants and staff relationships
  const merchantIds: string[] = [
    ...user.ownedMerchants.map(m => m.id),
    ...user.merchantStaff.map(s => s.merchantId)
  ];

  return { isAdmin, merchantIds, userRole: user.role };
}

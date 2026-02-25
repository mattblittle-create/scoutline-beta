import { PrismaClient, AdminRole } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const userId = "cmkhbzela0000qtwgajvvoupd";

  const admin = await prisma.adminUser.upsert({
    where: { userId },
    create: { userId, isActive: true, twoFactorRequired: false },
    update: { isActive: true },
  });

  await prisma.adminUserRole.upsert({
    where: { adminUserId_role: { adminUserId: admin.id, role: AdminRole.BILLING_ADMIN } },
    create: { adminUserId: admin.id, role: AdminRole.BILLING_ADMIN },
    update: {},
  });

  console.log("OK:", { adminUserId: admin.id });
}

main().finally(() => prisma.$disconnect());
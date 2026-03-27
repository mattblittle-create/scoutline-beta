// lib/admin/requireAdmin.ts
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function requireAdmin(redirectTo = "/login?next=%2Fadmin") {
  const user = await getCurrentUser();
  if (!user?.id) redirect(redirectTo);

  const admin = await prisma.adminProfile.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: { roles: true },
  });

  if (!admin) redirect(redirectTo);

  return { ok: true as const, user, admin };
}
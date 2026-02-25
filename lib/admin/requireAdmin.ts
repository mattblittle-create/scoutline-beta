// lib/admin/requireAdmin.ts
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRealUser } from "@/lib/auth/getCurrentUser";

export async function requireAdmin(args?: { redirectTo?: string }) {
  const redirectTo = args?.redirectTo ?? "/staff";

  // ✅ MUST use REAL user (never impersonated), otherwise admin pages break
  const user = await getRealUser();
  if (!user?.id) redirect(redirectTo);

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { roles: true },
  });

  if (!admin?.isActive) redirect(redirectTo);

  return { ok: true as const, user, admin, roles: admin.roles.map((r) => r.role) };
}

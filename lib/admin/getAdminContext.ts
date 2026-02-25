// lib/admin/getAdminContext.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getRealUser } from "@/lib/auth/getCurrentUser";

const IMP_COOKIE = "scoutline_act_as_uid";

function canImpersonate(roleList: string[]) {
  return roleList.includes("SCOUTLINE_ADMIN") || roleList.includes("SUPPORT_AGENT");
}

export async function getAdminContext() {
  // ✅ REAL user for admin identity + permissions
  const user = await getRealUser();
  if (!user?.id) return { ok: false as const, user: null, admin: null, roles: [], actingUser: null };

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { roles: true },
  });

  if (!admin?.isActive) return { ok: false as const, user, admin: null, roles: [], actingUser: null };

  const roles = admin.roles.map((r) => r.role);

  const imp = cookies().get(IMP_COOKIE)?.value?.trim() ?? "";
  const can = canImpersonate(roles);

  let actingUser: { id: string; email: string; name: string | null } | null = null;

  if (can && imp) {
    const target = await prisma.user.findUnique({
      where: { id: imp },
      select: { id: true, email: true, name: true },
    });
    actingUser = target ?? null;
  }

  return { ok: true as const, user, admin, roles, actingUser };
}

export const AdminImpersonation = {
  cookieName: IMP_COOKIE,
};

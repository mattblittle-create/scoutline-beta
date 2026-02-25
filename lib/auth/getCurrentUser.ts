// lib/auth/getCurrentUser.ts
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const UID_COOKIE = "scoutline_uid";
const IMP_COOKIE = "scoutline_act_as_uid";

function normalizeEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

function canImpersonate(roleList: string[]) {
  return roleList.includes("SCOUTLINE_ADMIN") || roleList.includes("SUPPORT_AGENT");
}

/**
 * Real signed-in user (NEVER impersonated).
 * Use this for admin gates (requireAdmin), logging, etc.
 */
export async function getRealUser() {
  // ✅ 1) Normal cookie auth (prod + dev)
  const uid = cookies().get(UID_COOKIE)?.value?.trim();
  if (uid) {
    return prisma.user.findUnique({
      where: { id: uid },
      include: { coachProfile: true, college: true },
    });
  }

  // ✅ 2) DEV-ONLY fallbacks (NO PROD)
  if (process.env.NODE_ENV !== "production") {
    const h = headers();

    const devAuthEnabled = normalizeEmail(process.env.DEV_AUTH_ENABLED || "") === "true";
    if (!devAuthEnabled) return null;

    const devHeader = normalizeEmail(h.get("x-dev-email") || "");
    const devCookie = normalizeEmail(cookies().get("scoutline_dev_email")?.value || "");
    const devEnv = normalizeEmail(process.env.DEV_USER_EMAIL || "");

    const devEmail = devHeader || devCookie || devEnv;

    if (devEmail) {
      const u = await prisma.user.findUnique({
        where: { email: devEmail },
        include: { coachProfile: true, college: true },
      });
      if (u) return u;
    }
  }

  return null;
}

/**
 * Effective current user (honors admin impersonation cookie if permitted).
 * Use this for "normal app" behavior so View As actually works.
 */
export async function getCurrentUser() {
  const realUser = await getRealUser();
  if (!realUser?.id) return null;

  const imp = cookies().get(IMP_COOKIE)?.value?.trim() || "";
  if (!imp) return realUser;

  // Only allow impersonation if real user is active AdminUser and has role permission
  const admin = await prisma.adminUser.findUnique({
    where: { userId: realUser.id },
    include: { roles: true },
  });

  if (!admin?.isActive) return realUser;

  const roles = admin.roles.map((r) => r.role);
  if (!canImpersonate(roles)) return realUser;

  const target = await prisma.user.findUnique({
    where: { id: imp },
    include: { coachProfile: true, college: true },
  });

  return target ?? realUser;
}

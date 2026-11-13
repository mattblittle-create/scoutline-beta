// app/admin/impersonate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AdminImpersonation } from "@/lib/admin/getAdminContext";
import { logAdminAction } from "@/lib/admin/audit";

function safeNext(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "/admin";
  if (!s.startsWith("/")) return "/admin"; // prevent open redirects
  return s;
}

function getCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const nextPath = safeNext(url.searchParams.get("next"));
  const clear = url.searchParams.get("clear") === "1";
  const userId = String(url.searchParams.get("userId") ?? "").trim();

  const { admin } = await requireAdmin("/staff");

  const roleList = admin.roles.map((r: { role: string }) => r.role);
  const canImpersonate = roleList.includes("SCOUTLINE_ADMIN") || roleList.includes("SUPPORT_AGENT");
  const dest = new URL(nextPath, url.origin);

  // Always redirect; we just may not set cookies
  const res = NextResponse.redirect(dest);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");

  if (!canImpersonate) return res;

  const cookieName = AdminImpersonation.cookieName;

  if (clear) {
    const prev = getCookieFromHeader(req.headers.get("cookie"), cookieName);

    // Clear cookie hard
    res.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    await logAdminAction({
      adminUserId: admin.id,
      actingUserId: prev,
      action: "STOP_IMPERSONATION",
      entityType: "User",
      entityId: prev,
      beforeJson: prev ? { actingUserId: prev } : null,
      afterJson: { actingUserId: null },
    });

    return res;
  }

  if (!userId) return res;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!target) return res;

  res.cookies.set(cookieName, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 2, // 2 days
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: target.id,
    action: "START_IMPERSONATION",
    entityType: "User",
    entityId: target.id,
    beforeJson: { actingUserId: null },
    afterJson: { actingUserId: target.id, actingEmail: target.email },
  });

  return res;
}

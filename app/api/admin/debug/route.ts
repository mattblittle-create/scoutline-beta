import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ ok: true, loggedIn: false, user: null, admin: null });
  }

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { roles: true },
  });

  return NextResponse.json({
    ok: true,
    loggedIn: true,
    user: { id: user.id, email: user.email ?? null },
    admin: admin
      ? {
          id: admin.id,
          userId: admin.userId,
          isActive: admin.isActive,
          roles: admin.roles.map((r) => r.role),
        }
      : null,
  });
}

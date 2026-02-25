// app/api/admin/discount-applications/[id]/revoke/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });

  const id = String(params?.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const before = await prisma.discountApplication.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (before.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, error: "Only ACTIVE applications can be revoked." }, { status: 400 });
  }

  const updated = await prisma.discountApplication.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "DISCOUNT_REVOKE",
    entityType: "DiscountApplication",
    entityId: id,
    beforeJson: { id: before.id, status: before.status, revokedAt: before.revokedAt },
    afterJson: { id: updated.id, status: updated.status, revokedAt: updated.revokedAt },
  });

  return NextResponse.json({ ok: true });
}

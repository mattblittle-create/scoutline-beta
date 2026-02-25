// app/api/admin/discount-codes/[id]/toggle/route.ts
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

  const before = await prisma.discountCode.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const updated = await prisma.discountCode.update({
    where: { id },
    data: { isActive: !before.isActive },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "DISCOUNT_TOGGLE_ACTIVE",
    entityType: "DiscountCode",
    entityId: id,
    beforeJson: { id, isActive: before.isActive },
    afterJson: { id, isActive: updated.isActive },
  });

  return NextResponse.json({ ok: true });
}

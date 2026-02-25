import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const { admin, roles } = await requireAdmin({ redirectTo: "/staff" });
  if (!roles.includes("SCOUTLINE_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const id = String(ctx?.params?.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const prev = await prisma.featureFlag.findUnique({
    where: { id },
    select: { id: true, key: true, enabled: true, description: true, config: true },
  });
  if (!prev) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const updated = await prisma.featureFlag.update({
    where: { id },
    data: {
      enabled: !prev.enabled,
      updatedByAdminUserId: admin.id,
    },
    select: { id: true, key: true, enabled: true, description: true, config: true },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "TOGGLE_FEATURE_FLAG",
    entityType: "FeatureFlag",
    entityId: id,
    beforeJson: prev,
    afterJson: updated,
  });

  return NextResponse.json({ ok: true, data: { enabled: updated.enabled } });
}

// app/api/admin/feature-flags/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!ctx.roles.includes("SCOUTLINE_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const id = String(params?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.featureFlag.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await prisma.featureFlag.delete({
    where: { id },
  });

  await logAdminAction({
    adminUserId: ctx.admin.id,
    action: "DELETE_FEATURE_FLAG",
    entityType: "FeatureFlag",
    entityId: id,
    beforeJson: existing,
    afterJson: null,
  });

  return NextResponse.json({ ok: true });
}

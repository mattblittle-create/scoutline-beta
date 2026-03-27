import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidKey(key: string) {
  return /^[a-z][a-z0-9_-]{2,60}$/.test(key);
}

export async function POST(req: Request) {
  const { admin, roles } = await requireAdmin("/staff");
  if (!roles.includes("SCOUTLINE_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    description?: string | null;
    enabled?: boolean;
    config?: any;
  };

  const key = String(body.key ?? "").trim();
  if (!isValidKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid key format." }, { status: 400 });
  }

  const description = body.description ? String(body.description).trim() : null;
  const enabled = !!body.enabled;
  const config = body.config ?? null;

  try {
    const created = await prisma.featureFlag.create({
      data: {
        key,
        description,
        enabled,
        config,
        updatedByAdminUserId: admin.id,
      },
      select: { id: true, key: true, enabled: true, description: true, config: true },
    });

    await logAdminAction({
      adminUserId: admin.id,
      actingUserId: null,
      action: "CREATE_FEATURE_FLAG",
      entityType: "FeatureFlag",
      entityId: created.id,
      beforeJson: null,
      afterJson: created,
    });

    return NextResponse.json({ ok: true, data: created });
  } catch (e: any) {
    // likely unique constraint on key
    const msg = String(e?.message || "");
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ ok: false, error: "That key already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// app/api/admin/team/sponsor/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const secret = process.env.BILLING_ADMIN_SECRET || "";
    const headerSecret = req.headers.get("x-billing-admin-secret") || "";
    const body = await req.json().catch(() => ({}));

    const provided = String(body?.secret || headerSecret || "").trim();
    if (!secret || provided !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const teamSlug = String(body?.teamSlug || "").trim();
    if (!teamSlug) {
      return NextResponse.json({ ok: false, error: "Missing teamSlug" }, { status: 400 });
    }

    const billingModeRaw = String(body?.billingMode || "SPONSORED").trim().toUpperCase();
    const billingMode = billingModeRaw === "NORMAL" ? "NORMAL" : "SPONSORED";

    const sponsorName = body?.sponsorName != null ? String(body.sponsorName).trim() : null;
    const sponsorNote = body?.sponsorNote != null ? String(body.sponsorNote).trim() : null;

    const updated = await prisma.team.update({
      where: { slug: teamSlug },
      data: {
        billingMode,
        sponsorName: sponsorName && sponsorName.length ? sponsorName : null,
        sponsorNote: sponsorNote && sponsorNote.length ? sponsorNote : null,
      },
    });

    return NextResponse.json({
      ok: true,
      team: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        billingMode: updated.billingMode,
        sponsorName: updated.sponsorName,
        sponsorNote: updated.sponsorNote,
      },
    });
  } catch (err: any) {
    console.error("admin/team/sponsor error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

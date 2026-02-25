import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NOTE: This is intentionally a stub.
// Later, you’ll generate a Valor hosted payment page URL server-side.
// For now, we return a placeholder so UI flow is complete.

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamId = String(body?.teamId || "").trim();
    if (!teamId) return NextResponse.json({ ok: false, error: "Missing teamId" }, { status: 400 });

    // Ensure a billing profile exists (safe summary is stored here later)
    await prisma.teamBillingProfile.upsert({
      where: { teamId },
      update: {},
      create: { teamId, provider: "VALOR" },
    });

    // TODO: Replace this with real Valor URL creation
    const url = "/dashboard/team/billing?portal=todo";

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

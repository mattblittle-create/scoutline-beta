import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamId = String(body?.teamId || "").trim();
    if (!teamId) return NextResponse.json({ ok: false, error: "Missing teamId" }, { status: 400 });

    await prisma.discountApplication.updateMany({
      where: { targetType: "TEAM", targetId: teamId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

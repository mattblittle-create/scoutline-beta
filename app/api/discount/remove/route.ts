// app/api/discount/remove/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetType = String(body?.targetType || "").trim(); // TEAM | PLAYER
    const targetId = String(body?.targetId || "").trim();

    if (!targetType || !["TEAM", "PLAYER"].includes(targetType)) {
      return NextResponse.json({ ok: false, error: "Invalid targetType" }, { status: 400 });
    }
    if (!targetId) return NextResponse.json({ ok: false, error: "Missing targetId" }, { status: 400 });

    await prisma.discountApplication.updateMany({
      where: { targetType: targetType as any, targetId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

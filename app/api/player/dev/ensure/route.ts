// app/api/player/dev/ensure/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required." }, { status: 400 });
    }

    // Ensure User
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: null, role: "PLAYER" },
      select: { id: true, email: true },
    });

    // Ensure PlayerProfile (email unique)
    const profile = await prisma.playerProfile.upsert({
      where: { email },
      update: {
        user: { connect: { id: user.id } },
      },
      create: {
        email,
        user: { connect: { id: user.id } },
        schemaVersion: 1,
        data: {},
        playerPlanTier: "REDSHIRT",
        playerBillingCadence: "monthly",
      },
      select: { id: true, email: true },
    });

    // Ensure Player row (optional but nice for consistency)
    await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return NextResponse.json({ ok: true, playerProfileId: profile.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}

// app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("profile GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = (body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

    // Accept only whitelisted fields
    const data: any = {};
    const fields = [
      "name","role","program","workPhone","phonePrivate",
      "sport","division","conference","bio","preferredContact",
      "programWebsiteUrl","campsUrl","recruitingUrl","questionnaireUrl",
      "coachSocial","programSocial","positionNeeds","schoolMeta",
      "photoUrl",
    ];
    for (const k of fields) if (k in body) data[k] = body[k];

    const updated = await prisma.user.upsert({
      where: { email },
      update: data,
      create: { email, ...data },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err: any) {
    console.error("profile POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

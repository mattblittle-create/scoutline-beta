// app/api/account/photo/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLikelyUrl(s: string) {
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") && s.length <= 2048;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { email, photoUrl } = (await req.json()) as {
      email?: string;
      photoUrl?: string;
    };

    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    let finalPhoto: string | null = null;
    if (typeof photoUrl === "string" && photoUrl.trim()) {
      const candidate = photoUrl.trim();
      if (!isLikelyUrl(candidate)) {
        return NextResponse.json({ ok: false, error: "Invalid photo URL" }, { status: 400 });
      }
      finalPhoto = candidate;
    }

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { photoUrl: finalPhoto },
      create: { email: normalizedEmail, photoUrl: finalPhoto },
      select: { email: true, photoUrl: true },
    });

    return NextResponse.json({ ok: true, email: user.email, photoUrl: user.photoUrl ?? null });
  } catch (err: any) {
    console.error("photo POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, photoUrl: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    return NextResponse.json({ ok: true, email: user.email, photoUrl: user.photoUrl ?? null });
  } catch (err: any) {
    console.error("photo GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

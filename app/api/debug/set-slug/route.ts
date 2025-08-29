// app/api/debug/set-slug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, slug } = await req.json();
    if (!email || !slug) {
      return NextResponse.json(
        { ok: false, error: "email and slug are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { email: String(email).toLowerCase().trim() },
      data:  { slug:  String(slug).toLowerCase().trim() },
      select:{ id: true, email: true, slug: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err: any) {
    console.error("DEBUG set-slug error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

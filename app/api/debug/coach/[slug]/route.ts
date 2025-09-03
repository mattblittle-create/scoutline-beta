// app/api/debug/coach/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = (params?.slug || "").toLowerCase().trim();
    if (!slug) return NextResponse.json({ ok: false, error: "missing slug" });

    const user = await prisma.user.findUnique({
      where: { slug },
      // omit `role` to avoid enum/string mismatch
      select: {
        id: true,
        email: true,
        name: true,
        program: true,
        photoUrl: true,
        workPhone: true,
        phonePrivate: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// app/api/public/team/[slug]/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug." }, { status: 400 });
    }

    const mod = await import("@/lib/prisma").catch(() => null);
    const prisma: any = (mod as any)?.prisma ?? (mod as any)?.default ?? null;
    if (!prisma?.team?.findUnique) {
      return NextResponse.json({ ok: false, error: "Team model not available." }, { status: 500 });
    }

    const team: any = await prisma.team.findUnique({ where: { slug } });
    if (!team) {
      return NextResponse.json({ ok: false, error: "Team not found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        team: {
          id: team.id,
          slug: team.slug,
          name: team.name ?? null,
          city: team.city ?? null,
          state: team.state ?? null,
          websiteUrl: team.websiteUrl ?? null,
          logoUrl: team.logoUrl ?? null,

          contactEmail: team.contactEmail ?? null,
          phone: team.phone ?? null,
          phoneExt: team.phoneExt ?? null,
          phonePrivate: typeof team.phonePrivate === "boolean" ? team.phonePrivate : true,
          xUrl: team.xUrl ?? null,
          instagramUrl: team.instagramUrl ?? null,
        },
      },
    });
  } catch (err: any) {
    console.error("public team route error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

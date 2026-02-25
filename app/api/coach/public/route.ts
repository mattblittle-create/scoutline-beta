import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get("slug") || "").trim();

    if (!slug) {
      return NextResponse.json<Err>({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        role: true,
        email: true,
        workPhone: true,
        phonePrivate: true,
        photoUrl: true,

        coachProfile: {
          select: {
            recruitingTargets: true,
            coachBio: true, // ✅ requires CoachProfile.coachBio
          },
        },

        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            websiteUrl: true,
            programWebsiteUrl: true,
            division: true,
            conference: true,
            programBio: true, // ✅ requires College.programBio
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json<Err>({ ok: false, error: "Coach not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        coach: {
          id: user.id,
          slug: user.slug,
          name: user.name ?? null,
          role: user.role ?? null,
          email: user.email,
          phone: user.phonePrivate ? null : user.workPhone ?? null,
          phonePrivate: !!user.phonePrivate,
          photoUrl: user.photoUrl ?? null,
          coachBio: user.coachProfile?.coachBio ?? null,
          recruitingTargets: Array.isArray(user.coachProfile?.recruitingTargets)
            ? user.coachProfile?.recruitingTargets
            : [],
        },
        program: {
          collegeId: user.college?.id ?? null,
          collegeName: user.college?.name ?? null,
          collegeSlug: user.college?.slug ?? null,
          logoUrl: user.college?.logoUrl ?? null,
          websiteUrl: user.college?.websiteUrl ?? null,
          programWebsiteUrl: user.college?.programWebsiteUrl ?? null,
          division: user.college?.division ?? null,
          conference: user.college?.conference ?? null,
          programBio: user.college?.programBio ?? null,
        },
      },
    });
  } catch (e: any) {
    console.error("GET /api/coach/public error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

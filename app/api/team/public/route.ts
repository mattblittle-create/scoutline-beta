// app/api/team/public/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function safeText(v: any) {
  return String(v ?? "").trim();
}

function safeUrl(v: any) {
  const s = safeText(v);
  if (!s) return null;
  // Allow http(s) only
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = safeText(url.searchParams.get("slug")).toLowerCase();

  if (!slug) return jsonError("Missing slug.", 400);

  try {
    const team = await prisma.team.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        teamType: true,
        city: true,
        state: true,
        websiteUrl: true,
        logoUrl: true,

        contactEmail: true,
        phone: true,
        phoneExt: true,
        phonePrivate: true,

        xUrl: true,
        instagramUrl: true,

        billingStatus: true,
        cancelEffectiveAt: true,
      },
    });

    if (!team) return jsonError("Team not found.", 404);

    // ✅ Use the TEAM_ADMIN user's phonePrivate (matches "Hide my admin phone..." checkbox)
    // If no TEAM_ADMIN found, fall back to team.phonePrivate.
    const admin = await prisma.teamMembership.findFirst({
      where: {
        teamId: team.id,
        role: "TEAM_ADMIN",
        isActive: true,
      },
      select: {
        user: {
          select: {
            email: true,
            phonePrivate: true,
          },
        },
      },
    });

    const adminEmail = safeText(admin?.user?.email) || null;
    const adminPhonePrivate =
      typeof admin?.user?.phonePrivate === "boolean" ? admin!.user!.phonePrivate : null;

    const effectivePhonePrivate =
      adminPhonePrivate !== null
        ? adminPhonePrivate
        : typeof team.phonePrivate === "boolean"
          ? team.phonePrivate
          : true;

    // ✅ Email should NOT be hidden just because phone is private.
    // Fallback to TEAM_ADMIN email if contactEmail is blank.
    const effectiveContactEmail = safeText(team.contactEmail) || adminEmail || null;

    // Public roster = active PLAYER memberships
    const members = await prisma.teamMembership.findMany({
      where: {
        teamId: team.id,
        role: "PLAYER",
        isActive: true,
        playerProfileId: { not: null },
      },
      select: {
        id: true,
        playerProfile: {
          select: {
            id: true,
            email: true,
            data: true,
            user: {
              select: {
                slug: true,
                photoUrl: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const roster = (members || [])
      .map((m) => {
        const pp = m.playerProfile;
        if (!pp) return null;

        const userSlug = pp.user?.slug ?? null;
        if (!userSlug) return null;

        const atomic = (pp.data || {}) as any;

        const firstName = safeText(atomic?.firstName);
        const lastName = safeText(atomic?.lastName);

        const gradYear = atomic?.gradYear ?? null;
        const primaryPos = safeText(atomic?.primaryPos) || null;
        const secondaryPos = safeText(atomic?.secondaryPos) || null;

        const committed = Boolean(atomic?.committed);
        const committedCollege = safeText(atomic?.committedCollege) || null;

        const photoUrl = pp.user?.photoUrl ?? (safeText(atomic?.photoUrl) || null);

        return {
          playerProfileId: pp.id,
          publicSlug: userSlug,
          firstName,
          lastName,
          gradYear,
          primaryPos,
          secondaryPos,
          committed,
          committedCollege,
          photoUrl,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          teamType: team.teamType,
          city: team.city,
          state: team.state,
          websiteUrl: safeUrl(team.websiteUrl),
          logoUrl: safeText(team.logoUrl) || null,
          xUrl: safeUrl(team.xUrl),
          instagramUrl: safeUrl(team.instagramUrl),

          // ✅ expose privacy flag so UI can show correct tooltips
          phonePrivate: effectivePhonePrivate,

          // ✅ Email is always allowed (fallback applied)
          contactEmail: effectiveContactEmail,

          // ✅ Phone respects admin privacy checkbox
          phone: effectivePhonePrivate ? null : safeText(team.phone) || null,
          phoneExt: effectivePhonePrivate ? null : safeText(team.phoneExt) || null,
        },
        roster,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to load team profile.", 500);
  }
}

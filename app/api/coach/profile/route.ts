// app/api/coach/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function normalizeRecruitingTargets(input: any) {
  if (!Array.isArray(input)) return [];

  const cleaned = input
    .map((x) => {
      const gradYear = Number(x?.gradYear);
      const positions = Array.isArray(x?.positions)
        ? x.positions.map((p: any) => String(p || "").trim()).filter(Boolean)
        : [];
      if (!Number.isFinite(gradYear) || gradYear < 1900 || gradYear > 3000) return null;

      const uniq = Array.from(new Set(positions));
      return { gradYear, positions: uniq };
    })
    .filter(Boolean) as Array<{ gradYear: number; positions: string[] }>;

  const byYear = new Map<number, Set<string>>();
  for (const row of cleaned) {
    if (!byYear.has(row.gradYear)) byYear.set(row.gradYear, new Set<string>());
    const set = byYear.get(row.gradYear)!;
    row.positions.forEach((p) => set.add(p));
  }

  return Array.from(byYear.entries())
    .map(([gradYear, set]) => ({ gradYear, positions: Array.from(set) }))
    .sort((a, b) => a.gradYear - b.gradYear);
}

function normalizeSlugBase(input: string) {
  return (
    String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "coach"
  );
}

async function ensureUserSlug(user: { id: string; slug: string | null; name: string | null; email: string }) {
  if (user.slug) return user.slug;

  const base = normalizeSlugBase(user.name || user.email.split("@")[0] || "coach");

  let candidate = base;
  let n = 2;

  while (true) {
    const taken = await prisma.user.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) break;
    candidate = `${base}-${n++}`;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { slug: candidate },
  });

  return candidate;
}

async function safeList<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (e: any) {
    console.warn(`[coach profile enrichment skipped] ${label}:`, e?.message || e);
    return [];
  }
}

async function safeOne<T>(label: string, fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    console.warn(`[coach profile enrichment skipped] ${label}:`, e?.message || e);
    return null;
  }
}

function getDelegate(name: string) {
  return (prisma as any)?.[name] || null;
}

function toIso(value: any) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser?.id) {
      return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        slug: true,
        name: true,
        role: true, // NOTE: system role, not the title preset
        email: true,
        workPhone: true,
        workPhoneExt: true,
        phonePrivate: true,
        photoUrl: true,
        collegeId: true,
        college: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            websiteUrl: true,
            programWebsiteUrl: true,
            division: true,
            conference: true,
            programBio: true,

            // ✅ NEW
            recruitingQuestionnaireUrl: true,
            programXUrl: true,
            programInstagramUrl: true,

            // audit
            programProfileUpdatedAt: true,
            programProfileUpdatedByUser: { select: { id: true, name: true, email: true } },
          },
        },
        coachProfile: {
          select: {
            recruitingTargets: true,
            coachBio: true,

            // ✅ NEW (coach-facing)
            staffTitle: true,
            contactEmail: true,
            coachXUrl: true,
            coachInstagramUrl: true,

            isProgramAdmin: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json<Err>({ ok: false, error: "User not found" }, { status: 404 });
    }

    const ensuredSlug = await ensureUserSlug({
      id: user.id,
      slug: user.slug ?? null,
      name: user.name ?? null,
      email: user.email,
    });

    const targets = normalizeRecruitingTargets(user.coachProfile?.recruitingTargets);

        const collegeId = user.collegeId ?? null;

    const allCoachContacts = collegeId
      ? await safeList("coachContacts", async () =>
          prisma.user.findMany({
            where: {
              collegeId,
              coachProfile: { isNot: null },
            },
            select: {
              id: true,
              name: true,
              email: true,
              workPhone: true,
              workPhoneExt: true,
              phonePrivate: true,
              photoUrl: true,
              coachProfile: {
                select: {
                  staffTitle: true,
                  contactEmail: true,
                  coachBio: true,
                  coachXUrl: true,
                  coachInstagramUrl: true,
                  isProgramAdmin: true,
                },
              },
            },
            orderBy: [{ name: "asc" }],
          })
        )
      : [];

    const recruitingCoordinator =
      allCoachContacts.find((c: any) => c.coachProfile?.staffTitle === "Recruiting Coordinator") ||
      allCoachContacts.find((c: any) => c.coachProfile?.staffTitle === "Recruiting Staff") ||
      null;

    const academicAreasDelegate =
      getDelegate("collegeAcademicArea") ||
      getDelegate("academicArea") ||
      getDelegate("collegeMajor") ||
      getDelegate("academicProfile");

    const academicAreas = collegeId && academicAreasDelegate
      ? await safeList("academicAreas", async () =>
          academicAreasDelegate.findMany({
            where: { collegeId },
            orderBy: [{ name: "asc" }],
            take: 100,
          })
        )
      : [];

    const nilProfileDelegate =
      getDelegate("collegeNilProfile") ||
      getDelegate("nilProfile") ||
      getDelegate("collegeNILProfile");

    const nilProfile = collegeId && nilProfileDelegate
      ? await safeOne("nilProfile", async () =>
          nilProfileDelegate.findFirst({
            where: { collegeId },
            orderBy: [{ updatedAt: "desc" }],
          })
        )
      : null;

    const rosterNeedsDelegate =
      getDelegate("baseballRosterNeed") ||
      getDelegate("programRosterNeed") ||
      getDelegate("rosterNeed");

    const rosterNeeds = collegeId && rosterNeedsDelegate
      ? await safeList("rosterNeeds", async () =>
          rosterNeedsDelegate.findMany({
            where: { collegeId },
            orderBy: [{ gradYear: "asc" }],
            take: 100,
          })
        )
      : [];

    const metricBenchmarksDelegate =
      getDelegate("baseballMetricBenchmark") ||
      getDelegate("programMetricBenchmark") ||
      getDelegate("metricBenchmark");

    const metricBenchmarks = collegeId && metricBenchmarksDelegate
      ? await safeList("metricBenchmarks", async () =>
          metricBenchmarksDelegate.findMany({
            where: { collegeId },
            orderBy: [{ positionGroup: "asc" }, { metricKey: "asc" }],
            take: 100,
          })
        )
      : [];

    return NextResponse.json({
      ok: true,
      data: {
        coach: {
          id: user.id,
          slug: ensuredSlug,
          name: user.name ?? null,

          // ✅ use CoachProfile.staffTitle for the preset title dropdown
          role: (user.coachProfile?.staffTitle ?? null) as any,

          email: user.email,
          workPhone: user.workPhone ?? null,
          workPhoneExt: user.workPhoneExt ?? null,
          phonePrivate: !!user.phonePrivate,
          photoUrl: user.photoUrl ?? null,
          coachBio: user.coachProfile?.coachBio ?? null,
          recruitingTargets: targets,

          // ✅ NEW
          contactEmail: user.coachProfile?.contactEmail ?? null,
          coachXUrl: user.coachProfile?.coachXUrl ?? null,
          coachInstagramUrl: user.coachProfile?.coachInstagramUrl ?? null,
          isProgramAdmin: !!user.coachProfile?.isProgramAdmin,
        },
        program: {
          collegeId: user.collegeId ?? null,
          collegeName: user.college?.name ?? null,
          logoUrl: user.college?.logoUrl ?? null,
          websiteUrl: user.college?.websiteUrl ?? null,
          programWebsiteUrl: user.college?.programWebsiteUrl ?? null,
          division: user.college?.division ?? null,
          conference: user.college?.conference ?? null,
          programBio: user.college?.programBio ?? null,

          // ✅ NEW
          recruitingQuestionnaireUrl: user.college?.recruitingQuestionnaireUrl ?? null,
          programXUrl: user.college?.programXUrl ?? null,
          programInstagramUrl: user.college?.programInstagramUrl ?? null,

          lastEditedAt: user.college?.programProfileUpdatedAt ? user.college.programProfileUpdatedAt.toISOString() : null,
          lastEditedBy: user.college?.programProfileUpdatedByUser
            ? {
                id: user.college.programProfileUpdatedByUser.id,
                name: user.college.programProfileUpdatedByUser.name ?? null,
                email: user.college.programProfileUpdatedByUser.email,
              }
            : null,
                      verifiedStatus: user.college?.programProfileUpdatedAt ? "VERIFIED" : "UNVERIFIED",
          lastVerifiedAt: user.college?.programProfileUpdatedAt ? user.college.programProfileUpdatedAt.toISOString() : null,
          lastVerifiedBy: user.college?.programProfileUpdatedByUser
            ? {
                id: user.college.programProfileUpdatedByUser.id,
                name: user.college.programProfileUpdatedByUser.name ?? null,
                email: user.college.programProfileUpdatedByUser.email,
              }
            : null,

          recruitingCoordinator: recruitingCoordinator
            ? {
                id: recruitingCoordinator.id,
                name: recruitingCoordinator.name ?? null,
                email: recruitingCoordinator.email,
                contactEmail: recruitingCoordinator.coachProfile?.contactEmail ?? null,
                title: recruitingCoordinator.coachProfile?.staffTitle ?? null,
                photoUrl: recruitingCoordinator.photoUrl ?? null,
                bio: recruitingCoordinator.coachProfile?.coachBio ?? null,
                coachXUrl: recruitingCoordinator.coachProfile?.coachXUrl ?? null,
                coachInstagramUrl: recruitingCoordinator.coachProfile?.coachInstagramUrl ?? null,
              }
            : null,

          coachContacts: allCoachContacts.map((c: any) => ({
            id: c.id,
            name: c.name ?? null,
            email: c.email,
            contactEmail: c.coachProfile?.contactEmail ?? null,
            title: c.coachProfile?.staffTitle ?? null,
            photoUrl: c.photoUrl ?? null,
            bio: c.coachProfile?.coachBio ?? null,
            coachXUrl: c.coachProfile?.coachXUrl ?? null,
            coachInstagramUrl: c.coachProfile?.coachInstagramUrl ?? null,
            isProgramAdmin: !!c.coachProfile?.isProgramAdmin,
          })),

          academicAreas: academicAreas.map((a: any) => ({
            id: String(a.id ?? a.name ?? a.major ?? a.area ?? crypto.randomUUID()),
            name: a.name ?? a.major ?? a.area ?? a.title ?? null,
            category: a.category ?? a.areaType ?? null,
            verified: !!(a.verified ?? a.isVerified ?? true),
          })),

          nilProfile: nilProfile
            ? {
                strengthTier: (nilProfile as any).strengthTier ?? (nilProfile as any).nilStrengthTier ?? null,
                collectiveName: (nilProfile as any).collectiveName ?? null,
                estimatedValue: (nilProfile as any).estimatedValue ?? (nilProfile as any).estimatedAnnualValue ?? null,
                baseballAllocationPercent:
                  (nilProfile as any).baseballAllocationPercent ??
                  (nilProfile as any).baseballAllocationPct ??
                  null,
                updatedAt: toIso((nilProfile as any).updatedAt ?? (nilProfile as any).asOfDate),
              }
            : null,

          rosterNeeds: rosterNeeds.map((r: any) => ({
            id: String(r.id ?? `${r.gradYear}-${r.position}`),
            gradYear: r.gradYear ?? r.classYear ?? null,
            position: r.position ?? r.positionCode ?? null,
            priority: r.priority ?? r.needLevel ?? null,
            notes: r.notes ?? null,
          })),

          metricBenchmarks: metricBenchmarks.map((m: any) => ({
            id: String(m.id ?? `${m.positionGroup}-${m.metricKey}`),
            positionGroup: m.positionGroup ?? m.group ?? null,
            metricKey: m.metricKey ?? m.metric ?? null,
            label: m.label ?? m.metricLabel ?? m.metricKey ?? null,
            value: m.value ?? m.benchmarkValue ?? m.minValue ?? null,
            unit: m.unit ?? null,
            sourceLevel: m.sourceLevel ?? null,
            confidence: m.confidence ?? null,
          })),
        },
      },
    });
  } catch (e: any) {
    console.error("GET /api/coach/profile error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser?.id) {
      return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const coach = body?.coach || {};
    const program = body?.program || {};

    const name = String(coach?.name || "").trim();
    const staffTitle = String(coach?.role || "").trim(); // this is the preset title string

    const workPhoneRaw = String(coach?.workPhone ?? "").trim();
    const workPhone = digitsOnly(workPhoneRaw).slice(0, 10);

    const workPhoneExtRaw = String(coach?.workPhoneExt ?? "").trim();
    const workPhoneExt = digitsOnly(workPhoneExtRaw).slice(0, 6);

    const phonePrivate = !!coach?.phonePrivate;
    const photoUrl = String(coach?.photoUrl || "").trim();

    const coachBio = String(coach?.coachBio || "").trim();
    const recruitingTargets = normalizeRecruitingTargets(coach?.recruitingTargets);

    // ✅ NEW
    const contactEmail = String(coach?.contactEmail || "").trim().toLowerCase();
    const coachXUrl = String(coach?.coachXUrl || "").trim();
    const coachInstagramUrl = String(coach?.coachInstagramUrl || "").trim();

    const programBio = String(program?.programBio || "").trim();

    // ✅ NEW
    const recruitingQuestionnaireUrl = String(program?.recruitingQuestionnaireUrl || "").trim();
    const programXUrl = String(program?.programXUrl || "").trim();
    const programInstagramUrl = String(program?.programInstagramUrl || "").trim();

    if (!name) return NextResponse.json<Err>({ ok: false, error: "Coach name is required." }, { status: 400 });
    if (!staffTitle) return NextResponse.json<Err>({ ok: false, error: "Coach role is required." }, { status: 400 });
    if (!workPhone) return NextResponse.json<Err>({ ok: false, error: "Coach phone is required." }, { status: 400 });

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name,
        workPhone,
        workPhoneExt: workPhoneExt || null,
        phonePrivate,
        photoUrl: photoUrl || null,
      },
    });

    await prisma.coachProfile.upsert({
      where: { userId: sessionUser.id },
      create: {
        userId: sessionUser.id,
        staffTitle,
        recruitingTargets,
        coachBio: coachBio || null,

        contactEmail: contactEmail || null,
        coachXUrl: coachXUrl || null,
        coachInstagramUrl: coachInstagramUrl || null,
      },
      update: {
        staffTitle,
        recruitingTargets,
        coachBio: coachBio || null,

        contactEmail: contactEmail || null,
        coachXUrl: coachXUrl || null,
        coachInstagramUrl: coachInstagramUrl || null,
      },
    });

    const fresh = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { collegeId: true },
    });

    if (!fresh?.collegeId) {
      return NextResponse.json<Err>({ ok: false, error: "Your coach account is not linked to a college yet." }, { status: 400 });
    }

    await prisma.college.update({
      where: { id: fresh.collegeId },
      data: {
        logoUrl: String(program?.logoUrl || "").trim() || null,
        websiteUrl: String(program?.websiteUrl || "").trim() || null,
        programWebsiteUrl: String(program?.programWebsiteUrl || "").trim() || null,
        division: String(program?.division || "").trim() || null,
        conference: String(program?.conference || "").trim() || null,
        programBio: programBio || null,

        // ✅ NEW
        recruitingQuestionnaireUrl: recruitingQuestionnaireUrl || null,
        programXUrl: programXUrl || null,
        programInstagramUrl: programInstagramUrl || null,

        // audit
        programProfileUpdatedAt: new Date(),
        programProfileUpdatedByUserId: sessionUser.id,
      },
    });

    return GET();
  } catch (e: any) {
    console.error("PUT /api/coach/profile error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

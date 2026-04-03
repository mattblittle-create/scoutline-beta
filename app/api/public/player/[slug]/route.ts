// app/api/public/player/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * NOTE:
 * Vercel build failed because "@/lib/types/player" was missing.
 * Keep this route self-contained so deploys never break on type-path issues.
 */
type PlanTier = "Redshirt" | "Walk-On" | "All-American" | "Teams";
type AtomicProfile = any;

type VideoSocialPayload = {
  externalVideos?: Array<{
    id: string;
    title?: string;
    url: string;
    source?: string;
    addedAt?: number;
  }>;
  localVideos?: Array<{
    id: string;
    title?: string;
    publicUrl: string;
    fileType?: string;
    fileSize?: number;
    addedAt?: number;
  }>;
  social?: any;
  primary?: any;
};

type PublicPayload = {
  profile?: any;
  metrics?: any;
  stats?: any;
  demoMode?: "global" | "allowlist" | "query" | null;
  planTier?: PlanTier;
  debug?: any;
};

function planToTier(plan: any): PlanTier {
  const p = String(plan || "").toUpperCase();
  if (p === "RED_SHIRT" || p === "REDSHIRT") return "Redshirt";
  if (p === "WALK_ON" || p === "WALK-ON" || p === "WALKON") return "Walk-On";
  if (p === "ALL_AMERICAN" || p === "ALL-AMERICAN" || p === "ALLAMERICAN") return "All-American";
  return "Teams";
}

const toArr = <T = any>(x: any): T[] => (Array.isArray(x) ? x.filter(Boolean) : x ? [x] : []);
const str = (x: any) => (x == null ? "" : String(x));
const mapDoc = (d: any) =>
  typeof d === "string" ? { label: null, url: d } : { label: d?.label ?? d?.name ?? null, url: d?.url ?? null };

const coerceId = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  return null;
};

const hasMeaningfulValue = (v: any) => {
  if (v === null || v === undefined || v === "") return false;
  if (typeof v === "number" && Number.isNaN(v)) return false;
  return true; // 0 and "0" count as meaningful
};

const pruneEmptyStatsMap = (m: any) => {
  if (!m || typeof m !== "object") return null;
  const vals = Object.values(m);
  if (vals.length === 0) return null;
  return vals.some(hasMeaningfulValue) ? m : null;
};

const pruneSeasonStats = (s: any) => {
  if (!s || typeof s !== "object") return s;

  const flat = {
    hitting: pruneEmptyStatsMap(s.hitting),
    fielding: pruneEmptyStatsMap(s.fielding),
    catching: pruneEmptyStatsMap(s.catching),
    pitching: pruneEmptyStatsMap(s.pitching),
  };

  const nestedStats =
    s.stats && typeof s.stats === "object"
      ? {
          ...s.stats,
          hitting: pruneEmptyStatsMap(s.stats.hitting),
          fielding: pruneEmptyStatsMap(s.stats.fielding),
          catching: pruneEmptyStatsMap(s.stats.catching),
          pitching: pruneEmptyStatsMap(s.stats.pitching),
        }
      : s.stats;

  return {
    ...s,
    ...flat,
    stats: nestedStats,
  };
};

const pickFirstId = (
  ...vals: unknown[]
): {
  value: string | null;
  trace: Array<{ path: string; raw: unknown; coerced: string | null }>;
} => {
  const values = vals as any[];
  const outTrace: Array<{ path: string; raw: unknown; coerced: string | null }> = [];
  let resolved: string | null = null;

  for (const it of values) {
    if (Array.isArray(it) && it.length === 2) {
      const [path, val] = it;
      const coerced = coerceId(val);
      outTrace.push({ path: String(path), raw: val, coerced });
      if (!resolved && coerced) resolved = coerced;
    } else {
      const coerced = coerceId(it);
      outTrace.push({ path: "(unlabeled)", raw: it, coerced });
      if (!resolved && coerced) resolved = coerced;
    }
  }
  return { value: resolved, trace: outTrace };
};

const mkId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const skipCache = debug || url.searchParams.get("fresh") === "1" || url.searchParams.get("nocache") === "1";

  const slug = String(params.slug || "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  try {
    // 1) Cached payload (fast path)
    if (!skipCache) {
      try {
        const cached = await prisma.publicProfileCache.findUnique({
          where: { slug },
          select: { data: true },
        });

        const cdata = cached?.data as any;

        if (cdata?.profile) {
          const patched: any = { ...cdata };

          // ✅ default plan/status
          patched.planTier = patched.planTier ?? patched.profile?.planTier ?? "Teams";
          patched.profile.planTier = patched.profile.planTier ?? patched.planTier;

          patched.profile.status = patched.profile.status ?? patched.profile.activityStatus ?? "Active";
          patched.profile.activityStatus = patched.profile.activityStatus ?? patched.profile.status;

          // ✅ coach compatibility
          if (Array.isArray(patched.profile.coaches)) {
            patched.profile.coaches = patched.profile.coaches.map((c: any) => {
              const teamVal = c?.team ?? c?.teamOrOrg ?? null;
              return { ...c, team: teamVal, teamOrOrg: teamVal };
            });
            patched.profile.references = patched.profile.coaches;
            patched.profile.coachesReferences = patched.profile.coaches;
          }

          // ✅ local videos compatibility
          if (patched.profile?.videoSocial) {
            const vs = patched.profile.videoSocial;
            if (Array.isArray(vs.localVideos)) {
              vs.localVideos = vs.localVideos
                .map((v: any) => {
                  const publicUrl =
                    typeof v?.publicUrl === "string"
                      ? v.publicUrl.trim()
                      : typeof v?.url === "string"
                      ? v.url.trim()
                      : "";
                  if (!publicUrl) return null;

                  return {
                    ...v,
                    id: typeof v?.id === "string" && v.id.trim() ? v.id.trim() : mkId("loc"),
                    title:
                      typeof v?.title === "string"
                        ? v.title.trim()
                        : typeof v?.label === "string"
                        ? v.label.trim()
                        : v?.title,
                    publicUrl,
                  };
                })
                .filter(Boolean);
            }
          }

          // ✅ Ensure playerProfileId exists for coach-only tools
          if (!patched.profile?.playerProfileId) {
            try {
              const u2 = await prisma.user.findUnique({
                where: { slug },
                select: { email: true },
              });

              if (u2?.email) {
                const pr2 = await prisma.playerProfile.findUnique({
                  where: { email: u2.email.toLowerCase() },
                  select: { id: true },
                });
                patched.profile.playerProfileId = pr2?.id ?? null;
              } else {
                patched.profile.playerProfileId = null;
              }
            } catch {
              patched.profile.playerProfileId = null;
            }
          }

          return NextResponse.json({ ok: true, data: patched as PublicPayload });
        }
      } catch {
        // ignore cache errors
      }
    }

    // 2) Build from relational tables
    const user = await prisma.user.findUnique({
      where: { slug },
      select: { id: true, email: true, photoUrl: true },
    });

    if (user?.email) {
      const player = await prisma.player.findUnique({
        where: { userId: user.id },
        select: { publicEnabled: true, plan: true },
      });

      const row = await prisma.playerProfile.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true, data: true },
      });

      const atomic = (row?.data || {}) as AtomicProfile;

      // ----- Video / Social normalization -----
      const vs = (atomic as any).videoSocial ?? {};

      const rawExternal = Array.isArray(vs.externalVideos)
        ? vs.externalVideos
        : Array.isArray((atomic as any).externalVideos)
        ? (atomic as any).externalVideos
        : [];

      const rawLocal = Array.isArray(vs.localVideos)
        ? vs.localVideos
        : Array.isArray((atomic as any).localVideos)
        ? (atomic as any).localVideos
        : [];

      const videoSocial: VideoSocialPayload = {
        externalVideos: rawExternal
          .map((v: any) => {
            const url = typeof v?.url === "string" ? v.url.trim() : "";
            if (!url) return null;

            return {
              id: typeof v?.id === "string" && v.id.trim() ? v.id.trim() : mkId("ext"),
              title: typeof v?.title === "string" ? v.title.trim() : undefined,
              url,
              source:
                typeof v?.source === "string"
                  ? v.source
                  : typeof v?.provider === "string"
                  ? v.provider
                  : "unknown",
              addedAt: Number.isFinite(Number(v?.addedAt)) ? Number(v.addedAt) : Date.now(),
            };
          })
          .filter(Boolean) as any,

        localVideos: rawLocal
          .map((v: any) => {
            const publicUrl =
              typeof v?.publicUrl === "string"
                ? v.publicUrl.trim()
                : typeof v?.url === "string"
                ? v.url.trim()
                : "";

            if (!publicUrl) return null;

return {
  id: typeof v?.id === "string" && v.id.trim() ? v.id.trim() : mkId("loc"),
  title:
    typeof v?.title === "string"
      ? v.title.trim()
      : typeof v?.label === "string"
      ? v.label.trim()
      : undefined,
  publicUrl,
  fileType:
    typeof v?.fileType === "string"
      ? v.fileType.trim()
      : typeof v?.type === "string"
      ? v.type
      : "",
  fileSize: Number.isFinite(Number(v?.fileSize))
    ? Number(v.fileSize)
    : Number.isFinite(Number(v?.size))
    ? Number(v.size)
    : 0,
  addedAt: Number.isFinite(Number(v?.addedAt)) ? Number(v.addedAt) : Date.now(),

  // ✅ ADD THIS LINE
  category:
    v?.category === "Hitting" ||
    v?.category === "Fielding" ||
    v?.category === "Pitching" ||
    v?.category === "Baserunning"
      ? v.category
      : null,
};
          })
          .filter(Boolean) as any,

        social: (vs.social ?? (atomic as any).social ?? {}) as any,
        primary: (vs.primary ?? (atomic as any).primary ?? null) as any,
      };

      // ----- Teams (Athletics) -----
      const teams = [
        ...((atomic as any).hsName || (atomic as any).hsScheduleUrl || (atomic as any).hsWebsiteUrl
          ? [
              {
                kind: "High School" as const,
                name: (atomic as any).hsName ?? null,
                statsTeamName: (atomic as any).hsName ?? null,
                statsSeason: null,
                statsYear: null,
                city: (atomic as any).hsCity ?? null,
                state: (atomic as any).hsState ?? null,
                scheduleUrl: (atomic as any).hsScheduleUrl ?? null,
                websiteUrl: (atomic as any).hsWebsiteUrl ?? null,
              },
            ]
          : []),

        ...((atomic as any).travelTeamName || (atomic as any).travelTeamScheduleUrl || (atomic as any).travelTeamWebsiteUrl
          ? [
              {
                kind: "Travel" as const,
                name: (atomic as any).travelTeamName ?? null,
                statsTeamName: (atomic as any).travelTeamName ?? null,
                statsSeason: null,
                statsYear: null,
                city: (atomic as any).travelTeamCity ?? null,
                state: (atomic as any).travelTeamState ?? null,
                scheduleUrl: (atomic as any).travelTeamScheduleUrl ?? null,
                websiteUrl: (atomic as any).travelTeamWebsiteUrl ?? null,
              },
            ]
          : []),

        ...(Array.isArray((atomic as any).otherTeams)
          ? (atomic as any).otherTeams.map((t: any) => {
              const kind =
                t?.kind === "High School" || t?.kind === "Travel" || t?.kind === "Other"
                  ? (t?.kind as "High School" | "Travel" | "Other")
                  : ("Other" as const);

              const name = t?.name ?? null;

              return {
                kind,
                name,
                statsTeamName: name,
                statsSeason: t?.statsSeason ?? null,
                statsYear: t?.statsYear ?? null,
                city: t?.city ?? null,
                state: t?.state ?? null,
                scheduleUrl: t?.scheduleUrl ?? null,
                websiteUrl: t?.websiteUrl ?? null,
              };
            })
          : []),
      ].filter(Boolean);

      // ----- Academics normalization -----
      const ac = (atomic as any).academics ?? {};
      const sel = ac.selectedDocs ?? {};

      const majorsArray = Array.isArray(ac.areasOfStudy)
        ? ac.areasOfStudy
        : Array.isArray((atomic as any).areasOfStudy)
        ? (atomic as any).areasOfStudy
        : str(
            ac.areasOfStudyInput ??
              (atomic as any).areasOfStudyInput ??
              ac.intendedMajors ??
              (atomic as any).intendedMajors ??
              ac.academicMajors ??
              (atomic as any).academicMajors ??
              ac.majors ??
              (atomic as any).majors ??
              ""
          )
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const transcriptUrls = [
        ...toArr(ac.transcripts),
        ...toArr(ac.transcriptUrls),
        ...toArr(ac.transcriptUrl),
        ...toArr(sel.transcriptUrl),
        ...toArr((atomic as any).transcripts),
        ...toArr((atomic as any).transcriptUrls),
        ...toArr((atomic as any).transcriptUrl),
      ]
        .map(str)
        .filter(Boolean);

      const reportCardUrls = [
        ...toArr(ac.reportCards),
        ...toArr(ac.reportCardUrls),
        ...toArr(ac.reportCardUrl),
        ...toArr(sel.reportCardUrl),
        ...toArr(sel.reportCardTranscriptUrl),
        ...toArr((atomic as any).reportCards),
        ...toArr((atomic as any).reportCardUrls),
        ...toArr((atomic as any).reportCardUrl),
      ]
        .map(str)
        .filter(Boolean);

      const otherAcademicDocs = [
        ...toArr(ac.otherAcademicDocs),
        ...toArr(ac.additionalDocs),
        ...toArr(sel.additionalDocs),
        ...toArr((atomic as any).otherAcademicDocs),
        ...toArr((atomic as any).additionalAcademicDocs),
      ]
        .map(mapDoc)
        .filter((d) => !!d.url);

      // ----- IDs with trace -----
      const athleticsNS = (atomic as any).athletics ?? {};
      const eligibilityNS = (atomic as any).eligibility ?? {};
      const academicsNS = (atomic as any).academics ?? {};

      const ncaaScan = pickFirstId(
        ["atomic.ncaaId", (atomic as any).ncaaId],
        ["atomic.NCAAId", (atomic as any).NCAAId],
        ["atomic.ncaaID", (atomic as any).ncaaID],
        ["atomic.ncaaEligibilityId", (atomic as any).ncaaEligibilityId],
        ["atomic.ncaaEligibilityCenterId", (atomic as any).ncaaEligibilityCenterId],

        ["athletics.ncaaId", athleticsNS?.ncaaId],
        ["athletics.NCAAId", athleticsNS?.NCAAId],
        ["athletics.ncaaEligibilityId", athleticsNS?.ncaaEligibilityId],
        ["athletics.ncaaEligibilityCenterId", athleticsNS?.ncaaEligibilityCenterId],

        ["athletics.eligibility.ncaaId", (athleticsNS as any)?.eligibility?.ncaaId],
        ["athletics.eligibility.NCAAId", (athleticsNS as any)?.eligibility?.NCAAId],

        ["eligibility.ncaaId", eligibilityNS?.ncaaId],
        ["eligibility.NCAAId", eligibilityNS?.NCAAId],

        ["academics.ncaaId", academicsNS?.ncaaId],
        ["academics.NCAAId", academicsNS?.NCAAId]
      );

      const naiaScan = pickFirstId(
        ["atomic.naiaEcid", (atomic as any).naiaEcid],
        ["atomic.naiaEcId", (atomic as any).naiaEcId],
        ["atomic.NAIAEcid", (atomic as any).NAIAEcid],
        ["atomic.naiaId", (atomic as any).naiaId],
        ["atomic.ecid", (atomic as any).ecid],

        ["athletics.naiaEcid", athleticsNS?.naiaEcid],
        ["athletics.naiaEcId", athleticsNS?.naiaEcId],
        ["athletics.NAIAEcid", athleticsNS?.NAIAEcid],
        ["athletics.naiaId", athleticsNS?.naiaId],
        ["athletics.ecid", (athleticsNS as any)?.ecid],

        ["eligibility.naiaEcid", eligibilityNS?.naiaEcid],
        ["eligibility.naiaEcId", eligibilityNS?.naiaEcId],
        ["eligibility.NAIAEcid", eligibilityNS?.NAIAEcid],
        ["eligibility.naiaId", eligibilityNS?.naiaId],
        ["eligibility.ecid", (eligibilityNS as any)?.ecid],

        ["academics.naiaEcid", academicsNS?.naiaEcid],
        ["academics.naiaEcId", academicsNS?.naiaEcId],
        ["academics.NAIAEcid", academicsNS?.NAIAEcid],
        ["academics.naiaId", academicsNS?.naiaId],
        ["academics.ecid", (academicsNS as any)?.ecid]
      );

      const computedPlanTier: PlanTier =
        ((atomic as any).planTier as PlanTier) ?? (player?.plan ? planToTier(player.plan) : "Teams");

      const computedStatus = player?.publicEnabled === false ? "Inactive" : "Active";

      const data: PublicPayload & {
        debug?: any;
      } = {
        profile: {
          planTier: computedPlanTier,
          activityStatus: computedStatus,
          status: computedStatus,

          // needed for coach-only tools
          playerProfileId: row?.id ?? null,

          firstName: (atomic as any).firstName ?? null,
          lastName: (atomic as any).lastName ?? null,
          primaryPhotoUrl: user.photoUrl ?? null,

          gradYear: (atomic as any).gradYear ?? null,
          gpa: (atomic as any).gpa ?? null,
          gpaScale: (atomic as any).gpaScale ?? null,
          heightFt: (atomic as any).heightFt ?? null,
          heightIn: (atomic as any).heightIn ?? null,
          weightLb: (atomic as any).weightLb ?? null,
          age: (atomic as any).age ?? null,
          dob: (atomic as any).dobPrivate ? null : (atomic as any).dob ?? null,
          gender: (atomic as any).gender ?? null,

          hometown: (atomic as any).hometown ?? null,
          state: (atomic as any).state ?? null,

          email: (atomic as any).emailPrivate ? null : (atomic as any).email ?? null,
          phone: (atomic as any).phonePrivate ? null : (atomic as any).phone ?? null,

          primaryPos: (atomic as any).primaryPos ?? null,
          secondaryPos: (atomic as any).secondaryPos ?? null,
          isPitcher: (atomic as any).isPitcher ?? null,
          pitcherHand: (atomic as any).pitcherHand ?? null,
          bats: (atomic as any).bats ?? null,
          throws: (atomic as any).throws ?? null,

          positions: {
            primary: (atomic as any).primaryPos ?? null,
            secondary: (atomic as any).secondaryPos ? [(atomic as any).secondaryPos] : [],
          },

          committed: (atomic as any).isCommitted
            ? { isCommitted: true, program: (atomic as any).committedProgram ?? null }
            : { isCommitted: false, program: null },

          ncaaId: ncaaScan.value,
          naiaEcid: naiaScan.value,

          academics: {
            bio: (atomic as any).academicBio ?? ac.bio ?? null,
            gradYear: (atomic as any).gradYear ?? null,
            gpa: (atomic as any).gpa ?? null,
            gpaScale: (atomic as any).gpaScale ?? null,
            sat: (atomic as any).sat ?? null,
            act: (atomic as any).act ?? null,
            highSchool: (atomic as any).hsName ?? null,
            highSchoolWebsite: (atomic as any).hsGeneralWebsiteUrl ?? null,
            city: (atomic as any).hsCity ?? null,
            state: (atomic as any).hsState ?? null,

            areasOfStudy: majorsArray,
            areasOfStudyInput: majorsArray.join(", "),

            transcripts: transcriptUrls.slice(0, 1),
            reportCards: reportCardUrls.slice(0, 1),
            otherAcademicDocs,
          },

          athletics: {
            playerBio: (atomic as any).playerBio ?? null,
            eligibilityRegistered: !!(atomic as any).eligibilityRegistered,
            ncaaId: ncaaScan.value,
            naiaEcid: naiaScan.value,
            teams,
          },

          videoSocial,

          coaches: [],
          references: [],
          coachesReferences: [],

          seasons: Array.isArray((atomic as any).statsSeasons) ? (atomic as any).statsSeasons.map(pruneSeasonStats) : [],
        },

        metrics: ((atomic as any).metrics as any) ?? {},
        stats: {
          seasons: Array.isArray((atomic as any).statsSeasons) ? (atomic as any).statsSeasons.map(pruneSeasonStats) : [],
        },
        demoMode: "global",
        planTier: computedPlanTier,
      };

      // Coaches / references merged + compatibility
      const rawCoaches = (() => {
        const arr = [
          ...toArr((atomic as any).coaches),
          ...toArr((atomic as any).references),
          ...toArr((atomic as any).coachesReferences),
          ...toArr((atomic as any).coachRefs),
          ...toArr((atomic as any).refs),
        ];

        const out: any[] = [];
        const seen = new Set<string>();

        for (const it of arr) {
          if (!it) continue;

          const fn = str(it.firstName ?? it.first).trim();
          const ln = str(it.lastName ?? it.last).trim();
          const nameLegacy = str(it.name ?? "").trim();

          const email = str(it.email ?? it.coachEmail).trim().toLowerCase();
          const phone = str(it.phone ?? it.coachPhone).trim();

          const teamVal = str(it.team ?? it.teamOrOrg ?? it.organization ?? it.org ?? "").trim() || null;
          const focusVal = str(it.focus ?? it.coachingFocus ?? it.role ?? it.position ?? "").trim() || null;

          let first = fn || null;
          let last = ln || null;
          if ((!first || !last) && nameLegacy) {
            const parts = nameLegacy.split(/\s+/).filter(Boolean);
            if (!first && parts.length > 0) first = parts[0];
            if (!last && parts.length > 1) last = parts.slice(1).join(" ");
          }

          const dedupeKey = [first ?? "", last ?? "", email ?? "", phone ?? ""].join("|");
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          out.push({
            firstName: first,
            lastName: last,
            team: teamVal,
            teamOrOrg: teamVal,
            focus: focusVal,
            email: email || null,
            phone: phone || null,
          });
        }

        return out;
      })();

      (data.profile as any).coaches = rawCoaches;
      (data.profile as any).references = rawCoaches;
      (data.profile as any).coachesReferences = rawCoaches;

      if (debug) {
        data.debug = {
          idsTrace: { ncaa: ncaaScan.trace, naia: naiaScan.trace },
          planDebug: {
            playerPlanRaw: player?.plan ?? null,
            atomicPlanTierRaw: (atomic as any)?.planTier ?? null,
            computedPlanTier,
            publicEnabled: player?.publicEnabled ?? null,
            computedActivityStatus: computedStatus,
          },
          rawNamespaces: {
            has_atomic_keys: Object.keys((atomic as any) || {}),
            has_academics_keys: Object.keys((academicsNS as any) || {}),
            has_athletics_keys: Object.keys((athleticsNS as any) || {}),
            has_eligibility_keys: Object.keys((eligibilityNS as any) || {}),
          },
        };
      }

      // write-thru cache (best effort)
      try {
        await prisma.publicProfileCache.upsert({
          where: { slug },
          create: { slug, userId: user.id, data },
          update: { userId: user.id, data },
        });
      } catch {}

      return NextResponse.json({ ok: true, data });
    }

    // 3) Dev fallback (LAZY IMPORT to avoid server crash if devStore is clienty)
    try {
      const devStore = await import("@/lib/devStore");
      const dev = await devStore.getBySlug(slug);
      if (dev) return NextResponse.json(devStore.toPublicPayload(dev));
    } catch (e: any) {
      // if debug, expose that dev fallback failed (still continue to 404)
      if (debug) {
        return NextResponse.json(
          { ok: false, error: "Dev fallback failed", detail: String(e?.message || e) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  } catch (e: any) {
    // ✅ FINAL GUARD: if anything blows up, return a JSON 500
    return NextResponse.json(
      {
        ok: false,
        error: debug ? String(e?.message || e) : "Failed to load player.",
        ...(debug ? { stack: String(e?.stack || "") } : {}),
      },
      { status: 500 }
    );
  }
}
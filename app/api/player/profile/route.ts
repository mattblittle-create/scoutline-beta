// app/api/player/profile/route.ts
import { NextResponse } from "next/server";
import { getByEmail, saveUser, StoredUser } from "@/lib/devStore"; // dev fallback
import { prisma } from "@/lib/prisma";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";

/** ================================
 *  Enumerations / options (keep in sync with client)
 * ================================= */
const POS_OPTIONS = new Set(["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility"]);
const SECONDARY_OPTIONS = new Set(["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility", "none"]);
const THROWS_OPTIONS = new Set(["R", "L", "S"]);
const BATS_OPTIONS = new Set(["R", "L", "S"]);
const YES_NO = new Set(["Yes", "No"]);
const PITCHER_HAND = new Set(["RHP", "LHP"]);

/** ================================
 *  Metrics keys/units
 * ================================= */
type MetricKey =
  | "homeToFirst"
  | "sixtyYdDash"
  | "exitVelo"
  | "rawThrowVelo"
  | "avgFbVelo"
  | "avgChVelo"
  | "avgBbVelo"
  | "popTime"
  | "benchPress"
  | "squat"
  | "deadLift"
  // position-specific throwing velocities
  | "infieldThrowVelo"
  | "outfieldThrowVelo"
  | "catcherThrowVelo";

type MetricEntry = { monthYear: string; value: number; source?: string | null };

const METRIC_UNIT: Record<MetricKey, "sec" | "mph" | "lbs"> = {
  homeToFirst: "sec",
  sixtyYdDash: "sec",
  exitVelo: "mph",
  rawThrowVelo: "mph",
  avgFbVelo: "mph",
  avgChVelo: "mph",
  avgBbVelo: "mph",
  popTime: "sec",
  benchPress: "lbs",
  squat: "lbs",
  deadLift: "lbs",

  // position-specific throwing velocities
  infieldThrowVelo: "mph",
  outfieldThrowVelo: "mph",
  catcherThrowVelo: "mph",
};

/** ================================
 *  Helpers
 * ================================= */
const isObj = (v: any) => v && typeof v === "object" && !Array.isArray(v);

// Helps us distinguish "field omitted" vs "field provided as empty (delete intent)"
const hasOwn = (obj: any, key: string) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

function cleanSeasonEntry(s: any) {
  if (!isObj(s)) return null;

  const seasonTermRaw = String(s?.seasonTerm ?? s?.season ?? "").trim();
  const seasonTerm = seasonTermRaw
    ? /spring|summer|fall|winter/i.test(seasonTermRaw)
      ? seasonTermRaw[0].toUpperCase() + seasonTermRaw.slice(1).toLowerCase()
      : seasonTermRaw
    : null;

  const seasonYearNum = Number(s?.seasonYear ?? s?.year);
  const seasonYear =
    Number.isFinite(seasonYearNum) && seasonYearNum >= 1900 && seasonYearNum <= 3000
      ? seasonYearNum
      : null;

  const team = (s?.team ?? s?.teamName ?? null) ? String(s?.team ?? s?.teamName).trim() : null;

  const statsFileNames = Array.isArray(s?.statsFileNames)
    ? s.statsFileNames.map((x: any) => String(x ?? "")).filter(Boolean)
    : [];

  const statsFileUrls = Array.isArray(s?.statsFileUrls)
    ? s.statsFileUrls
        .map((u: any) => String(u ?? "").trim())
        .filter((u: string) => isAcceptableDocUrl(u)) // accept http/https or /uploads/...
    : [];

  const normalizeMap = (m: any) => (isObj(m) ? m : null);

  return {
    season: s?.season ?? null,
    seasonTerm,
    seasonYear,
    team,
    statsFileNames,
    statsFileUrls,
    hitting:  normalizeMap(s?.hitting),
    fielding: normalizeMap(s?.fielding),
    catching: normalizeMap(s?.catching),
    pitching: normalizeMap(s?.pitching),
    pitchTypes: Array.isArray(s?.pitchTypes) ? s.pitchTypes.filter(Boolean) : undefined,
  };
}

function cleanSeasonsArray(input: any): any[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input.map(cleanSeasonEntry).filter(Boolean);
  return cleaned.filter((c: any) => {
    const hasTeam = !!c.team;
    const hasAnyStats = !!(c.hitting || c.fielding || c.catching || c.pitching);
    const hasFiles = (c.statsFileNames && c.statsFileNames.length) || (c.statsFileUrls && c.statsFileUrls.length);
    return hasTeam || hasAnyStats || hasFiles;
  });
}

/** Absolute URL checker (http/https) */
function isLikelyUrl(v: string | null | undefined) {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** ===== Accept site-relative /uploads/... links as valid doc URLs ===== */
function isHttpHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function isSiteRelativeUpload(s: string): boolean {
  return typeof s === "string" && /^\/uploads\/.+/i.test(s.trim());
}
function isAcceptableDocUrl(s: any): boolean {
  if (!s) return false;
  const v = String(s).trim();
  if (!v) return false;
  return isHttpHttpsUrl(v) || isSiteRelativeUpload(v);
}

/** Accept http/https or site-relative /uploads/... */
function isAcceptableUploadishUrl(s: any): boolean {
  if (!s) return false;
  const v = String(s).trim();
  if (!v) return false;
  return isHttpHttpsUrl(v) || isSiteRelativeUpload(v);
}

/** Cleaners used for academic doc arrays */
function cleanUrlArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .filter(isAcceptableDocUrl);
}

function cleanDocLinks(v: any): { url: string; label?: string | null }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((d) => {
      const url = typeof d?.url === "string" ? d.url.trim() : "";
      if (!isAcceptableDocUrl(url)) return null;
      const label =
        typeof d?.label === "string"
          ? d.label.trim()
          : typeof d?.name === "string"
          ? d.name.trim()
          : null;
      return { url, label: label || null };
    })
    .filter(Boolean) as { url: string; label?: string | null }[];
}

// --------- doc field extractors (array-first; accept legacy shapes) ---------
function extractTranscriptUrls(body: any): string[] {
  return cleanUrlArray(
    (Array.isArray(body?.transcriptUrls) && body.transcriptUrls) ??
      (Array.isArray(body?.transcripts) && body.transcripts) ??
      []
  );
}
function extractReportCardUrls(body: any): string[] {
  return cleanUrlArray(
    (Array.isArray(body?.reportCardUrls) && body.reportCardUrls) ??
      (Array.isArray(body?.reportCards) && body.reportCards) ??
      []
  );
}
function extractOtherAcademicDocs(body: any): { url: string; label?: string | null }[] {
  const arr =
    (Array.isArray(body?.otherAcademicDocs) && body.otherAcademicDocs) ??
    (Array.isArray(body?.otherDocs) && body.otherDocs) ??
    [];
  return cleanDocLinks(arr);
}

function safeTrim(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}
function numOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeYesNo(v: any): "Yes" | "No" | "" {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return "Yes";
  if (s === "no" || s === "n" || s === "false" || s === "0") return "No";
  return "";
}
function normalizeEnum<T extends string>(v: any, allowed: Set<T>): T | null {
  const s = String(v ?? "").trim();
  return allowed.has(s as T) ? (s as T) : null;
}
function normalizeMMYYYY(input: any): string | null {
  const s = String(input ?? "").trim();
  let m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]), yyyy = Number(m[2]);
    if (mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 3000) {
      return `${String(mm).padStart(2, "0")}/${String(yyyy)}`;
    }
    return null;
  }
  m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const yyyy = Number(m[1]), mm = Number(m[2]);
    if (mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 3000) {
      return `${String(mm).padStart(2, "0")}/${String(yyyy)}`;
    }
  }
  return null;
}
function sortMonthAsc(a: string, b: string) {
  const [am, ay] = a.split("/").map(Number);
  const [bm, by] = b.split("/").map(Number);
  const ad = new Date(ay, am - 1, 1).getTime();
  const bd = new Date(by, bm - 1, 1).getTime();
  return ad - bd;
}
function roundMetricValue(value: number, unit: "sec" | "mph" | "lbs"): number {
  if (!Number.isFinite(value)) return value as any;
  if (unit === "sec") return Number(value.toFixed(3));
  return Math.round(value);
}
function computeAgeFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]), day = Number(m[2]), year = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  const now = new Date();
  let age = now.getFullYear() - dt.getFullYear();
  const hadBirthday =
    now.getMonth() > dt.getMonth() || (now.getMonth() === dt.getMonth() && now.getDate() >= dt.getDate());
  if (!hadBirthday) age--;
  return age;
}

async function enforcePlayerCancellationGate(email: string) {
  const row = await prisma.playerProfile.findUnique({
    where: { email },
    select: {
      id: true,
      playerBillingStatus: true,
      playerCancelEffectiveAt: true,
      profileState: true,
    } as any,
  });

  if (!row) return { allowed: true as const, row: null };

  const now = new Date();
  const effectiveAt = (row as any).playerCancelEffectiveAt as Date | null;

  const isCanceled =
    String((row as any).playerBillingStatus || "") === "Canceled" ||
    (effectiveAt && effectiveAt.getTime() <= now.getTime());

  if (!isCanceled) return { allowed: true as const, row };

  // Flip status once (idempotent)
  if (String((row as any).playerBillingStatus || "") !== "Canceled") {
    await prisma.playerProfile.update({
      where: { email },
      data: {
        playerBillingStatus: "Canceled",
        profileState: "ARCHIVED_NO_ACTIVE_PLAN",
      } as any,
    });
  }

  return { allowed: false as const, row };
}

const toEmailLocalBase = (email: string) =>
  (email.split("@")[0] || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";

async function ensureUserRowAndSlug(email: string, firstName?: string | null, lastName?: string | null) {
  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, slug: true, name: true, phonePrivate: true, emailPrivate: true },
  });

  const nameBase = slugifyName([firstName || "", lastName || ""].filter(Boolean).join(" ")) || null;
  const emailBase = toEmailLocalBase(email);
  const desiredBase = nameBase || emailBase || "player";

  if (!user) {
    const uniqueSlug = await generateUniqueSlug(prisma as any, desiredBase);
    const fullName = [firstName || "", lastName || ""].filter(Boolean).join(" ").trim() || null;

    user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        slug: uniqueSlug,
        phonePrivate: true,
        emailPrivate: true,
      },
      // ✅ FIX: include phonePrivate/emailPrivate to match the user type from findFirst select
      select: { id: true, email: true, slug: true, name: true, phonePrivate: true, emailPrivate: true },
    });

    return user;
  }

  const isEmailStyle = user.slug ? user.slug === emailBase || user.slug.startsWith(`${emailBase}-`) : true;

  if (!user.slug || (nameBase && isEmailStyle)) {
    const uniqueSlug = await generateUniqueSlug(prisma as any, desiredBase);
    await prisma.user.update({ where: { id: user.id }, data: { slug: uniqueSlug } });
    user.slug = uniqueSlug;
  }

  return user;
}

/** ---------- doc helpers (accept a wide variety of shapes) ---------- */
const arr = (v: any): any[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const strArr = (v: any): string[] => arr(v).map((x) => String(x ?? "").trim()).filter(Boolean);
function extractTranscriptUrlsLoose(body: any): string[] {
  const a = [
    ...strArr(body.transcriptUrls),
    ...strArr(body.transcripts),
    ...strArr(body.transcriptUrl),

    // nested
    ...strArr(body?.academics?.transcriptUrls),
    ...strArr(body?.academics?.transcripts),
    ...strArr(body?.academics?.transcriptUrl),

    ...strArr(body?.academicDocs?.transcriptUrls),
    ...strArr(body?.academicDocs?.transcripts),
    ...strArr(body?.academicDocs?.transcriptUrl),

    ...strArr(body?.selectedDocuments?.transcriptUrl),
  ];
  return a;
}
function extractReportCardUrlsLoose(body: any): string[] {
  const a = [
    ...strArr(body.reportCardUrls),
    ...strArr(body.reportCards),
    ...strArr(body.reportCardUrl),

    // nested
    ...strArr(body?.academics?.reportCardUrls),
    ...strArr(body?.academics?.reportCards),
    ...strArr(body?.academics?.reportCardUrl),

    ...strArr(body?.academicDocs?.reportCardUrls),
    ...strArr(body?.academicDocs?.reportCards),
    ...strArr(body?.academicDocs?.reportCardUrl),

    ...strArr(body?.selectedDocuments?.reportCardUrl),
  ];
  return a;
}
function extractOtherAcademicDocsLoose(body: any): { label?: string | null; url: string }[] {
  const rawListCandidates: any[] = [
    body?.otherAcademicDocs,
    body?.academics?.otherAcademicDocs,
    body?.academicDocs?.otherDocs,
    body?.academicDocs?.additionalDocs,
    body?.otherDocs,

    // generic arrays of URLs
    body?.docUrls,
    body?.academicDocs?.docUrls,
  ].filter(Boolean);

  const raw = rawListCandidates.length === 0 ? [] : rawListCandidates.flat();

  const urlArrayCandidates =
    Array.isArray(body?.docUrls) ? body.docUrls :
    Array.isArray(body?.academicDocs?.docUrls) ? body.academicDocs.docUrls :
    null;

  const urlOnlyDocs = Array.isArray(urlArrayCandidates)
    ? urlArrayCandidates.map((u: any) => ({ url: String(u ?? "").trim(), label: null }))
    : [];

  const normalizedFromRaw = arr(raw)
    .map((d) =>
      typeof d === "string"
        ? { label: null, url: String(d).trim() }
        : { label: safeTrim(d?.label || d?.name || ""), url: String(d?.url || "").trim() }
    )
    .filter((d) => !!d.url);

  const merged = [...normalizedFromRaw, ...urlOnlyDocs];
  const seen = new Set<string>();
  const deduped = merged.filter((d) => {
    if (!d.url || seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });

  return deduped;
}

/** ====== NEW (Step 6): base URL & absolute URL resolvers ====== */
function computeBaseUrl(req: Request): string {
  try {
    const envBase = (process.env.NEXT_PUBLIC_BASE_URL || "").trim();
    if (envBase) return envBase.replace(/\/+$/, "");
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") || "";
  }
}
function toAbsoluteUrl(s: string, base: string): string {
  const v = (s || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return base ? `${base}${v}` : v;
  return v;
}
function resolveDocUrls(urls: any, base: string): string[] {
  const arr = Array.isArray(urls) ? urls : [];
  return arr.map((u) => toAbsoluteUrl(String(u || ""), base)).filter(Boolean);
}
function resolveDocLinkObjs(list: any, base: string): { url: string; label?: string | null }[] {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((d) => {
      const url = toAbsoluteUrl(String(d?.url || ""), base);
      const label =
        typeof d?.label === "string"
          ? d.label.trim()
          : typeof d?.name === "string"
          ? d.name.trim()
          : null;
      return url ? { url, label: label || null } : null;
    })
    .filter(Boolean) as { url: string; label?: string | null }[];
}
function resolveStatsSeasonsAbs(seasons: any, base: string): any[] {
  const arr = Array.isArray(seasons) ? seasons : [];
  return arr.map((s) => {
    const urls = resolveDocUrls(s?.statsFileUrls ?? [], base);
    return { ...s, statsFileUrls: urls };
  });
}

/** ====== NEW: Governing ID helpers ====== */
const digitsOnly = (v: string) => v.replace(/\D+/g, "");
const normalizeNcaaId = (v: any): string | null => {
  // Strict: return only if it's exactly 10 digits; otherwise null (header hides it)
  const d = digitsOnly(String(v ?? ""));
  return d.length === 10 ? d : null;
};
const trimOrNull = (v: any): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

/** ================================
 *  GET /api/player/profile?email=...
 * ================================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // ✅ Cancellation access cutoff (effective end-of-period)
    const gate = await enforcePlayerCancellationGate(email);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This ScoutLine account has been canceled. Access to the player profile is no longer available.",
        },
        { status: 403 }
      );
    }

    const row = await prisma.playerProfile.findUnique({
      where: { email },
      select: { data: true, schemaVersion: true, updatedAt: true },
    });

    if (row?.data) {
      const fn = (row.data as any)?.firstName || null;
      const ln = (row.data as any)?.lastName || null;
      try {
        await ensureUserRowAndSlug(email, fn, ln);
      } catch {}
    }

    const userForGet = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true, slug: true, photoUrl: true },
    });

    const base = computeBaseUrl(req);

    if (row?.data) {
      const norm = (row.data as any) || {};
      // --- Step 6: resolve site-relative doc URLs to absolute for client consumption
      const normalizedResolved = {
        ...norm,
        slug: userForGet?.slug ?? null,
        photoUrl: userForGet?.photoUrl ?? null,

        // ---- Compatibility shim: always provide videoSocial for clients ----
        videoSocial: isObj((norm as any).videoSocial)
          ? (norm as any).videoSocial
          : {
              externalVideos: Array.isArray((norm as any).externalVideos) ? (norm as any).externalVideos : [],
              localVideos: Array.isArray((norm as any).localVideos) ? (norm as any).localVideos : [],
              social: isObj((norm as any).social) ? (norm as any).social : {},
              primary: (norm as any).primary ?? null,
              chatUrl: (norm as any).chatUrl ?? null,
            },

        // academics docs (accept either canonical or legacy keys)
        transcriptUrls: resolveDocUrls(norm.transcriptUrls ?? norm.transcripts ?? [], base),
        reportCardUrls: resolveDocUrls(norm.reportCardUrls ?? norm.reportCards ?? [], base),
        otherAcademicDocs: resolveDocLinkObjs(norm.otherAcademicDocs ?? norm.otherDocs ?? [], base),

        // stats seasons file links
        statsSeasons: resolveStatsSeasonsAbs(norm.statsSeasons ?? norm.seasons ?? [], base),
      };

      return NextResponse.json({
        ok: true,
        user: {
          email: userForGet?.email ?? email,
          slug: userForGet?.slug ?? null,
          photoUrl: userForGet?.photoUrl ?? null,
        },
        normalized: normalizedResolved,
        schemaVersion: row.schemaVersion ?? 1,
        updatedAt: row.updatedAt ?? null,
      });
    }

    const dev = await getByEmail(email);
    if (dev) {
      const norm = dev as any;
      const normalizedResolved = {
        ...norm,
        slug: userForGet?.slug ?? null,
        photoUrl: userForGet?.photoUrl ?? null,
        transcriptUrls: resolveDocUrls(norm.transcriptUrls ?? norm.transcripts ?? [], base),
        reportCardUrls: resolveDocUrls(norm.reportCardUrls ?? norm.reportCards ?? [], base),
        otherAcademicDocs: resolveDocLinkObjs(norm.otherAcademicDocs ?? norm.otherDocs ?? [], base),
        statsSeasons: resolveStatsSeasonsAbs(norm.statsSeasons ?? norm.seasons ?? [], base),
      };

      return NextResponse.json({
        ok: true,
        user: { email, slug: userForGet?.slug ?? null, photoUrl: userForGet?.photoUrl ?? null },
        normalized: normalizedResolved,
        source: "devStore",
      });
    }

    return NextResponse.json({
      ok: true,
      user: { email, slug: userForGet?.slug ?? null, photoUrl: userForGet?.photoUrl ?? null },
      normalized: {},
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

/** ================================
 *  POST /api/player/profile
 * ================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email: string = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }

    // ✅ Cancellation access cutoff (effective end-of-period)
    const gate = await enforcePlayerCancellationGate(email);
    if (!gate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This ScoutLine account has been canceled. You can no longer access or edit this player profile.",
        },
        { status: 403 }
      );
    }

    // Load existing profile so we can preserve docs when not re-sent
    const existing = await prisma.playerProfile.findUnique({
      where: { email },
      select: { data: true },
    });
    const existingData = (existing?.data as any) || {};

    /** ---------- Normalize core/athletics ---------- */
    const firstName = safeTrim(body.firstName || "");
    const lastName = safeTrim(body.lastName || "");

    const gradYear = numOrNull(body.gradYear);
    const primaryPos = normalizeEnum(body.primaryPos, POS_OPTIONS);
    const secondaryPos = normalizeEnum(body.secondaryPos, SECONDARY_OPTIONS);

    const isPitcher = normalizeYesNo(body.isPitcher);
    let pitcherHand = normalizeEnum(body.pitcherHand, PITCHER_HAND);
    const throws = normalizeEnum(body.throws, THROWS_OPTIONS);
    const bats = normalizeEnum(body.bats, BATS_OPTIONS);

    const heightFt = numOrNull(body.heightFt);
    const heightIn = numOrNull(body.heightIn);
    const weightLb = numOrNull(body.weightLb);

    const dob = safeTrim(body.dob || "");
    const dobPrivate = !!body.dobPrivate;
    const gender = safeTrim(body.gender || "");

    const isPitcherByPos = primaryPos === "P" || secondaryPos === "P";
    if (!(isPitcher === "Yes" || isPitcherByPos)) pitcherHand = null;

    const ageFromDob = computeAgeFromDob(dob);
    const age = ageFromDob ?? numOrNull(body.age);

    // Academics / misc
    const hsName = safeTrim(body.hsName || "");
    const hsCity = safeTrim(body.hsCity || "");
    const hsState = safeTrim(body.hsState || "");
    const hometown = safeTrim(body.hometown || "");
    const state = safeTrim(body.state || "");
    const hsScheduleUrl = safeTrim(body.hsScheduleUrl || "");
    const hsSchedulePrivate = !!body.hsSchedulePrivate;
    const hsWebsiteUrl = safeTrim(body.hsWebsiteUrl || "");                      // ✅ NEW

    const gpa = numOrNull(body.gpa);
    const gpaScale = safeTrim(body.gpaScale || "");
    const sat = numOrNull(body.sat);
    const act = numOrNull(body.act);

    const academicBio = safeTrim(body.academicBio || "");
    const academicBioPrivate = !!body.academicBioPrivate;

    const eligibilityRegistered = !!body.eligibilityRegistered;

    const isCommitted = !!body.isCommitted;
    const committedProgram = isCommitted ? safeTrim(body.committedProgram || "") : null;
    const committedProgramId = isCommitted ? (body.committedProgramId ?? null) : null;

    const travelTeamName = safeTrim(body.travelTeamName || "");
    const travelTeamCity = safeTrim(body.travelTeamCity || "");
    const travelTeamState = safeTrim(body.travelTeamState || "");
    const travelTeamScheduleUrl = safeTrim(body.travelTeamScheduleUrl || "");
    const travelTeamSchedulePrivate = !!body.travelTeamSchedulePrivate;
    const travelTeamWebsiteUrl = safeTrim(body.travelTeamWebsiteUrl || "");      // ✅ NEW

    type OtherTeam = {
      name: string;
      city: string;
      state: string;
      scheduleUrl: string;
      websiteUrl: string;
    };

    const otherTeams = Array.isArray(body.otherTeams)
      ? body.otherTeams.map((t: any) => ({
          name: t?.name ? String(t.name).trim() : "",
          city: t?.city ? String(t.city).trim() : "",
          state: t?.state ? String(t.state).trim().toUpperCase().slice(0, 2) : "",
          scheduleUrl: t?.scheduleUrl ? String(t.scheduleUrl).trim() : "",
          websiteUrl: t?.websiteUrl ? String(t.websiteUrl).trim() : "", // ✅ website saved
        }))
      : [];

    const playerBio = safeTrim(body.playerBio || "");
    const playerBioPrivate = !!body.playerBioPrivate;

    /** ---------- ACADEMICS: Intended Major(s) + Docs ---------- */
    const areasOfStudyArr: string[] = Array.isArray(body.areasOfStudy)
      ? body.areasOfStudy.map((s: any) => String(s || "").trim()).filter(Boolean)
      : String(body.areasOfStudyInput || body.intendedMajors || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    const areasOfStudyInput =
      Array.isArray(body.areasOfStudyInput)
        ? (body.areasOfStudyInput as string[]).join(", ")
        : String(body.areasOfStudyInput || (areasOfStudyArr.length ? areasOfStudyArr.join(", ") : "")).trim() || "";

    /** ---------- Documents (uploads) ---------- */
    const strictTranscriptArr = extractTranscriptUrls(body);
    const strictReportArr     = extractReportCardUrls(body);
    const strictOtherDocs     = extractOtherAcademicDocs(body);

    const looseTranscriptArr  = extractTranscriptUrlsLoose(body);
    const looseReportArr      = extractReportCardUrlsLoose(body);
    const looseOtherDocs      = extractOtherAcademicDocsLoose(body);

    const singleTranscript = typeof body?.transcriptUrl === "string" ? body.transcriptUrl.trim() : "";
    const singleReport     = typeof body?.reportCardUrl  === "string" ? body.reportCardUrl.trim()  : "";

    const topLevelAdditionalDocs: { url: string; label?: string | null }[] = Array.isArray(body?.additionalDocs)
      ? body.additionalDocs
          .map((d: any) => {
            const url = typeof d?.url === "string" ? d.url.trim() : "";
            if (!url) return null;
            const label =
              typeof d?.label === "string"
                ? d.label.trim()
                : typeof d?.name === "string"
                ? d.name.trim()
                : null;
            return { url, label: label || null };
          })
          .filter(Boolean) as { url: string; label?: string | null }[]
      : [];

    // ----- Detect "field provided" vs "field omitted" so deletes stick -----
    const transcriptKeyPresent =
      hasOwn(body, "transcriptUrls") ||
      hasOwn(body, "transcripts") ||
      hasOwn(body, "transcriptUrl") ||
      (isObj(body?.academics) &&
        (hasOwn(body.academics, "transcriptUrls") ||
          hasOwn(body.academics, "transcripts") ||
          hasOwn(body.academics, "transcriptUrl")));

    const reportKeyPresent =
      hasOwn(body, "reportCardUrls") ||
      hasOwn(body, "reportCards") ||
      hasOwn(body, "reportCardUrl") ||
      (isObj(body?.academics) &&
        (hasOwn(body.academics, "reportCardUrls") ||
          hasOwn(body.academics, "reportCards") ||
          hasOwn(body.academics, "reportCardUrl")));

    const otherDocsKeyPresent =
      hasOwn(body, "otherAcademicDocs") ||
      hasOwn(body, "otherDocs") ||
      hasOwn(body, "additionalDocs") ||
      (isObj(body?.academics) &&
        (hasOwn(body.academics, "otherAcademicDocs") ||
          hasOwn(body.academics, "otherDocs")));

    /** ---------- Merge strategy (delete-safe) ---------- */
    // If the client INCLUDED the field (even as empty), we respect it (this is how deletes persist).
    // Only fall back to existing when the field was OMITTED entirely.
    const transcriptUrls: string[] =
      transcriptKeyPresent
        ? (strictTranscriptArr.length > 0
            ? strictTranscriptArr
            : looseTranscriptArr.length > 0
            ? looseTranscriptArr
            : singleTranscript
            ? [singleTranscript]
            : [])
        : Array.isArray(existingData.transcriptUrls)
        ? existingData.transcriptUrls
        : Array.isArray(existingData.transcripts)
        ? existingData.transcripts
        : [];

    const reportCardUrls: string[] =
      reportKeyPresent
        ? (strictReportArr.length > 0
            ? strictReportArr
            : looseReportArr.length > 0
            ? looseReportArr
            : singleReport
            ? [singleReport]
            : [])
        : Array.isArray(existingData.reportCardUrls)
        ? existingData.reportCardUrls
        : Array.isArray(existingData.reportCards)
        ? existingData.reportCards
        : [];

    const otherAcademicDocs: { url: string; label?: string | null }[] =
      otherDocsKeyPresent
        ? [...strictOtherDocs, ...looseOtherDocs, ...topLevelAdditionalDocs]
        : Array.isArray(existingData.otherAcademicDocs)
        ? existingData.otherAcademicDocs
        : Array.isArray(existingData.otherDocs)
        ? existingData.otherDocs
        : [];

    /** ---------- Metrics normalization ---------- */
    const incomingMetrics = (body.metrics ?? {}) as Record<MetricKey, MetricEntry[]>;
    const normalizedMetrics = {} as Record<MetricKey, MetricEntry[]>;

    (Object.keys(METRIC_UNIT) as MetricKey[]).forEach((k) => {
      const unit = METRIC_UNIT[k];
      const arr = Array.isArray(incomingMetrics[k]) ? incomingMetrics[k] : [];
      const cleaned = arr
        .map((e) => {
          const my = normalizeMMYYYY(e?.monthYear);
          const rawVal = numOrNull(e?.value);
          if (!my || rawVal == null) return null;
          return {
            monthYear: my,
            value: roundMetricValue(rawVal, unit),
            source: safeTrim(e?.source || "") || "Manual",
          } as MetricEntry;
        })
        .filter(Boolean) as MetricEntry[];

      cleaned.sort((a, b) => sortMonthAsc(a.monthYear, b.monthYear));
      normalizedMetrics[k] = cleaned;
    });

    // ---------- Stats seasons (from Stats tab) ----------
    const incomingSeasonsRaw =
      Array.isArray(body.statsSeasons) ? body.statsSeasons :
      Array.isArray(body.seasons) ? body.seasons :
      null;

    const cleanedIncomingSeasons = incomingSeasonsRaw ? cleanSeasonsArray(incomingSeasonsRaw) : [];

    const existingSeasons =
      Array.isArray(existingData?.statsSeasons) ? existingData.statsSeasons :
      Array.isArray(existingData?.seasons) ? existingData.seasons :
      [];

    const statsSeasons = cleanedIncomingSeasons.length > 0
      ? cleanedIncomingSeasons
      : existingSeasons;

    /** ---------- Field-level server validation ---------- */
    const errors: Record<string, string> = {};
    if (hsScheduleUrl && !isLikelyUrl(hsScheduleUrl)) errors.hsScheduleUrl = "Enter a valid URL (http/https)";
    if (travelTeamScheduleUrl && !isLikelyUrl(travelTeamScheduleUrl))
      errors.travelTeamScheduleUrl = "Enter a valid URL (http/https)";
    if (hsWebsiteUrl && !isLikelyUrl(hsWebsiteUrl))                                      // ✅ NEW
      errors.hsWebsiteUrl = "Enter a valid URL (http/https)";
    if (travelTeamWebsiteUrl && !isLikelyUrl(travelTeamWebsiteUrl))                      // ✅ NEW
      errors.travelTeamWebsiteUrl = "Enter a valid URL (http/https)";

    otherTeams.forEach((t: OtherTeam, i: number) => {
      if (t.scheduleUrl && !isLikelyUrl(t.scheduleUrl)) {
        errors[`otherTeams.${i}.scheduleUrl`] = "Enter a valid URL (http/https)";
      }
      // (Optional) you could also validate websiteUrl here if you want:
      // if (t.websiteUrl && !isLikelyUrl(t.websiteUrl)) {
      //   errors[`otherTeams.${i}.websiteUrl`] = "Enter a valid URL (http/https)";
      // }
    });

    transcriptUrls.forEach((u: string, i: number) => {
      if (!isAcceptableDocUrl(u)) errors[`transcriptUrls.${i}`] = "Enter a valid URL (http/https or /uploads/...)";
    });
    reportCardUrls.forEach((u: string, i: number) => {
      if (!isAcceptableDocUrl(u)) errors[`reportCardUrls.${i}`] = "Enter a valid URL (http/https or /uploads/...)";
    });
    otherAcademicDocs.forEach((d: { url: string; label?: string | null }, i: number) => {
      if (!isAcceptableDocUrl(d.url))
        errors[`otherAcademicDocs.${i}.url`] = "Enter a valid URL (http/https or /uploads/...)";
    });
    // Validate season-level stats file URLs
    (cleanedIncomingSeasons || []).forEach((season, i) => {
      const urls = Array.isArray(season?.statsFileUrls) ? season.statsFileUrls : [];
      urls.forEach((u: string, j: number) => {
        if (!isAcceptableDocUrl(u)) {
          errors[`statsSeasons.${i}.statsFileUrls.${j}`] = "Enter a valid URL (http/https or /uploads/...)";
        }
      });
    });

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    /** ---------- NEW: Governing IDs from request (top-level or nested) ---------- */
    const ncaaCandidates = [
      body?.ncaaId, body?.NCAAId, body?.ncaaID,
      body?.ncaaEligibilityId, body?.ncaaEligibilityCenterId,
      body?.athletics?.ncaaId, body?.athletics?.NCAAId, body?.athletics?.ncaaEligibilityId, body?.athletics?.ncaaEligibilityCenterId,
      body?.eligibility?.ncaaId, body?.eligibility?.NCAAId, body?.eligibility?.ncaaEligibilityId, body?.eligibility?.ncaaEligibilityCenterId,
    ];
    const naiaCandidates = [
      body?.naiaEcid, body?.naiaEcId, body?.NAIAEcid,
      body?.naiaId, body?.naiaEligibilityId, body?.naiaEligibilityCenterId, body?.ecid,
      body?.athletics?.naiaEcid, body?.athletics?.naiaEcId, body?.athletics?.NAIAEcid, body?.athletics?.naiaId, body?.athletics?.naiaEligibilityId, body?.athletics?.naiaEligibilityCenterId, body?.athletics?.ecid,
      body?.eligibility?.naiaEcid, body?.eligibility?.naiaEcId, body?.eligibility?.NAIAEcid, body?.eligibility?.naiaId, body?.eligibility?.naiaEligibilityId, body?.eligibility?.naiaEligibilityCenterId, body?.eligibility?.ecid,
    ];

    const hasNcaaKey =
      ["ncaaId","NCAAId","ncaaID","ncaaEligibilityId","ncaaEligibilityCenterId"].some(k => k in (body ?? {})) ||
      ["ncaaId","NCAAId","ncaaEligibilityId","ncaaEligibilityCenterId"].some(k => k in (body?.athletics ?? {})) ||
      ["ncaaId","NCAAId","ncaaEligibilityId","ncaaEligibilityCenterId"].some(k => k in (body?.eligibility ?? {}));

    const hasNaiaKey =
      ["naiaEcid","naiaEcId","NAIAEcid","naiaId","naiaEligibilityId","naiaEligibilityCenterId","ecid"].some(k => k in (body ?? {})) ||
      ["naiaEcid","naiaEcId","NAIAEcid","naiaId","naiaEligibilityId","naiaEligibilityCenterId","ecid"].some(k => k in (body?.athletics ?? {})) ||
      ["naiaEcid","naiaEcId","NAIAEcid","naiaId","naiaEligibilityId","naiaEligibilityCenterId","ecid"].some(k => k in (body?.eligibility ?? {}));

    const ncaaIdNormalized = normalizeNcaaId(ncaaCandidates.find(v => v != null));
    const naiaEcidNormalized = trimOrNull(naiaCandidates.find(v => v != null));

    /** ---------- Build normalized atomic payload ---------- */
    const normalized: StoredUser = {
      ...(existingData as any),

      email,
      firstName,
      lastName,

      // contact
      emailPrivate: !!body.emailPrivate,
      phone: safeTrim(body.phone || ""),
      phonePrivate: !!body.phonePrivate,

      // academics
      gradYear,
      hsName,
      hsCity,
      hsState,
      hometown,
      state,
      gpa,
      gpaScale,
      sat,
      act,
      academicBio,
      academicBioPrivate,

      // docs
      transcriptUrls,
      reportCardUrls,
      otherAcademicDocs,

      // Intended majors
      areasOfStudyInput,
      areasOfStudy: areasOfStudyArr,

      // athletics/core
      primaryPos,
      secondaryPos,
      isPitcher,
      pitcherHand,
      throws,
      bats,
      heightFt,
      heightIn,
      weightLb,

      age,
      dob,
      dobPrivate,
      gender,

      // eligibility flags
      eligibilityRegistered,

      // commitment
      isCommitted,
      committedProgram,
      committedProgramId,

      // schedules + websites
      hsScheduleUrl,
      hsSchedulePrivate,
      hsWebsiteUrl,                    // ✅ persisted

      travelTeamName,
      travelTeamCity,
      travelTeamState,
      travelTeamScheduleUrl,
      travelTeamSchedulePrivate,
      travelTeamWebsiteUrl,           // ✅ persisted

      // other teams & bios
      otherTeams,

      playerBio,
      playerBioPrivate,

      // --- Video / Social (Tab 6) (delete-safe) ---
      externalVideos: (() => {
        const src = hasOwn(body, "videoSocial") && isObj(body.videoSocial) ? (body.videoSocial as any) : body;
        if (!hasOwn(src, "externalVideos")) return existingData.externalVideos ?? undefined;

        const list = Array.isArray(src.externalVideos) ? src.externalVideos : [];
        return list
          .map((v: any) => {
            const url = typeof v?.url === "string" ? v.url.trim() : "";
            if (!url) return null;
            const title = typeof v?.title === "string" ? v.title.trim() : undefined;

            const source = typeof v?.source === "string" ? v.source.trim() : undefined;
            const addedAt = Number.isFinite(Number(v?.addedAt)) ? Number(v.addedAt) : Date.now();

            return { ...v, url, title, source, addedAt };
          })
          .filter(Boolean);
      })(),

      localVideos: (() => {
        const src = hasOwn(body, "videoSocial") && isObj(body.videoSocial) ? (body.videoSocial as any) : body;
        if (!hasOwn(src, "localVideos")) return existingData.localVideos ?? undefined;

        const list = Array.isArray(src.localVideos) ? src.localVideos : [];
        return list
          .map((v: any) => {
            const publicUrl =
              typeof v?.publicUrl === "string"
                ? v.publicUrl.trim()
                : typeof v?.url === "string"
                ? v.url.trim()
                : "";

            if (!publicUrl) return null;

            const title = typeof v?.title === "string" ? v.title.trim() : undefined;
            const fileType = typeof v?.fileType === "string" ? v.fileType.trim() : undefined;
            const fileSize = Number.isFinite(Number(v?.fileSize)) ? Number(v.fileSize) : undefined;
            const addedAt = Number.isFinite(Number(v?.addedAt)) ? Number(v.addedAt) : Date.now();

            return { ...v, title, publicUrl, fileType, fileSize, addedAt };
          })
          .filter(Boolean);
      })(),

      social: (() => {
        const src = hasOwn(body, "videoSocial") && isObj(body.videoSocial) ? (body.videoSocial as any) : body;

        if (!hasOwn(src, "social")) return existingData.social ?? undefined;

        if (!isObj(src.social)) return {};
        return { ...(existingData.social ?? {}), ...(src.social as any) };
      })(),

      primary: (() => {
        const src = hasOwn(body, "videoSocial") && isObj(body.videoSocial) ? (body.videoSocial as any) : body;

        if (!hasOwn(src, "primary")) return existingData.primary ?? null;

        return (isObj(src.primary) || src.primary == null) ? (src.primary ?? null) : null;
      })(),

      // --- Coaches / References (Tab 7) (delete-safe) ---
      coaches: hasOwn(body, "coaches")
        ? (Array.isArray(body.coaches)
            ? body.coaches
                .map((c: any) => {
                  const firstName = typeof c?.firstName === "string" ? c.firstName.trim() : "";
                  const lastName  = typeof c?.lastName === "string" ? c.lastName.trim() : "";
                  const team      = typeof c?.team === "string" ? c.team.trim() : "";

                  const email =
                    typeof c?.email === "string" ? c.email.trim().toLowerCase() : "";

                  const phone     = typeof c?.phone === "string" ? c.phone.trim() : "";
                  const focus     = typeof c?.focus === "string" ? c.focus.trim() : "";

                  const id =
                    typeof c?.id === "string" && c.id.trim()
                      ? c.id.trim()
                      : uid();

                  const addedAt =
                    Number.isFinite(Number(c?.addedAt)) ? Number(c.addedAt) : Date.now();

                  const legacyName = typeof c?.name === "string" ? c.name.trim() : "";
                  const legacyRole = typeof c?.role === "string" ? c.role.trim() : "";
                  const legacyNotes = typeof c?.notes === "string" ? c.notes.trim() : "";

                  const finalFirst = firstName || (legacyName ? legacyName : "");
                  const finalFocus = focus || legacyRole || legacyNotes || "";

                  const keep = finalFirst || lastName || team || email || phone || finalFocus;
                  if (!keep) return null;

                  return {
                    ...c,
                    id,
                    firstName: finalFirst,
                    lastName,
                    team,
                    email,
                    phone,
                    focus: finalFocus,
                    addedAt,
                  };
                })
                .filter(Boolean)
            : [])
        : (existingData.coaches ?? undefined),

      // metrics
      metrics: normalizedMetrics,

      // metrics privacy passthrough
      metricsPrivate: body.metricsPrivate ?? existingData.metricsPrivate,

      // stats (seasons)
      statsSeasons,
    };

    // ✅ Only set these if the request included a governing-ID key; otherwise preserve existing
    if (hasNcaaKey) (normalized as any).ncaaId = ncaaIdNormalized;      // may be null to clear
    if (hasNaiaKey) (normalized as any).naiaEcid = naiaEcidNormalized;   // may be null to clear

    /** ---------- Persist ---------- */
    const stored = await saveUser(normalized);
    const schemaVersion = 1;

    // Ensure User + slug exists and is upgraded if we have names
    const userRow = await ensureUserRowAndSlug(email, firstName ?? undefined, lastName ?? undefined);

    await prisma.playerProfile.upsert({
      where: { email },
      create: { email, userId: userRow?.id ?? null, schemaVersion, data: normalized },
      update: { userId: userRow?.id ?? null, schemaVersion, data: normalized },
    });

    /** ---------- BUST public cache so /api/public/... recomputes ---------- */
    try {
      if (userRow?.slug) {
        await prisma.publicProfileCache.delete({ where: { slug: userRow.slug } }).catch(() => {});
      }
    } catch {}

    // Keep Player row in sync (best-effort)
    try {
      if (userRow) {
        await prisma.player.upsert({
          where: { userId: userRow.id },
          create: {
            userId: userRow.id,
            gradYear: gradYear ?? undefined,
            primaryPos: primaryPos ?? undefined,
            secondaryPos: secondaryPos ?? undefined,
            pitcherHand: (pitcherHand as any) ?? undefined,
            throws: throws ?? undefined,
            bats: bats ?? undefined,
            hsName: hsName ?? undefined,
            isCommitted,
            committedProgram: committedProgram ?? undefined,
            committedProgramId: committedProgramId ?? undefined,
            heightFt: heightFt ?? undefined,
            heightIn: heightIn ?? undefined,
            weightLb: weightLb ?? undefined,
            hometown: hometown ?? undefined,
            state: state ?? undefined,
            gpa: (gpa as any) ?? undefined,
            sat: sat ?? undefined,
            act: act ?? undefined,
            age: age ?? undefined,
            dobPrivate: dobPrivate ?? undefined,
          },
          update: {
            gradYear: gradYear ?? null,
            primaryPos: primaryPos ?? null,
            secondaryPos: secondaryPos ?? null,
            pitcherHand: (pitcherHand as any) ?? null,
            throws: throws ?? null,
            bats: bats ?? null,
            hsName: hsName ?? null,
            isCommitted,
            committedProgram: committedProgram ?? null,
            committedProgramId: committedProgramId ?? null,
            heightFt: heightFt ?? null,
            heightIn: heightIn ?? null,
            weightLb: weightLb ?? null,
            hometown: hometown ?? null,
            state: state ?? null,
            gpa: (gpa as any) ?? null,
            sat: sat ?? null,
            act: act ?? null,
            age: age ?? null,
            dobPrivate: dobPrivate ?? null,
          },
        });
      }
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        normalized: { ...stored, slug: userRow?.slug ?? null },
        user: { ...stored, slug: userRow?.slug ?? null },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
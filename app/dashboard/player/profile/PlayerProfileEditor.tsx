// app/dashboard/player/profile/PlayerProfileEditor.tsx
"use client";

import React, { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { TAB_KEYS } from "./tabKeys";
import TabCore from "./TabCore";
import TabAcademics from "./TabAcademics";
import TabAthletics from "./TabAthletics";
import TabMetrics from "./TabMetrics";
import TabStats from "./TabStats";
import TabVideoSocial, { VideoSocialHandle } from "./TabVideoSocial";
import TabCoachesReferences, { CoachesHandle } from "./TabCoachesReferences";
import { PlayerProfilePayload } from "@/app/lib/types/player";

// Keep any other server-safe/client-safe imports you already use:
import * as XLSX from "xlsx";
import { mapFirstPlayer } from "@/app/lib/stats/gamechangerMapping";

const POS_OPTIONS = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility", "CIF", "MIF", "OF"] as const;
const SECONDARY_OPTIONS = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility", "CIF", "MIF", "OF", "none"] as const;
const THROWS_OPTIONS = ["R", "L", "S"] as const;
const BATS_OPTIONS = ["R", "L", "S"] as const;
const YES_NO = ["Yes", "No"] as const;
const PITCHER_HAND = ["RHP", "LHP"] as const;

// Stats season term options
const SEASON_TERMS = ["Spring", "Summer", "Fall", "Winter"] as const;

// Pitch types (for Pitching section)
const PITCH_TYPES = [
  "4 Seam Fastball",
  "2 Seam Fastball",
  "Split Finger Fastball",
  "Cut Fastball",
  "Sinker",
  "Changeup",
  "Curveball",
  "Slider",
  "Slurve",
  "Knuckleball",
  "Knuckle Curve",
] as const;

// Gender options (Male/Female only)
const GENDER_OPTIONS = ["Male", "Female"] as const;

const MAX_PHOTO_BYTES = 75 * 1024 * 1024; // 75MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/heic",
  "image/heif",
  "image/webp",
]);

// --- Tabs ---
const TABS = [
  "Core",
  "Academics",
  "Athletics",
  "Metrics",
  "Stats",
  "Video / Social Media",
  "References",
] as const;

type Tab = typeof TABS[number];

// US state abbreviations for the Academics tab (2-letter)
const US_STATE_ABBRS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
] as const;

// --- Docs (academics) ---
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx";
const DOC_ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// --- URL helpers ---
function isLikelyUrl(v: string): boolean {
  if (!v) return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const MAX_BIO_CHARS = 1000;

// --- Helpers ---
type OtherTeam = {
  id: string; // client-only key
  name: string;
  city: string;
  state: string;
  scheduleUrl: string;
  websiteUrl: string; // NEW: team website link
};

type PlayerProfileEditorMode = "player" | "parent" | "team-admin";

type PlayerProfileEditorProps = {
  mode?: PlayerProfileEditorMode;
  profileEmailOverride?: string;
  saveEndpoint?: string;
  saveMethod?: "POST" | "PATCH";
  backHref?: string;
  backLabel?: string;
  billingHref?: string;
  heading?: string;
  intro?: string;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

  function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressImageFile(
  file: File,
  opts?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputType?: "image/jpeg" | "image/webp";
  }
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputType = "image/jpeg",
  } = opts || {};

  // Skip compression for already-small files
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    if (!srcW || !srcH) return file;

    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
    const targetW = Math.round(srcW * scale);
    const targetH = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, quality)
    );

    if (!blob) return file;

    const originalBase = file.name.replace(/\.[^.]+$/, "");
    const ext = outputType === "image/webp" ? "webp" : "jpg";

    return new File([blob], `${originalBase}.${ext}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// --- Metrics types for UI/API ---
export type MetricEntry = {
  monthYear: string;      // "mm/yyyy"
  value: number;          // numeric reading
  source?: string | null; // e.g., "Manual", "Rapsodo", "Trackman"
};

// ---- metric value formatting helpers ----
function normalizeToMMYYYY(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
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

function decimalsForUnit(unitHint?: string): number | null {
  const u = (unitHint || "").toLowerCase();
  if (u === "seconds" || u === "sec" || u.includes("second")) return 3;
  if (u === "mph" || u === "lbs" || u === "lb") return 0;
  return null;
}

function roundForUnit(n: number, unitHint?: string): number {
  const d = decimalsForUnit(unitHint);
  if (d == null) return n;
  return Number(n.toFixed(d));
}

function displayForUnit(n: number, unitHint?: string): string {
  const d = decimalsForUnit(unitHint);
  if (d == null) return String(n);
  return n.toFixed(d);
}

// Intended Major(s) helpers
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

function parseAreas(raw: string): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " "))
    .map(titleCase)
    .slice(0, 12);
}

export function PlayerProfileEditor({
  mode = "player",
  profileEmailOverride,
  saveEndpoint = "/api/player/profile",
  saveMethod = "POST",
  backHref = "/dashboard/player",
  backLabel = "Back to Dashboard",
  billingHref = "/dashboard/player/profile/billing",
  heading = "Player Profile",
  intro = "It is important to update your profile information on a regular basis. ScoutLine recommends updating Academics after each semester, Core and Athletics as necessary, Metrics every 6 to 8 months, Stats after each season completes, and Video and References as they become available.",
}: PlayerProfileEditorProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // NEW: refs into tab children (used to pull atomic payloads on Save)
  const videoSocialRef = useRef<VideoSocialHandle>(null);
  const coachesRef = useRef<CoachesHandle>(null);

    // Active tab
  const [activeTab, setActiveTab] = useState<Tab>("Core");

  // First/Last name
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");

  // Hometown City + State
  const [hometownCity, setHometownCity] = useState<string>("");
  const [hometownState, setHometownState] = useState<string>("");
  const [hometownZip, setHometownZip] = useState<string>("");

  // EMAIL RESOLVER:
  // 1) honor ?email= when present
  // 2) otherwise hydrate from the logged-in user
  const [sessionEmail, setSessionEmail] = useState<string>("");

  const resolvedEmail = useMemo(() => {
    const fromOverride = String(profileEmailOverride || "").trim().toLowerCase();
    if (fromOverride && fromOverride.includes("@")) return fromOverride;

    const fromQuery = searchParams?.get("email");
    if (fromQuery && fromQuery.includes("@")) return fromQuery.trim().toLowerCase();

    if (sessionEmail && sessionEmail.includes("@")) return sessionEmail.trim().toLowerCase();

    return "";
  }, [profileEmailOverride, searchParams, sessionEmail]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionEmail() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const text = await res.text();

        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        if (cancelled) return;
        if (!res.ok) return;

        const nextEmail =
          String(
            json?.user?.email ??
            json?.email ??
            ""
          ).trim().toLowerCase();

        if (nextEmail) {
          setSessionEmail(nextEmail);
        }
      } catch {
        // no-op: page can still work via ?email= or manual email entry
      }
    }

    loadSessionEmail();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a tentative name-based slug for uploads (only if no publicSlug yet)
  const tentativeNameSlug = useMemo(() => {
    const a = (firstName || "").trim();
    const b = (lastName || "").trim();
    if (!a && !b) return "";
    return toSlug([a, b].filter(Boolean).join(" "));
  }, [firstName, lastName]);

// Contact
const [email, setEmail] = useState<string>("");
const [emailPrivate, setEmailPrivate] = React.useState<boolean>(false);

const [phone, setPhone] = useState<string>("");
const [phonePrivate, setPhonePrivate] = React.useState<boolean>(false);

// Track which email we've already hydrated from the server
const [loadedEmail, setLoadedEmail] = useState<string | null>(null);

// Canonical email key for this player profile:
// - prefer resolved/session identity
// - only fall back to typed email if needed
const profileEmail = useMemo(
  () => (resolvedEmail || sessionEmail || email || "").trim().toLowerCase(),
  [resolvedEmail, sessionEmail, email]
);

// Track if the user has manually touched/changed the email input
const didEditEmailRef = useRef(false);

// Ensure we only adopt `resolvedEmail` once on first load
const adoptedResolvedOnceRef = useRef(false);

// Optional one-time cleanup: stop pre-filling email from older builds
useEffect(() => {
  try {
    if (process.env.NODE_ENV !== "production") {
      window.localStorage.removeItem("scoutlineEmail");
    }
  } catch {}
}, []);

// Adopt resolvedEmail ONCE on first load, and only if the user hasn't edited the email
useEffect(() => {
  if (adoptedResolvedOnceRef.current) return;

  if (!didEditEmailRef.current && resolvedEmail && !email) {
    setEmail(resolvedEmail);
    adoptedResolvedOnceRef.current = true;
  } else if (!resolvedEmail) {
    // No resolvedEmail to adopt; mark as done so we don't adopt later if it appears
    adoptedResolvedOnceRef.current = true;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [resolvedEmail]);

  // Refs for error focusing
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const gradYearRef = useRef<HTMLInputElement | null>(null);
  const heightInRef = useRef<HTMLInputElement | null>(null);
  const ageRef = useRef<HTMLInputElement | null>(null);
  const dobRef = useRef<HTMLInputElement | null>(null);
  const genderRef = useRef<HTMLSelectElement | null>(null);

  // --- Photo state (single source of truth) ---
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [optimizingPhoto, setOptimizingPhoto] = useState(false);

  // Baseball profile
  const [gradYear, setGradYear] = useState<string>("");
  const [primaryPos, setPrimaryPos] = useState<(typeof POS_OPTIONS)[number] | "">("");
  const [secondaryPos, setSecondaryPos] = useState<(typeof SECONDARY_OPTIONS)[number] | "">("");

  const [isPitcher, setIsPitcher] = useState<(typeof YES_NO)[number] | "">("");
  const [pitcherHand, setPitcherHand] = useState<(typeof PITCHER_HAND)[number] | "">("");

  const [throwsHand, setThrowsHand] = useState<(typeof THROWS_OPTIONS)[number] | "">("");
  const [batsSide, setBatsSide] = useState<(typeof BATS_OPTIONS)[number] | "">("");

  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [weightLb, setWeightLb] = useState<string>("");

  // Age / DOB (+ private) / Gender
  const [age, setAge] = useState<string>("");
  const [dob, setDob] = useState<string>(""); // mm/dd/yyyy
  const [dobPrivate, setDobPrivate] = useState<boolean>(false); // start unchecked
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number] | "">("");

  // --- Academics / Athletics: High School info ---
  const [hsName, setHsName] = useState<string>("");
  const [hsCity, setHsCity] = useState<string>(""); // 2-letter
  const [hsState, setHsState] = useState<string>("");
  const [hsGeneralWebsiteUrl, setHsGeneralWebsiteUrl] = useState<string>(""); // Academics: school main website
  const [hsScheduleUrl, setHsScheduleUrl] = useState<string>("");
  const [hsWebsiteUrl, setHsWebsiteUrl] = useState<string>(""); // Athletics: HS team/baseball website
  const [hsSchedulePrivate, setHsSchedulePrivate] = useState<boolean>(false); // default Public

  // NEW: GPA + tests + docs
  const [gpa, setGpa] = useState<string>("");
  const [gpaScale, setGpaScale] = useState<"5.0" | "4.0" | "100" | "">("");
  const [sat, setSat] = useState<string>("");
  const [act, setAct] = useState<string>("");
  const [areasOfStudyInput, setAreasOfStudyInput] = useState<string>("");
  const [academicDocs, setAcademicDocs] = useState<File[]>([]);
  const [docUrls, setDocUrls] = useState<string[]>([]); // preview URLs for chips

    // 🔗 Persisted academic document URLs for the public profile (saved to playerProfile.data)
  // Single-slot (first one wins in public UI):
  const [reportCardUrl, setReportCardUrl] = useState<string>(""); // "Report Card / Transcripts" single upload
  const [transcriptUrl, setTranscriptUrl] = useState<string>("");  // optional separate single (if you use it)
  // Multi-file "Additional Academic Documents":
  const [additionalDocs, setAdditionalDocs] = useState<Array<{ url: string; label?: string | null }>>([]);

  // NEW: Academic Bio
  const [academicBio, setAcademicBio] = useState<string>("");
  const [academicBioPrivate, setAcademicBioPrivate] = useState<boolean>(false); // default Public

  // NEW: Eligibility center registration
  const [eligibilityRegistered, setEligibilityRegistered] = useState<boolean>(false);

  // --- Athletics: governing-body IDs ---
const [ncaaId, setNcaaId] = React.useState<string>("");
const [naiaEcid, setNaiaEcid] = React.useState<string>("");

  // College commitment
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [committedProgram, setCommittedProgram] = useState<string>("");
  const [committedProgramId, setCommittedProgramId] = useState<string | null>(null);

  // Typeahead results/loading
  const [collegeOptions, setCollegeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [collegeSearching, setCollegeSearching] = useState(false);
  const collegeSearchAbort = useRef<AbortController | null>(null);

  // Travel Team
  const [travelTeamName, setTravelTeamName] = useState<string>("");
  const [travelTeamCity, setTravelTeamCity] = useState<string>("");
  const [travelTeamState, setTravelTeamState] = useState<string>("");
  const [travelTeamScheduleUrl, setTravelTeamScheduleUrl] = useState<string>("");
  const [travelTeamWebsiteUrl, setTravelTeamWebsiteUrl] = useState<string>(""); // NEW: travel team website
  const [travelTeamSchedulePrivate, setTravelTeamSchedulePrivate] = useState<boolean>(false);

  // Other Teams (unlimited)
  const [otherTeams, setOtherTeams] = useState<OtherTeam[]>([]);

  // Plan & Stats seasons
  const [planTier, setPlanTier] =
    useState<"Redshirt" | "Walk-On" | "All-American" | "Teams" | "">("");

  // NEW: Player Bio (Athletics)
  const [playerBio, setPlayerBio] = useState<string>("");
  const [playerBioPrivate, setPlayerBioPrivate] = useState<boolean>(false);

  // --- NEW: Metrics state (arrays per metric key) ---
  const [homeToFirstEntries, setHomeToFirstEntries] = useState<MetricEntry[]>([]);
  const [sixtyYdDashEntries, setSixtyYdDashEntries] = useState<MetricEntry[]>([]);
  const [exitVeloEntries, setExitVeloEntries] = useState<MetricEntry[]>([]);
  const [rawThrowVeloEntries, setRawThrowVeloEntries] = useState<MetricEntry[]>([]);
  const [infieldThrowVeloEntries, setInfieldThrowVeloEntries] = useState<MetricEntry[]>([]);   // NEW
  const [outfieldThrowVeloEntries, setOutfieldThrowVeloEntries] = useState<MetricEntry[]>([]); // NEW
  const [avgFbVeloEntries, setAvgFbVeloEntries] = useState<MetricEntry[]>([]);
  const [avgChVeloEntries, setAvgChVeloEntries] = useState<MetricEntry[]>([]);
  const [avgBbVeloEntries, setAvgBbVeloEntries] = useState<MetricEntry[]>([]);
  const [popTimeEntries, setPopTimeEntries] = useState<MetricEntry[]>([]);
  const [catcherThrowVeloEntries, setCatcherThrowVeloEntries] = useState<MetricEntry[]>([]);   // NEW

  // Strength metrics
  const [benchPressEntries, setBenchPressEntries] = useState<MetricEntry[]>([]);
  const [squatEntries, setSquatEntries] = useState<MetricEntry[]>([]);
  const [deadLiftEntries, setDeadLiftEntries] = useState<MetricEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const [metricPrivate, setMetricPrivate] = useState({
    homeToFirst: false,
    sixtyYdDash: false,
    exitVelo: false,
    rawThrowVelo: false,
    infieldThrowVelo: false,
    outfieldThrowVelo: false,
    catcherThrowVelo: false,
    avgFbVelo: false,
    avgChVelo: false,
    avgBbVelo: false,
    popTime: false,
    benchPress: false,
    squat: false,
    deadLift: false,
  });

  // Notices
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [photoInfoMsg, setPhotoInfoMsg] = useState<string | null>(null);
// ===== ANCHOR: GLOBAL ERROR STATE =====
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// ✅ Real slug when server has issued one; otherwise a preview from first+last (labelled as inactive)
const hasRealSlug = Boolean(publicSlug);
const linkSlug = hasRealSlug ? publicSlug : (tentativeNameSlug || null);

// ✅ Upload-only slug: safe fallback to email local-part (hyphenated) if no public slug yet
// ✅ Upload slug can fall back to email local-part (hyphenated) until a slug exists
const uploadSlug = React.useMemo(() => {
  if (publicSlug) return publicSlug; // as soon as server slug exists, use it
  if (tentativeNameSlug) return tentativeNameSlug; // prefer name-based for pre-upload
  const local = email?.includes("@") ? email.split("@")[0] : "";
  return local ? local.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "";
}, [publicSlug, tentativeNameSlug, email]);

  // NEW: field-specific errors
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  // Pitcher hand visibility + metric visibility
  const showPitcherHand =
    primaryPos === "P" || secondaryPos === "P" || isPitcher === "Yes";
  const showPitcherMetrics = showPitcherHand;
  const showCatcherMetrics = primaryPos === "C" || secondaryPos === "C";

  // NEW: metrics visibility by position
  const hasInfieldPos =
    primaryPos === "1B" || primaryPos === "2B" || primaryPos === "SS" || primaryPos === "3B" ||
    secondaryPos === "1B" || secondaryPos === "2B" || secondaryPos === "SS" || secondaryPos === "3B";

  const hasOutfieldPos =
    primaryPos === "LF" || primaryPos === "CF" || primaryPos === "RF" ||
    secondaryPos === "LF" || secondaryPos === "CF" || secondaryPos === "RF";

  const hasUtilityPos =
    primaryPos === "Utility" || secondaryPos === "Utility";

  const showInfieldVelo = hasInfieldPos;
  const showOutfieldVelo = hasOutfieldPos;
  const showRawThrowVelo = hasUtilityPos;

  const isParentMode = mode === "parent";
  const isTeamAdminMode = mode === "team-admin";
  const safe = (v: string) => (v.trim() ? v.trim() : null);
  const numOrNull = (v: string) => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  // ✅ Handedness coercion for Prisma union type: "" | "R" | "L" | "S" | null
  const asHand = (v: any): "" | "R" | "L" | "S" | null => {
    const s = String(v ?? "").trim().toUpperCase();
    if (s === "R" || s === "L" || s === "S") return s;
    if (s === "") return "";
    return null;
  };

  function onPhoneChange(v: string) {
    setPhone(formatPhone(v));
  }

  // Stats: team options come from Athletics tab entries
  const teamOptions = useMemo(() => {
    const out: string[] = [];
    if (hsName.trim()) out.push(hsName.trim());
    if (travelTeamName.trim()) out.push(travelTeamName.trim());
    otherTeams.forEach(t => { if (t.name?.trim()) out.push(t.name.trim()); });
    return Array.from(new Set(out));
  }, [hsName, travelTeamName, otherTeams]);

  // Chronological ordering within a year: Fall > Summer > Spring > Winter
  const SEASON_TERM_ORDER: Record<(typeof SEASON_TERMS)[number], number> = {
    Winter: 0,
    Spring: 1,
    Summer: 2,
    Fall: 3,
  };

  function rankYear(s: StatsSeason) {
    // No year yet? Treat as most recent so it appears right under the Add button.
    return s.seasonYear == null ? Number.POSITIVE_INFINITY : s.seasonYear;
  }
function rankTerm(s: StatsSeason) {
  // No term yet? Treat as most recent among same-year items.
  const term = s.seasonTerm?.trim();
  if (!term) return Number.POSITIVE_INFINITY;

  if (term === "Winter" || term === "Spring" || term === "Summer" || term === "Fall") {
    return SEASON_TERM_ORDER[term];
  }

  return -1;
  // tie-breaker handled in sortSeasonsDesc
}

  function sortSeasonsDesc(arr: StatsSeason[]) {
    return [...arr].sort((a, b) => {
      const ya = rankYear(a), yb = rankYear(b);
      if (ya !== yb) return yb - ya; // newer year (or blank) first
      const ta = rankTerm(a), tb = rankTerm(b);
      if (ta !== tb) return tb - ta; // Fall..Winter, blanks first
      // tie-breaker: newest created goes first
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  }

  // Hitting stats type & helpers
  type HittingStats = {
    avg: number | null;   // 3 dp
    gp: number | null;    // int
    pa: number | null;    // int
    ab: number | null;    // int
    obp: number | null;   // 3 dp
    slg: number | null;   // 3 dp
    ops: number | null;   // 3 dp
    h: number | null;     // int
    oneB: number | null;  // int (1B)
    twoB: number | null;  // int (2B)
    threeB: number | null;// int (3B)
    hr: number | null;    // int
    rbi: number | null;   // int
    r: number | null;     // int
    bb: number | null;    // int
    so: number | null;    // int
    hbp: number | null;   // int
    sb: number | null;    // int
    sbPct: number | null; // 3 dp
  };

  const EMPTY_HITTING: HittingStats = {
  avg: null,
  gp: null,
  pa: null,
  ab: null,
  obp: null,
  slg: null,
  ops: null,
  h: null,
  oneB: null,
  twoB: null,
  threeB: null,
  hr: null,
  rbi: null,
  r: null,
  bb: null,
  so: null,
  hbp: null,
  sb: null,
  sbPct: null,
};

  // Fielding stats type & helpers
  type FieldingStats = {
    fpct: number | null; // Fielding Percentage (three decimals)
    tc: number | null;   // Total Chances
    a: number | null;    // Assists
    po: number | null;   // Put Outs
    e: number | null;    // Errors
  };

  const EMPTY_FIELDING: FieldingStats = {
    fpct: null,
    tc: null,
    a: null,
    po: null,
    e: null,
  };

  type CatchingStats = {
    inn: number | null; // Innings (1 dp)
    pb:  number | null; // Passed Balls
    sb:  number | null; // Stolen Bases Allowed
    cs:  number | null; // Caught Stealing
  };

  const EMPTY_CATCHING: CatchingStats = {
    inn: null,
    pb:  null,
    sb:  null,
    cs:  null,
  };

  const intOrNull = (v: string) => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const decOrNull = (v: string) => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Pitching stats type & helpers
  type PitchingStats = {
    era: number | null;      // ERA (3dp)
    ip: number | null;       // Innings Pitched (1dp)
    gp: number | null;       // Games Played
    gs: number | null;       // Games Started
    bf: number | null;       // Batters Faced
    pitches: number | null;  // #P
    w: number | null;        // Wins
    l: number | null;        // Losses
    sv: number | null;       // Saves
    h: number | null;        // Hits Allowed
    r: number | null;        // Runs Allowed
    er: number | null;       // Earned Runs
    bb: number | null;       // Walks Allowed
    so: number | null;       // Strike Outs
    hbp: number | null;      // Hit by Pitch
    wp: number | null;       // Wild Pitches
    pPerIp: number | null;   // P/IP (1dp)
    pPerBf: number | null;   // P/BF (3dp)
    sPct: number | null;     // Strike % (2dp)
    fpsPct: number | null;   // First Pitch Strike % (2dp)
    weakPct: number | null;  // Weak Contact % (2dp)
    babip: number | null;    // Batting Average on Balls in Play (3dp)
    baRisp: number | null;   // Batting Average with Runners in Scoring Position (3dp)
  };

  const EMPTY_PITCHING: PitchingStats = {
    era: null, ip: null, gp: null, gs: null, bf: null, pitches: null,
    w: null, l: null, sv: null, h: null, r: null, er: null, bb: null, so: null,
    hbp: null, wp: null, pPerIp: null, pPerBf: null, sPct: null, fpsPct: null,
    weakPct: null, babip: null, baRisp: null,
  };

// ---- Stats tab state & helpers ----
type StatsSeason = {
  id: string;
  seasonTerm: string | null;
  seasonYear: number | null;
  team: string;
  statsFiles?: File[];
  statsFileUrls?: string[];
  createdAt?: number;
  hitting?: HittingStats;
  fielding?: FieldingStats;
  catching?: CatchingStats;
  pitching?: PitchingStats;
  pitchTypes?: string[];
  statsMappedFrom?: string | null;
};

const [statsSeasons, setStatsSeasons] = useState<StatsSeason[]>([]);

// Public visibility depends on plan
const statsPublic = useMemo(
  () => ["Walk-On", "All-American", "Teams"].includes(planTier),
  [planTier]
);

const metricsPublic = useMemo(
  () => ["Walk-On", "All-American", "Teams"].includes(planTier),
  [planTier]
);

// Year options (newest first)
const yearOptions = useMemo(() => {
  const current = new Date().getFullYear();
  const start = current - 4;   // adjust to taste
  const end   = current + 2;   // adjust to taste
  const years: number[] = [];
  for (let y = end; y >= start; y--) years.push(y);
  return years;
}, []);

// Add / update / remove a season
function addStatsSeason() {
  const s: StatsSeason = {
    id: uid(),
    seasonTerm: "",
    seasonYear: null,
    team: "",
    statsFiles: [],
    statsFileUrls: [],
    createdAt: Date.now(),
    hitting: undefined,
    fielding: undefined,
    catching: undefined,
    pitching: undefined,
    pitchTypes: [],
    statsMappedFrom: undefined,
  };
  setStatsSeasons(prev => sortSeasonsDesc([...prev, s]));
}

function updateStatsSeason(id: string, patch: Partial<StatsSeason>) {
  setStatsSeasons(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
}

function removeStatsSeason(id: string) {
  setStatsSeasons(prev => prev.filter(s => s.id !== id));
}

/**
 * Upload stats file(s) for a given season:
 *  - POST to /api/upload/stats
 *  - send `slug` form field (NOT playerSlug)
 *  - store returned URLs into statsFileUrls
 */
async function onPickStatFiles(seasonId: string, files: FileList | null) {
  if (!files || files.length === 0) return;

  // Accept only csv/xls/xlsx/pdf
  const picked = Array.from(files).filter((f) => {
    const n = f.name.toLowerCase();
    return (
      n.endsWith(".csv") ||
      n.endsWith(".xls") ||
      n.endsWith(".xlsx") ||
      n.endsWith(".pdf")
    );
  });
  if (picked.length === 0) return;

  // Stable player slug for the folder – rely on uploadSlug (built from slug/name/email)
  const playerSlug = (uploadSlug || "").trim();

  if (!playerSlug) {
    setErr("Please enter your name or email first so we can create your upload folder.");
    return;
  }

  const uploadedUrls: string[] = [];

  for (const f of picked) {
    const fd = new FormData();
    fd.append("file", f);
    // IMPORTANT: this key MUST be "slug" to match app/api/upload/stats/route.ts
    fd.append("slug", playerSlug);

    try {
      const res = await fetch("/api/upload/stats", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      console.log("Stats upload response:", json);

      if (!res.ok || !json?.ok || !json?.url) {
        throw new Error(json?.error || "Upload failed");
      }

      uploadedUrls.push(String(json.url));
    } catch (e: any) {
      console.error("Stats upload failed:", e);
      setErr(e?.message || "Stats upload failed");
      // continue to next file
    }
  }

  if (uploadedUrls.length === 0) {
    // Nothing actually uploaded; bail.
    return;
  }

  // Update local state with real URLs for chips + saving to DB
  setStatsSeasons((prev) =>
    prev.map((s) =>
      s.id === seasonId
        ? {
            ...s,
            statsFiles: [...(s.statsFiles ?? []), ...picked],
            statsFileUrls: [...(s.statsFileUrls ?? []), ...uploadedUrls],
          }
        : s
    )
  );

  transientSaved?.();
}

/** Remove a single file URL from a season */
function removeStatFile(seasonId: string, fileIndex: number) {
  setStatsSeasons((prev) =>
    prev.map((s) => {
      if (s.id !== seasonId) return s;
      const urls = [...(s.statsFileUrls ?? [])];
      urls.splice(fileIndex, 1);
      return { ...s, statsFileUrls: urls };
    })
  );
  transientSaved?.();
}

  // Phone format (national)
  function formatPhone(input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 10);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 10);
    if (digits.length > 6) return `(${p1}) ${p2}-${p3}`;
    if (digits.length > 3) return `(${p1}) ${p2}`;
    if (digits.length > 0) return `(${p1}`;
    return "";
  }

  // --- Mobile detection (client-only) ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(ua));
  }, []);

  // Clear "Saved!" whenever the user edits anything
  useEffect(() => {
    if (msg) setMsg(null);
  }, [
    firstName, lastName, hometownCity, hometownState, hometownZip, email, emailPrivate, phone, phonePrivate,
    hometownCity, hometownState,
    photoFile, photoPreview, gradYear, primaryPos, secondaryPos, isPitcher, pitcherHand,
    throwsHand, batsSide, heightFt, heightIn, weightLb, age, dob, dobPrivate, gender,
    hsName, hsCity, hsState, hsGeneralWebsiteUrl, hsScheduleUrl, hsWebsiteUrl, hsSchedulePrivate,
    gpa, gpaScale, sat, act, academicDocs, academicBio, academicBioPrivate,
    eligibilityRegistered,
    // commitment
    isCommitted, committedProgram, committedProgramId,
    // travel team
    travelTeamName, travelTeamCity, travelTeamState, travelTeamScheduleUrl, travelTeamWebsiteUrl, travelTeamSchedulePrivate,
    // other teams
    otherTeams,
    // NEW: player bio
    playerBio, playerBioPrivate,
    // NEW: metrics
    homeToFirstEntries,
    sixtyYdDashEntries,
    exitVeloEntries,
    rawThrowVeloEntries,
    infieldThrowVeloEntries,     // NEW
    outfieldThrowVeloEntries,    // NEW
    avgFbVeloEntries,
    avgChVeloEntries,
    avgBbVeloEntries,
    popTimeEntries,
    catcherThrowVeloEntries,     // NEW
    benchPressEntries,
    squatEntries,
    deadLiftEntries,
    // NEW: metric privacy flags
    metricPrivate,
  ]);

// Cleanup timers on unmount
useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearMsgTimerRef.current) clearTimeout(clearMsgTimerRef.current);
    };
  }, []);

  // College search (debounced)
  useEffect(() => {
    if (!isCommitted) {
      setCollegeOptions([]);
      return;
    }

    const q = committedProgram.trim();
    if (q.length < 2) {
      setCollegeOptions([]);
      return;
    }

    if (collegeSearchAbort.current) collegeSearchAbort.current.abort();
    const ctrl = new AbortController();
    collegeSearchAbort.current = ctrl;

    setCollegeSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/colleges/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();

        // Accept either {items:[...]} or a raw array
        const items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
        const opts = items
          .map((it: any) => ({
            id: String(it.id ?? it.slug ?? it.unitid ?? it.name ?? ""),
            name: String(it.name ?? it.title ?? ""),
          }))
          .filter((o: { name: string; id: string }) => o.name.trim().length > 0);

        setCollegeOptions(opts.slice(0, 10));
      } catch {
        if (!ctrl.signal.aborted) setCollegeOptions([]);
      } finally {
        if (!ctrl.signal.aborted) setCollegeSearching(false);
      }
    }, 200); // small debounce

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [isCommitted, committedProgram]);

  // DOB mask mm/dd/yyyy
  function onDobChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const m = digits.slice(0, 2);
    const d = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    let out = m;
    if (d) out += `/${d}`;
    if (y) out += `/${y}`;
    setDob(out);
  }

  // Age helpers
  function parseDob(dob: string): Date | null {
    const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
    return dt;
  }
  function computeAgeFromDob(dob: string, ref: Date = new Date()): number | null {
    const d = parseDob(dob);
    if (!d) return null;
    let age = ref.getFullYear() - d.getFullYear();
    const hadBirthday =
      ref.getMonth() > d.getMonth() ||
      (ref.getMonth() === d.getMonth() && ref.getDate() >= d.getDate());
    if (!hadBirthday) age--;
    return age;
  }
  // Compute age at a given metric monthYear ("MM/YYYY")
  function computeAgeAtMonthYear(dob: string, monthYear: string): number | null {
    const dobDate = parseDob(dob);
    if (!dobDate) return null;
    const norm = normalizeToMMYYYY(monthYear);
    if (!norm) return null;
    const [mm, yyyy] = norm.split("/").map(Number);
    const asOf = new Date(yyyy, mm - 1, 1);
    return computeAgeFromDob(dob, asOf);
  }
  function isDobValid(dob: string) {
    return parseDob(dob) !== null;
  }

  // Auto-calc age whenever DOB is valid
  useEffect(() => {
    const a = computeAgeFromDob(dob);
    if (a != null) setAge(String(a));
  }, [dob]);

    // (B) Photo: select, optionally compress, then preview
  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setPhotoInfoMsg(null);
    const f = e.target.files?.[0] || null;

    if (!f) {
      setPhotoFile(null);
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      return;
    }

    const type = (f.type || "").toLowerCase();
    const name = (f.name || "").toLowerCase();
    const typeOk =
      ALLOWED_MIME.has(type) ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp") ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");

    if (!typeOk) {
      setErr("Only JPG, PNG, WEBP, or HEIC/HEIF images are allowed.");
      return;
    }

    if (f.size > MAX_PHOTO_BYTES) {
      setErr(`File too large (max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)}MB).`);
      return;
    }

    try {
      const wasLarge = f.size > 2 * 1024 * 1024;

      if (wasLarge) {
        setOptimizingPhoto(true);
      }

  const compressed = await compressImageFile(f, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    outputType: "image/jpeg",
  });

  setPhotoFile(compressed);

  if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
  setPhotoPreview(URL.createObjectURL(compressed));

  // Show friendly info message if compression happened
  if (wasLarge) {
    const beforeMB = (f.size / 1024 / 1024).toFixed(1);
    const afterMB = (compressed.size / 1024 / 1024).toFixed(1);

    setPhotoInfoMsg(
      `Large image detected — optimized for faster upload (${beforeMB}MB → ${afterMB}MB).`
    );
  } else {
    setPhotoInfoMsg(null);
  }
} catch (err) {
  console.error("Photo compression failed:", err);
  setPhotoInfoMsg(null);

      // Fall back to original file if compression fails for any reason
      setPhotoFile(f);

      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(f));
    } finally {
      setOptimizingPhoto(false);
    }
  }

  // (C) Photo: upload to /api/player/photo
  async function onUploadPhoto(userSlug?: string) {
    // compute a slug if not supplied by the child
    const fallbackSlug =
      (publicSlug ?? "") ||
      (email?.includes("@") ? email.split("@")[0] : "") ||
      "";

    const slugToUse = (userSlug || fallbackSlug).trim();
    if (!photoFile || !slugToUse) return;

    setUploadingPhoto(true); // <-- use the dedicated flag, not the form's "submitting"
    try {
      const fd = new FormData();
      fd.append("file", photoFile);
      fd.append("userSlug", slugToUse);

      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });

      const raw = await res.text();
      let json: any = null;

      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const message =
          json?.error ||
          (raw && raw.trim()) ||
          "Upload failed";
        throw new Error(message);
      }

      if (!json?.ok || !json?.url) {
        throw new Error(json?.error || "Upload failed");
      }

      // use the permanent https URL for preview so the UI matches the public page immediately
      setPhotoPreview(json.url || null);
      setPhotoFile(null); // clear the local file selection
      transientSaved();
    } catch (e: any) {
      console.error(e);

      const rawMsg = String(e?.message || "").trim();
      const friendly =
        /entity too large|payload too large|request entity too large/i.test(rawMsg)
          ? "Profile photo upload failed because the file is too large. Please use a smaller image."
          : rawMsg || "Upload failed";

      setErr(friendly);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // NEW: Photo remove (client + optional server delete)
  async function onRemovePhoto() {
    setUploadingPhoto(true); // <-- scoped "busy" for photo ops
    setErr(null);
    try {
      // If you have a dedicated DELETE endpoint, call it — otherwise just clear client state.
      // We'll try to call your existing endpoint with email for back-compat:
      const q = encodeURIComponent((email || "").trim().toLowerCase());
      if (q) {
        try {
          const res = await fetch(`/api/player/photo?email=${q}`, { method: "DELETE" });
          if (!res.ok && res.status !== 404) {
            console.warn("Photo delete failed:", await res.text());
          }
        } catch {
          // ignore network errors
        }
      }
    } finally {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      setPhotoFile(null);
      setUploadingPhoto(false);
      transientSaved();
    }
  }

  // Academics docs: add/append files
  function onPickAcademicDocs(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const accepted = arr.filter((f) => {
      const type = (f.type || "").toLowerCase();
      if (DOC_ALLOWED.has(type)) return true;
      const n = f.name.toLowerCase();
      return n.endsWith(".pdf") || n.endsWith(".doc") || n.endsWith(".docx") || n.endsWith(".xls") || n.endsWith(".xlsx");
    });
    if (accepted.length !== arr.length) {
      setErr("Only PDF, Word (.doc/.docx), or Excel (.xls/.xlsx) files are allowed");
    }
    setAcademicDocs((prev) => [...prev, ...accepted]);
  }

  // Build/revoke object URLs for selected docs
  useEffect(() => {
    const urls = academicDocs.map((f) => URL.createObjectURL(f));
    setDocUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [academicDocs]);

  function removeAcademicDoc(index: number) {
    setAcademicDocs((prev) => prev.filter((_, i) => i !== index));
  }

// Prefill on mount (hydrate once per email)
useEffect(() => {
  let cancelled = false;

  async function loadProfile() {
    try {
      const chosen = profileEmail;
      if (!chosen) return;                 // nothing to fetch yet
      if (chosen === loadedEmail) return;  // already hydrated this email

        const q = encodeURIComponent(chosen);
        const res = await fetch(`/api/player/profile?email=${q}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json?.ok) return;

        const u = json.user || {};
        const norm = json.normalized || {};
        const src: any = norm || {};

        // slug / photo come primarily from the User row, but fall back to normalized if present
        setPublicSlug(u.slug ?? src.slug ?? null);

        const photo = u.photoUrl ?? src.photoUrl;
        if (photo) setPhotoPreview(photo);

        // Backfill email from the authenticated/saved profile identity
        if (!didEditEmailRef.current) {
          const hydratedEmail = String(u.email ?? chosen ?? "").trim().toLowerCase();
          if (hydratedEmail) {
            setEmail(hydratedEmail);
          }
        }

        // Core: name + contact
        if (src.firstName != null) setFirstName(src.firstName);
        if (src.lastName != null) setLastName(src.lastName);

        setEmailPrivate(Boolean(src.emailPrivate));
        setPhone(src.phone ?? "");
        setPhonePrivate(Boolean(src.phonePrivate));

        // Core / Athletics prefill
        setGradYear(src.gradYear != null ? String(src.gradYear) : "");
        setPrimaryPos(src.primaryPos ?? "");
        setSecondaryPos(src.secondaryPos ?? "");
        setIsPitcher((src.isPitcher as any) ?? ""); // keep "Yes" | "No" | ""
        setPitcherHand(src.pitcherHand ?? "");
        setThrowsHand(src.throws ?? "");
        setBatsSide(src.bats ?? "");

        setHeightFt(src.heightFt != null ? String(src.heightFt) : "");
        setHeightIn(src.heightIn != null ? String(src.heightIn) : "");
        setWeightLb(src.weightLb != null ? String(src.weightLb) : "");

        setAge(src.age != null ? String(src.age) : "");
        setDob(src.dob ?? "");
        setDobPrivate(src.dobPrivate ?? false);
        setGender(src.gender ?? "");

        // Academics / Athletics prefill
        setHsName(src.hsName ?? "");
        // Prefer dedicated hsCity/hsState but fall back to hometown/state for older records
        setHsCity((src as any).hsCity ?? src.hometown ?? "");
        setHsState((src as any).hsState ?? src.state ?? "");
        setHsGeneralWebsiteUrl((src as any).hsGeneralWebsiteUrl ?? "");

        // Core: Hometown (city/state)
        setHometownCity(src.hometown ?? (src as any).hsCity ?? "");
        setHometownState(src.state ?? (src as any).hsState ?? "");
        setHometownZip((src as any).zip ?? (src as any).hometownZip ?? "");

        // GPA / tests
        setGpa(
          src.gpa != null && src.gpa !== ""
            ? String(src.gpa)
            : ""
        );
        setGpaScale(src.gpaScale ?? "");
        setSat(
          src.sat != null && src.sat !== ""
            ? String(src.sat)
            : ""
        );
        setAct(
          src.act != null && src.act !== ""
            ? String(src.act)
            : ""
        );

        // Academic Bio prefill
        setAcademicBio(src.academicBio ?? "");
        setAcademicBioPrivate(Boolean(src.academicBioPrivate) ?? false);

        // Intended majors prefill (accept array or CSV/string)
        if (Array.isArray(src.areasOfStudy) && src.areasOfStudy.length > 0) {
          setAreasOfStudyInput(
            src.areasOfStudy
              .map((s: any) => String(s ?? "").trim())
              .filter(Boolean)
              .join(", ")
          );
        } else if (typeof src.areasOfStudyInput === "string") {
          setAreasOfStudyInput(src.areasOfStudyInput);
        } else {
          setAreasOfStudyInput("");
        }

        // 🔗 Prefill persisted Academic Docs (single + multi) – keep using norm here
        const firstReportCard =
          (Array.isArray(norm.reportCardUrls) && norm.reportCardUrls[0]) ||
          (Array.isArray(norm.reportCards) && norm.reportCards[0]) ||
          "";

        const firstTranscript =
          (Array.isArray(norm.transcriptUrls) && norm.transcriptUrls[0]) ||
          (Array.isArray(norm.transcripts) && norm.transcripts[0]) ||
          "";

        setReportCardUrl(firstReportCard || ""); // primary single slot
        setTranscriptUrl(firstTranscript || ""); // optional second single slot

        // Multi-file "Additional Academic Documents"
        const extras =
          (Array.isArray(norm.otherAcademicDocs)
            ? norm.otherAcademicDocs
            : Array.isArray(norm.otherDocs)
            ? norm.otherDocs
            : []) as Array<{ url?: string; label?: string | null }>;

        setAdditionalDocs(
          extras
            .filter((d) => d && typeof d.url === "string" && d.url) // keep only valid links
            .map((d) => ({ url: d.url!, label: d.label ?? null }))
        );

        // Eligibility registration prefill
        setEligibilityRegistered(Boolean(src.eligibilityRegistered) ?? false);

        // NCAA / NAIA IDs prefill
        setNcaaId(
          String((src as any)?.ncaaId ?? "")
            .replace(/\D+/g, "")
            .slice(0, 10)
        );
        setNaiaEcid(String((src as any)?.naiaEcid ?? "").trim());

        // Commitment prefill (from profile payload, not user)
        setIsCommitted(Boolean(src.isCommitted) ?? false);
        setCommittedProgram(src.committedProgram ?? "");
        setCommittedProgramId(src.committedProgramId ?? null);

        // High school schedule / website prefill
        setHsScheduleUrl(src.hsScheduleUrl ?? "");
        setHsWebsiteUrl(src.hsWebsiteUrl ?? "");
        setHsSchedulePrivate(Boolean(src.hsSchedulePrivate) ?? false);

        // Travel team prefill (from profile payload)
        setTravelTeamName(src.travelTeamName ?? "");
        setTravelTeamCity(src.travelTeamCity ?? "");
        setTravelTeamState(src.travelTeamState ?? "");
        setTravelTeamScheduleUrl(src.travelTeamScheduleUrl ?? "");
        setTravelTeamWebsiteUrl(src.travelTeamWebsiteUrl ?? "");
        setTravelTeamSchedulePrivate(Boolean(src.travelTeamSchedulePrivate) ?? false);

        // Plan tier (for Stats/Metrics permissions)
        if (typeof src.planTier === "string" && src.planTier) {
          setPlanTier(src.planTier as any);
        }

        // Other teams prefill (array-first, from profile payload)
        if (Array.isArray(src.otherTeams) && src.otherTeams.length > 0) {
          setOtherTeams(
            src.otherTeams.map((t: any) => ({
              id: uid(),
              name: (t?.name ?? "").trim(),
              city: (t?.city ?? "").trim(),
              state: (t?.state ?? "").trim(),
              scheduleUrl: (t?.scheduleUrl ?? "").trim(),
              websiteUrl: (t?.websiteUrl ?? "").trim(),
            }))
          );
        } else {
          const legacyHas =
            (src.otherTeamName ?? "") ||
            (src.otherTeamCity ?? "") ||
            (src.otherTeamState ?? "") ||
            (src.otherTeamScheduleUrl ?? "");
          setOtherTeams(
            legacyHas
              ? [
                  {
                    id: uid(),
                    name: src.otherTeamName ?? "",
                    city: src.otherTeamCity ?? "",
                    state: src.otherTeamState ?? "",
                    scheduleUrl: src.otherTeamScheduleUrl ?? "",
                    websiteUrl: "",
                  },
                ]
              : []
          );
        }

        // Prefill per-metric privacy (default false)
        {
          const mp = (norm.metricsPrivate ?? src.metricsPrivate ?? {}) as Record<string, boolean>;
          setMetricPrivate({
            homeToFirst: !!mp.homeToFirst,
            sixtyYdDash: !!mp.sixtyYdDash,
            exitVelo: !!mp.exitVelo,
            rawThrowVelo: !!mp.rawThrowVelo,
            infieldThrowVelo: !!mp.infieldThrowVelo,
            outfieldThrowVelo: !!mp.outfieldThrowVelo,
            catcherThrowVelo: !!mp.catcherThrowVelo,
            avgFbVelo: !!mp.avgFbVelo,
            avgChVelo: !!mp.avgChVelo,
            avgBbVelo: !!mp.avgBbVelo,
            popTime: !!mp.popTime,
            benchPress: !!mp.benchPress,
            squat: !!mp.squat,
            deadLift: !!mp.deadLift,
          });
        }

        // Player Bio prefill (from profile payload)
        setPlayerBio(src.playerBio ?? "");
        setPlayerBioPrivate(Boolean(src.playerBioPrivate) ?? false);

        // --- Metrics prefill (API guarantees shape on normalized) ---
        const m = (norm.metrics ?? src.metrics ?? {}) as Record<string, MetricEntry[]>;
        setHomeToFirstEntries(Array.isArray(m.homeToFirst) ? m.homeToFirst : []);
        setSixtyYdDashEntries(Array.isArray(m.sixtyYdDash) ? m.sixtyYdDash : []);
        setExitVeloEntries(Array.isArray(m.exitVelo) ? m.exitVelo : []);

        setRawThrowVeloEntries(Array.isArray(m.rawThrowVelo) ? m.rawThrowVelo : []);
        setInfieldThrowVeloEntries(Array.isArray(m.infieldThrowVelo) ? m.infieldThrowVelo : []);
        setOutfieldThrowVeloEntries(Array.isArray(m.outfieldThrowVelo) ? m.outfieldThrowVelo : []);
        setCatcherThrowVeloEntries(Array.isArray(m.catcherThrowVelo) ? m.catcherThrowVelo : []);

        setAvgFbVeloEntries(Array.isArray(m.avgFbVelo) ? m.avgFbVelo : []);
        setAvgChVeloEntries(Array.isArray(m.avgChVelo) ? m.avgChVelo : []);
        setAvgBbVeloEntries(Array.isArray(m.avgBbVelo) ? m.avgBbVelo : []);
        setPopTimeEntries(Array.isArray(m.popTime) ? m.popTime : []);

        // Strength metrics
        setBenchPressEntries(Array.isArray(m.benchPress) ? m.benchPress : []);
        setSquatEntries(Array.isArray(m.squat) ? m.squat : []);
        setDeadLiftEntries(Array.isArray(m.deadLift) ? m.deadLift : []);

                // --- NEW: Stats Seasons (Tab 5) prefill from normalized payload ---
        if (Array.isArray(norm.statsSeasons)) {
          const fromNorm = (norm.statsSeasons as any[]).map((s: any, idx: number) => {
            let seasonTerm = s.seasonTerm ?? null;
            let seasonYear = s.seasonYear ?? null;

            // Try to parse term/year from a combined "Season" like "Summer 2025"
            if (!seasonTerm && typeof s.season === "string") {
              const parts = String(s.season).split(" ").filter(Boolean);
              const maybeYear = Number(parts[parts.length - 1]);
              if (Number.isFinite(maybeYear)) {
                seasonYear = seasonYear ?? maybeYear;
                const term = parts.slice(0, parts.length - 1).join(" ");
                if (term) seasonTerm = term;
              }
            }

            return {
              id: uid(),
              seasonTerm: (seasonTerm || "") as StatsSeason["seasonTerm"],
              seasonYear: seasonYear ?? null,
              team: (s.team ?? "") as string,
              statsFiles: [], // nothing in memory on hydrate
              statsFileUrls: Array.isArray(s.statsFileUrls)
                ? s.statsFileUrls.filter((u: any) => typeof u === "string" && u)
                : [],
              createdAt:
                typeof s.createdAt === "number"
                  ? s.createdAt
                  : Date.now() + idx,
              hitting: s.hitting ?? null,
              fielding: s.fielding ?? null,
              catching: s.catching ?? null,
              pitching: s.pitching ?? null,
              pitchTypes: Array.isArray(s.pitchTypes) ? s.pitchTypes : [],
              statsMappedFrom: s.statsMappedFrom ?? null,
            } as StatsSeason;
          });

          setStatsSeasons(sortSeasonsDesc(fromNorm));
        }

        const a = computeAgeFromDob(u.dob ?? "");
        if (a != null) setAge(String(a));

        // ✅ mark this email as hydrated so we don't re-fetch it
        setLoadedEmail(chosen);
      } catch (err) {
        if (!cancelled) console.error("Failed to load profile:", err);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
}, [profileEmail, loadedEmail]);

  // Helper: transient "Saved!" with fade-out
  function transientSaved() {
    setErr(null);
    setMsg("Saved!");
    setSavedVisible(true);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (clearMsgTimerRef.current) clearTimeout(clearMsgTimerRef.current);

    fadeTimerRef.current = setTimeout(() => {
      setSavedVisible(false);
      clearMsgTimerRef.current = setTimeout(() => setMsg(null), 400);
    }, 1800);
  }

  // Switch to correct tab for a field error, then focus
  function gotoTabForField(key: string) {
    const fieldToTab: Record<string, Tab> = {
      // Core
      phone: "Core",
      hometownCity: "Core",
      hometownState: "Core",
      heightIn: "Core",
      age: "Core",
      dob: "Core",
      gender: "Core",
      // Academics
      gradYear: "Academics",
      hsName: "Academics",
      hsCity: "Academics",
      hsState: "Academics",
      hsGeneralWebsiteUrl: "Academics",
      gpa: "Academics",
      sat: "Academics",
      act: "Academics",
      academicBio: "Academics",
      // Athletics
      hsScheduleUrl: "Athletics",         // moved
      hsWebsiteUrl: "Athletics",
      primaryPos: "Athletics",
      secondaryPos: "Athletics",
      pitcherHand: "Athletics",
      throws: "Athletics",
      bats: "Athletics",
      travelTeamScheduleUrl: "Athletics",
      travelTeamWebsiteUrl: "Athletics",
      committedProgram: "Athletics",
      playerBio: "Athletics",
    };
    const t = fieldToTab[key] ?? "Athletics";
    if (t && t !== activeTab) setActiveTab(t);
  }

  // Focus first invalid field helper
  function focusFirstError(errors: Record<string, string>) {
    const order = [
      "dob","age","phone","hometownCity","hometownState","gender",
      "gradYear","heightIn","hsName","hsCity","hsState","hsGeneralWebsiteUrl",
      "hsScheduleUrl","hsWebsiteUrl","gpa","sat","act","academicBio",
      "travelTeamScheduleUrl","travelTeamWebsiteUrl","committedProgram","playerBio"
    ] as const;
    for (const key of order) {
      if (errors[key]) {
        gotoTabForField(key as string);
        if (key === "dob") dobRef.current?.focus();
        else if (key === "age") ageRef.current?.focus();
        else if (key === "phone") phoneRef.current?.focus();
        else if (key === "gender") genderRef.current?.focus();
        else if (key === "gradYear") gradYearRef.current?.focus();
        else if (key === "heightIn") heightInRef.current?.focus();
        return;
      }
    }
    gotoTabForField("otherTeams");
  }

  // UI helpers for Other Teams
  function addOtherTeam() {
    setOtherTeams((prev) => [
      ...prev,
      { id: uid(), name: "", city: "", state: "", scheduleUrl: "", websiteUrl: "" }, // ✅ include websiteUrl
    ]);
  }
  function updateOtherTeam(id: string, patch: Partial<OtherTeam>) {
    setOtherTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeOtherTeam(id: string) {
    setOtherTeams((prev) => prev.filter((t) => t.id !== id));
  }

  // --- Metric helpers (UI-local) ---
  function sortEntriesAsc(a: MetricEntry, b: MetricEntry) {
    const [am, ay] = a.monthYear.split("/").map(Number);
    const [bm, by] = b.monthYear.split("/").map(Number);
    const ad = new Date(ay, am - 1, 1).getTime();
    const bd = new Date(by, bm - 1, 1).getTime();
    return ad - bd;
  }

  // ---- Build academic doc links from the selected files (Tab 2) ----
// Uses the in-memory academicDocs (File[]) + their preview URLs (docUrls[]).
const otherAcademicDocsPayload =
  Array.isArray(academicDocs) && Array.isArray(docUrls)
    ? academicDocs
        .map((f, i) => ({
          url: (docUrls[i] || "").trim(),
          label: f?.name || null,
        }))
        .filter((d) => !!d.url)
    : [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // HS schedule URL check (now on Athletics)
    {
      const hasSchedule = !!hsScheduleUrl.trim();
      const scheduleValid = !hasSchedule || isLikelyUrl(hsScheduleUrl);
      if (!scheduleValid) {
        setFieldErr((prev) => ({ ...prev, hsScheduleUrl: "Enter a valid URL (http/https)" }));
        setErr("Please fix the highlighted fields.");
        gotoTabForField("hsScheduleUrl");
        return;
      } else if (fieldErr.hsScheduleUrl) {
        setFieldErr(({ hsScheduleUrl: _omit, ...rest }) => rest as any);
      }
    }

        // HS website URL check
    {
      const hasWebsite = !!hsWebsiteUrl.trim();
      const websiteValid = !hasWebsite || isLikelyUrl(hsWebsiteUrl);
      if (!websiteValid) {
        setFieldErr((prev) => ({ ...prev, hsWebsiteUrl: "Enter a valid URL (http/https)" }));
        setErr("Please fix the highlighted fields.");
        gotoTabForField("hsWebsiteUrl");
        return;
      } else if (fieldErr.hsWebsiteUrl) {
        setFieldErr(({ hsWebsiteUrl: _omit, ...rest }) => rest as any);
      }
    }

        // HS general website URL check (Academics)
    {
      const hasGeneralWebsite = !!hsGeneralWebsiteUrl.trim();
      const generalWebsiteValid = !hasGeneralWebsite || isLikelyUrl(hsGeneralWebsiteUrl);
      if (!generalWebsiteValid) {
        setFieldErr((prev) => ({ ...prev, hsGeneralWebsiteUrl: "Enter a valid URL (http/https)" }));
        setErr("Please fix the highlighted fields.");
        gotoTabForField("hsGeneralWebsiteUrl");
        return;
      } else if (fieldErr.hsGeneralWebsiteUrl) {
        setFieldErr(({ hsGeneralWebsiteUrl: _omit, ...rest }) => rest as any);
      }
    }

    // Travel Team schedule URL check
    {
      const hasTravel = !!travelTeamScheduleUrl.trim();
      const travelValid = !hasTravel || isLikelyUrl(travelTeamScheduleUrl);
      if (!travelValid) {
        setFieldErr((prev) => ({ ...prev, travelTeamScheduleUrl: "Enter a valid URL (http/https)" }));
        setErr("Please fix the highlighted fields.");
        gotoTabForField("travelTeamScheduleUrl");
        return;
      } else if (fieldErr.travelTeamScheduleUrl) {
        setFieldErr(({ travelTeamScheduleUrl: _omit, ...rest }) => rest as any);
      }
    }

        // Travel Team website URL check
    {
      const hasTravelWebsite = !!travelTeamWebsiteUrl.trim();
      const travelWebsiteValid = !hasTravelWebsite || isLikelyUrl(travelTeamWebsiteUrl);
      if (!travelWebsiteValid) {
        setFieldErr((prev) => ({ ...prev, travelTeamWebsiteUrl: "Enter a valid URL (http/https)" }));
        setErr("Please fix the highlighted fields.");
        gotoTabForField("travelTeamWebsiteUrl");
        return;
      } else if (fieldErr.travelTeamWebsiteUrl) {
        setFieldErr(({ travelTeamWebsiteUrl: _omit, ...rest }) => rest as any);
      }
    }

    // Other Teams schedule / website URLs
    for (let i = 0; i < otherTeams.length; i++) {
      const url = otherTeams[i].scheduleUrl?.trim() ?? "";
      if (url && !isLikelyUrl(url)) {
        setErr(`Please enter a valid Schedule URL for Other Team #${i + 1}.`);
        gotoTabForField("otherTeams");
        return;
      }
      const web = otherTeams[i].websiteUrl?.trim() ?? "";
      if (web && !isLikelyUrl(web)) {
        setErr(`Please enter a valid Website URL for Other Team #${i + 1}.`);
        gotoTabForField("otherTeams");
        return;
      }
    }

    // ✅ Committed: allow saving even if program is blank
    // (Clear any old committedProgram error but don't block submit.)
    if (fieldErr.committedProgram) {
      setFieldErr(({ committedProgram: _omit, ...rest }) => rest as any);
    }

    if (Object.keys(fieldErr).length > 0) {
      setErr("Please fix the highlighted fields.");
      focusFirstError(fieldErr);
      return;
    }

    setSubmitting(true);
    setMsg(null);
    setErr(null);

    try {
      // 🔐 Single canonical identity for this profile
      const canonicalEmail = (profileEmail || email || "").trim().toLowerCase();
      if (!canonicalEmail) {
        setErr("Please enter your email address so we can tie your profile to your login.");
        setSubmitting(false);
        setActiveTab("Core");
        return;
      }

      const ageComputed = isDobValid(dob) ? computeAgeFromDob(dob) : null;

// NEW: collect atomic payloads from Tab 6 & Tab 7
const vs = videoSocialRef.current?.getPayload();
const cr = coachesRef.current?.getPayload();

/**
 * VIDEO / SOCIAL SAVE SAFETY
 *
 * Only allow Video/Social fields into this save when:
 * 1) TabVideoSocial successfully hydrated from the server.
 * 2) The parent editor itself has hydrated this same canonical email.
 * 3) The email currently being passed to TabVideoSocial is the same
 *    player identity we're about to save.
 *
 * If any of those checks fail, OMIT Video/Social entirely.
 *
 * The API's hasOwn(...) protection will then preserve the existing
 * database values instead of interpreting an empty payload as deletion.
 */
const videoSocialIdentityReady =
  !!vs?.hydrated &&
  !!canonicalEmail &&
  profileEmail.trim().toLowerCase() === canonicalEmail &&
  loadedEmail?.trim().toLowerCase() === canonicalEmail;

const videoSocialPatch: Partial<PlayerProfilePayload> =
  videoSocialIdentityReady
    ? {
        externalVideos: Array.isArray(vs.externalVideos)
          ? vs.externalVideos
          : [],
        localVideos: Array.isArray(vs.localVideos)
          ? vs.localVideos
          : [],
        social:
          vs.social && typeof vs.social === "object"
            ? vs.social
            : {},
        primary: vs.primary ?? null,
      }
    : {};

  if (
  process.env.NODE_ENV !== "production" &&
  vs &&
  !videoSocialIdentityReady
) {
  console.warn("[PlayerProfileEditor] Video/Social omitted from save for safety.", {
    canonicalEmail,
    profileEmail,
    loadedEmail,
    videoSocialHydrated: vs.hydrated,
  });
}

      const payload: PlayerProfilePayload = {
        email: canonicalEmail,
        firstName: safe(firstName || ""),
        lastName: safe(lastName || ""),

        emailPrivate,
        phone: phone.trim(),
        phonePrivate,

        // Academics
        gradYear: numOrNull(gradYear),
        hsName: safe(hsName || ""),
        hsCity: safe(hsCity || ""),
        hsState: safe(hsState || ""),
        hsGeneralWebsiteUrl: safe(hsGeneralWebsiteUrl || ""),
        hometown: safe(hometownCity || ""), // Player.hometown
        state: safe(hometownState || ""),   // Player.state
        zip: safe(hometownZip || ""),

        // GPA / tests
        gpa: numOrNull(gpa),
        gpaScale: safe(gpaScale || ""),
        sat: numOrNull(sat),
        act: numOrNull(act),

        // Academic Bio
        academicBio: safe(academicBio || ""),
        academicBioPrivate,

        // Academic Docs (single-slot URLs from Academics tab)
        reportCardUrls: reportCardUrl ? [reportCardUrl] : [],
        transcriptUrls: transcriptUrl ? [transcriptUrl] : [],
        otherAcademicDocs: (additionalDocs || []).map((d) => ({
          url: d.url,
          label: d.label ?? null,
        })),

        // Intended Major(s)
        areasOfStudyInput: safe(areasOfStudyInput || ""),
        areasOfStudy: parseAreas(areasOfStudyInput),

        // Athletics/Core
        primaryPos: safe(primaryPos || ""),
        secondaryPos: safe(secondaryPos || ""),
        isPitcher: isPitcher || "", // <-- persist Yes/No/""
        pitcherHand: showPitcherHand ? (pitcherHand || "") : null,
        throws: asHand(throwsHand),
        bats: asHand(batsSide),
        heightFt: numOrNull(heightFt),
        heightIn: numOrNull(heightIn),
        weightLb: numOrNull(weightLb),

        age: ageComputed != null ? ageComputed : numOrNull(age),
        dob: safe(dob || ""),
        dobPrivate,
        gender: safe(gender || ""),

        // Eligibility
        eligibilityRegistered,
        ncaaId:
          eligibilityRegistered && ncaaId.trim()
            ? ncaaId.replace(/\D+/g, "").slice(0, 10)
            : null,
        naiaEcid:
          eligibilityRegistered && naiaEcid.trim()
            ? naiaEcid.trim()
            : null,

        // Commitment
        isCommitted,
        committedProgram: isCommitted ? safe(committedProgram || "") : null,
        committedProgramId: isCommitted ? committedProgramId : null,

        // High School schedule / website (Athletics tab)
        hsScheduleUrl: safe(hsScheduleUrl || ""),
        hsSchedulePrivate,
        hsWebsiteUrl: safe(hsWebsiteUrl || ""),

        // Travel Team (Athletics tab)
        travelTeamName: safe(travelTeamName || ""),
        travelTeamCity: safe(travelTeamCity || ""),
        travelTeamState: safe(travelTeamState || ""),
        travelTeamScheduleUrl: safe(travelTeamScheduleUrl || ""),
        travelTeamSchedulePrivate,
        travelTeamWebsiteUrl: safe(travelTeamWebsiteUrl || ""),

        // Other Teams (array-first)
        otherTeams: otherTeams.map((t) => ({
          name: safe(t.name || ""),
          city: safe(t.city || ""),
          state: safe(t.state || ""),
          scheduleUrl: safe(t.scheduleUrl || ""),
          websiteUrl: safe(t.websiteUrl || ""), // ✅ NEW: persist team website
        })),

        // Player Bio
        playerBio: safe(playerBio || ""),
        playerBioPrivate,

// --- NEW: Video/Social (Tab 6) ---
...videoSocialPatch,

        // --- NEW: Coaches / References (Tab 7) ---
        coaches: (cr?.coaches ?? []).map((c: any) => ({
          // ✅ id is required by the canonical CoachRef type
          id: String(c?.id ?? uid()),

          // ✅ required by canonical type
          name: String(c?.name ?? c?.coachName ?? c?.fullName ?? "").trim(),

          // optional-ish fields (keep nulls clean)
          email: c?.email ? String(c.email).trim() : null,
          phone: c?.phone ? String(c.phone).trim() : null,
          role: c?.role ? String(c.role).trim() : null,
          organization: c?.organization ? String(c.organization).trim() : null,
          relationship: c?.relationship ? String(c.relationship).trim() : null,
          notes: c?.notes ? String(c.notes).trim() : null,
        })),

        // --- NEW: Stats Seasons (metadata only; files uploaded separately) ---
        statsSeasons: statsSeasons.map((s) => ({
          season:
            s.seasonTerm && s.seasonYear
              ? `${s.seasonTerm} ${s.seasonYear}`
              : null,
          seasonTerm: s.seasonTerm || null,
          seasonYear: s.seasonYear ?? null,
          team: safe(s.team || ""),
          statsFileUrls: Array.isArray(s.statsFileUrls)
            ? s.statsFileUrls
            : [],
          hitting: s.hitting ?? null,
          fielding: s.fielding ?? null,
          catching: s.catching ?? null,
          pitching: s.pitching ?? null,
          pitchTypes: s.pitchTypes ?? [],
        })),

        // --- NEW: Metrics payload (sorted ascending for clean charting) ---
        metrics: {
          homeToFirst: [...homeToFirstEntries].sort(sortEntriesAsc),
          sixtyYdDash: [...sixtyYdDashEntries].sort(sortEntriesAsc),
          exitVelo: [...exitVeloEntries].sort(sortEntriesAsc),

          rawThrowVelo: [...rawThrowVeloEntries].sort(sortEntriesAsc),
          infieldThrowVelo: [...infieldThrowVeloEntries].sort(sortEntriesAsc),
          outfieldThrowVelo: [...outfieldThrowVeloEntries].sort(sortEntriesAsc),
          catcherThrowVelo: [...catcherThrowVeloEntries].sort(sortEntriesAsc),

          avgFbVelo: [...avgFbVeloEntries].sort(sortEntriesAsc),
          avgChVelo: [...avgChVeloEntries].sort(sortEntriesAsc),
          avgBbVelo: [...avgBbVeloEntries].sort(sortEntriesAsc),
          popTime: [...popTimeEntries].sort(sortEntriesAsc),
          benchPress: [...benchPressEntries].sort(sortEntriesAsc),
          squat: [...squatEntries].sort(sortEntriesAsc),
          deadLift: [...deadLiftEntries].sort(sortEntriesAsc),
        },

        // Metrics privacy
        metricsPrivate: metricPrivate,
      }; // <-- payload object ENDS here

      // Back-compat for old schema users (single legacy otherTeam* fields)
      if (otherTeams.length > 0) {
        payload.otherTeamName = safe(otherTeams[0].name || "");
        payload.otherTeamCity = safe(otherTeams[0].city || "");
        payload.otherTeamState = safe(otherTeams[0].state || "");
        payload.otherTeamScheduleUrl = safe(otherTeams[0].scheduleUrl || "");
      } else {
        payload.otherTeamName = null;
        payload.otherTeamCity = null;
        payload.otherTeamState = null;
        payload.otherTeamScheduleUrl = null;
      }

      const res = await fetch(saveEndpoint, {
        method: saveMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

// ===== ANCHOR: SAVE RESPONSE HANDLING (BEGIN) =====
      if (!res.ok || !json.ok) {
        // Server may return { errors: { key: "message", ... } }
        const serverErrors = (json?.errors && typeof json.errors === "object")
          ? (json.errors as Record<string, string>)
          : null;

        if (serverErrors) {
          setFieldErr(serverErrors);

          // Route to the tab that owns the first error field
          const firstKey = Object.keys(serverErrors)[0] || "";

          // Heuristics for tab ownership
          const isAcademics =
            firstKey.startsWith("transcriptUrls") ||
            firstKey.startsWith("reportCardUrls") ||
            firstKey.startsWith("otherAcademicDocs");

          const isAthletics =
            firstKey === "hsScheduleUrl" ||
            firstKey === "travelTeamScheduleUrl" ||
            firstKey.startsWith("otherTeams.");

          if (isAcademics) setActiveTab("Academics");
          else if (isAthletics) setActiveTab("Athletics");
          else setActiveTab("Core");

          // Compact summary to show above the buttons (multi-line)
          const summary = Object.entries(serverErrors)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");

          setErr("Please fix the highlighted fields.");
          setGlobalErr(summary || "Please fix the highlighted fields.");
        } else {
          const msg = json?.error || "Save failed.";
          setErr(msg);
          setGlobalErr(msg);
        }

        setSubmitting(false);
        return;
      }
// ===== ANCHOR: SAVE RESPONSE HANDLING (END) =====

      // ✅ Success

      // Clear field errors on success
      setFieldErr({});

      // Clear field errors on success
      setFieldErr({});

      // Show Saved! (use your helper if present)
      if (typeof transientSaved === "function") {
        transientSaved();
      } else {
        setMsg("Saved!");
      }

      // Sync UI with server-normalized truth
      const norm = json.normalized || {};
      // keep the newest slug in state so the link uses it immediately
      const newSlug =
        (json.user && json.user.slug) ||
        (json.normalized && json.normalized.slug) ||
        null;
      if (newSlug) setPublicSlug(newSlug);

      if (typeof norm.age !== "undefined") setAge(norm.age != null ? String(norm.age) : "");
      if (typeof norm.dob !== "undefined") setDob(norm.dob ?? "");
      if (typeof norm.dobPrivate !== "undefined") setDobPrivate(Boolean(norm.dobPrivate));
      if (typeof norm.gender !== "undefined") setGender(norm.gender ?? "");
      if (typeof norm.phone !== "undefined") setPhone(norm.phone ?? phone);

      // Athletics/Core normalization
      if (typeof norm.gradYear !== "undefined") setGradYear(norm.gradYear != null ? String(norm.gradYear) : "");
      if (typeof norm.primaryPos !== "undefined") setPrimaryPos(norm.primaryPos ?? primaryPos);
      if (typeof norm.secondaryPos !== "undefined") setSecondaryPos(norm.secondaryPos ?? secondaryPos);
      if (typeof norm.isPitcher !== "undefined") setIsPitcher(norm.isPitcher ?? isPitcher);
      if (typeof norm.pitcherHand !== "undefined") setPitcherHand(norm.pitcherHand ?? pitcherHand);
      if (typeof norm.throws !== "undefined") setThrowsHand(norm.throws ?? throwsHand);
      if (typeof norm.bats !== "undefined") setBatsSide(norm.bats ?? batsSide);
      if (typeof norm.heightFt !== "undefined") setHeightFt(norm.heightFt != null ? String(norm.heightFt) : "");
      if (typeof norm.heightIn !== "undefined") setHeightIn(norm.heightIn != null ? String(norm.heightIn) : "");
      if (typeof norm.weightLb !== "undefined") setWeightLb(norm.weightLb != null ? String(norm.weightLb) : "");

      if (typeof norm.hsName !== "undefined") setHsName(norm.hsName ?? hsName);
      if (typeof norm.hsCity !== "undefined") setHsCity(norm.hsCity ?? hsCity);
      if (typeof norm.hsState !== "undefined") setHsState(norm.hsState ?? hsState);
      if (typeof norm.hsGeneralWebsiteUrl !== "undefined") {
        setHsGeneralWebsiteUrl(norm.hsGeneralWebsiteUrl ?? hsGeneralWebsiteUrl);
      }

      if (typeof norm.hometown !== "undefined") setHometownCity(norm.hometown ?? hometownCity);
      if (typeof norm.state !== "undefined") setHometownState(norm.state ?? hometownState);
      if (typeof norm.zip !== "undefined") setHometownZip(norm.zip ?? hometownZip);

      if (typeof norm.hsScheduleUrl !== "undefined") setHsScheduleUrl(norm.hsScheduleUrl ?? hsScheduleUrl);
      if (typeof norm.hsWebsiteUrl !== "undefined") setHsWebsiteUrl(norm.hsWebsiteUrl ?? hsWebsiteUrl);
      if (typeof norm.hsSchedulePrivate !== "undefined") setHsSchedulePrivate(Boolean(norm.hsSchedulePrivate));

      if (typeof norm.academicBio !== "undefined") setAcademicBio(norm.academicBio ?? academicBio);
      if (typeof norm.academicBioPrivate !== "undefined") setAcademicBioPrivate(Boolean(norm.academicBioPrivate));

      if (typeof norm.eligibilityRegistered !== "undefined") setEligibilityRegistered(Boolean(norm.eligibilityRegistered));

      if (typeof norm.ncaaId !== "undefined") setNcaaId(norm.ncaaId ?? "");
      if (typeof norm.naiaEcid !== "undefined") setNaiaEcid(norm.naiaEcid ?? "");


      // Commitment normalization
      if (typeof norm.isCommitted !== "undefined") setIsCommitted(Boolean(norm.isCommitted));
      if (typeof norm.committedProgram !== "undefined") setCommittedProgram(norm.committedProgram ?? committedProgram);
      if (typeof norm.committedProgramId !== "undefined") setCommittedProgramId(norm.committedProgramId ?? committedProgramId);

      // Travel Team normalization
      if (typeof norm.travelTeamName !== "undefined") setTravelTeamName(norm.travelTeamName ?? travelTeamName);
      if (typeof norm.travelTeamCity !== "undefined") setTravelTeamCity(norm.travelTeamCity ?? travelTeamCity);
      if (typeof norm.travelTeamState !== "undefined") setTravelTeamState(norm.travelTeamState ?? travelTeamState);
      if (typeof norm.travelTeamScheduleUrl !== "undefined") setTravelTeamScheduleUrl(norm.travelTeamScheduleUrl ?? travelTeamScheduleUrl);
      if (typeof norm.travelTeamWebsiteUrl !== "undefined") setTravelTeamWebsiteUrl(norm.travelTeamWebsiteUrl ?? travelTeamWebsiteUrl);
      if (typeof norm.travelTeamSchedulePrivate !== "undefined") setTravelTeamSchedulePrivate(Boolean(norm.travelTeamSchedulePrivate));

      // Other Teams normalization
      if (Array.isArray(norm.otherTeams)) {
        setOtherTeams(
          norm.otherTeams.map((t: any) => ({
            id: uid(),
            name: (t?.name ?? "").trim(),
            city: (t?.city ?? "").trim(),
            state: (t?.state ?? "").trim(),
            scheduleUrl: (t?.scheduleUrl ?? "").trim(),
            websiteUrl: (t?.websiteUrl ?? "").trim(), // ✅ keep website
          }))
        );
      } else if (
        typeof norm.otherTeamName !== "undefined" ||
        typeof norm.otherTeamCity !== "undefined" ||
        typeof norm.otherTeamState !== "undefined" ||
        typeof norm.otherTeamScheduleUrl !== "undefined"
      ) {
        const hasAny =
          (norm.otherTeamName ?? "") ||
          (norm.otherTeamCity ?? "") ||
          (norm.otherTeamState ?? "") ||
          (norm.otherTeamScheduleUrl ?? "");
        setOtherTeams(
          hasAny
            ? [
                {
                  id: uid(),
                  name: norm.otherTeamName ?? "",
                  city: norm.otherTeamCity ?? "",
                  state: norm.otherTeamState ?? "",
                  scheduleUrl: norm.otherTeamScheduleUrl ?? "",
                  websiteUrl: "", // ✅ seed empty for legacy
                },
              ]
            : []
        );
      }

      // Player Bio normalization
      if (typeof norm.playerBio !== "undefined") setPlayerBio(norm.playerBio ?? playerBio);
      if (typeof norm.playerBioPrivate !== "undefined") setPlayerBioPrivate(Boolean(norm.playerBioPrivate));

      // --- NEW: Metrics normalization on response ---
      if (norm.metrics) {
        const m2 = norm.metrics as Record<string, MetricEntry[]>;
        setHomeToFirstEntries(Array.isArray(m2.homeToFirst) ? m2.homeToFirst : []);
        setSixtyYdDashEntries(Array.isArray(m2.sixtyYdDash) ? m2.sixtyYdDash : []);
        setExitVeloEntries(Array.isArray(m2.exitVelo) ? m2.exitVelo : []);
        setRawThrowVeloEntries(Array.isArray(m2.rawThrowVelo) ? m2.rawThrowVelo : []);
        setInfieldThrowVeloEntries(Array.isArray(m2.infieldThrowVelo) ? m2.infieldThrowVelo : []);
        setOutfieldThrowVeloEntries(Array.isArray(m2.outfieldThrowVelo) ? m2.outfieldThrowVelo : []);
        setCatcherThrowVeloEntries(Array.isArray(m2.catcherThrowVelo) ? m2.catcherThrowVelo : []);
        setAvgFbVeloEntries(Array.isArray(m2.avgFbVelo) ? m2.avgFbVelo : []);
        setAvgChVeloEntries(Array.isArray(m2.avgChVelo) ? m2.avgChVelo : []);
        setAvgBbVeloEntries(Array.isArray(m2.avgBbVelo) ? m2.avgBbVelo : []);
        setPopTimeEntries(Array.isArray(m2.popTime) ? m2.popTime : []);
        setBenchPressEntries(Array.isArray(m2.benchPress) ? m2.benchPress : []);
        setSquatEntries(Array.isArray(m2.squat) ? m2.squat : []);
        setDeadLiftEntries(Array.isArray(m2.deadLift) ? m2.deadLift : []);
      }

      if (norm.metricsPrivate) {
        const mp2 = norm.metricsPrivate as Record<string, boolean>;
        setMetricPrivate({
          homeToFirst: !!mp2.homeToFirst,
          sixtyYdDash: !!mp2.sixtyYdDash,
          exitVelo: !!mp2.exitVelo,
          rawThrowVelo: !!mp2.rawThrowVelo,
          infieldThrowVelo: !!mp2.infieldThrowVelo,
          outfieldThrowVelo: !!mp2.outfieldThrowVelo,
          catcherThrowVelo: !!mp2.catcherThrowVelo,
          avgFbVelo: !!mp2.avgFbVelo,
          avgChVelo: !!mp2.avgChVelo,
          avgBbVelo: !!mp2.avgBbVelo,
          popTime: !!mp2.popTime,
          benchPress: !!mp2.benchPress,
          squat: !!mp2.squat,
          deadLift: !!mp2.deadLift,
        });
      }

      transientSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

return (
  <main style={{ maxWidth: 860, margin: "0 auto" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12,
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0 }}>
        {heading}
      </h1>

      <Link href={backHref} style={backToDashboardStyle}>
        {backLabel}
      </Link>
    </div>
      <p style={{ color: "#475569", marginTop: 4 }}>
        {intro}
      </p>

      {/* Tabs */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          borderBottom: "1px solid #e5e7eb",
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 8,
                border: isActive ? "1px solid #0ea5e9" : "1px solid #e5e7eb",
                background: isActive ? "#e0f2fe" : "#ffffff",
                color: "#0f172a",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                // keeps them sitting “on” the border line
                marginBottom: -1,
              }}
            >
              {tab}
            </button>
          );
        })}

{!isTeamAdminMode ? (
  <a href={billingHref} style={{ textDecoration: "none" }}>
    <button
      type="button"
      style={{
        height: 36,
        padding: "0 12px",
        borderRadius: 8,
        border: "1px solid #caa042",
        background: "#caa042",
        color: "#0f172a",
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: -1,
      }}
    >
      Plan Billing
    </button>
  </a>
) : null}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 16,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          position: "relative",   // anchor absolutely-positioned children to THIS form
          paddingBottom: 88,      // room so bottom buttons don’t overlap content
        }}
      >

        {/* ========= TAB 1: CORE ========= */}
{activeTab === "Core" && (
  <TabCore
    userSlug={uploadSlug}
    readOnlyTeamAdmin={isTeamAdminMode}

    // values
    firstName={firstName}
    lastName={lastName}
    email={email}
    phone={phone}
    emailPrivate={emailPrivate}
    phonePrivate={phonePrivate}
    hometownCity={hometownCity}        // ← NEW
    hometownState={hometownState}      // ← NEW
    hometownZip={hometownZip}
    photoPreview={photoPreview}
    photoFile={photoFile}
    submitting={submitting}
    uploadingPhoto={uploadingPhoto}
    optimizingPhoto={optimizingPhoto}
    photoInfoMsg={photoInfoMsg}
    isMobile={isMobile}
    heightFt={heightFt}
    heightIn={heightIn}
    weightLb={weightLb}
    age={age}
    dob={dob}
    dobPrivate={dobPrivate}
    gender={gender}
    fieldErr={fieldErr}
    GENDER_OPTIONS={GENDER_OPTIONS}
    US_STATE_ABBRS={US_STATE_ABBRS}    // ← NEW

    // handlers
    setFirstName={setFirstName}
    setLastName={setLastName}
    setEmail={(v) => {
      didEditEmailRef.current = true;
      setEmail(v);
    }}
    setEmailPrivate={setEmailPrivate}
    onPhoneChange={onPhoneChange}
    setPhonePrivate={setPhonePrivate}
    setHometownCity={setHometownCity}  // ← NEW
    setHometownState={setHometownState} // ← NEW
    setHometownZip={setHometownZip}
    onPickPhoto={onPickPhoto}
    onUploadPhoto={onUploadPhoto}
    onRemovePhoto={onRemovePhoto}
    setHeightFt={setHeightFt}
    setHeightIn={setHeightIn}
    setWeightLb={setWeightLb}
    setAge={setAge}
    onDobChange={onDobChange}
    isDobValid={isDobValid}
    setDobPrivate={setDobPrivate}
    setGender={(v) => setGender(v as any)}

    // refs
    phoneRef={phoneRef}
    heightInRef={heightInRef}
    ageRef={ageRef}
    dobRef={dobRef}
    genderRef={genderRef}

    // styles
    labelStyle={labelStyle}
    labelText={labelText}
    inputStyle={inputStyle}
    hrStyle={hrStyle}
    errText={errText}
    qMark={qMark}
  />
)}

        {/* ========= TAB 2: ACADEMICS ========= */}
        {activeTab === "Academics" && (
          <TabAcademics
          readOnlyTeamAdmin={isTeamAdminMode}
          userSlug={uploadSlug}                 // ✅ NEW: gives uploads a stable per-user folder
          uploadEndpoint="/api/upload/academic"
            // values
            gradYear={gradYear}
            hsName={hsName}
            hsCity={hsCity}
            hsState={hsState}
            hsGeneralWebsiteUrl={hsGeneralWebsiteUrl}
            gpa={gpa}
            gpaScale={gpaScale}
            sat={sat}
            act={act}
            academicDocs={academicDocs}
            docUrls={docUrls}
            academicBio={academicBio}
            academicBioPrivate={academicBioPrivate}
            areasOfStudyInput={areasOfStudyInput}

            // 👉 docs (persisted URLs for public profile)
    reportCardUrl={reportCardUrl}
    setReportCardUrl={setReportCardUrl}
    transcriptUrl={transcriptUrl}
    setTranscriptUrl={setTranscriptUrl}
    additionalDocs={additionalDocs}
    setAdditionalDocs={setAdditionalDocs}

            // errors
            fieldErr={fieldErr}
            bioReadOnly={isParentMode}
            intendedMajorsReadOnly={isParentMode}

            // handlers
            setGradYear={setGradYear}
            setHsName={setHsName}
            setHsCity={setHsCity}
            setHsState={setHsState}
            setHsGeneralWebsiteUrl={setHsGeneralWebsiteUrl}
            setGpa={setGpa}
            setGpaScale={setGpaScale}
            setSat={setSat}
            setAct={setAct}
            onPickAcademicDocs={onPickAcademicDocs}
            removeAcademicDoc={removeAcademicDoc}
            setAcademicBio={setAcademicBio}
            setAcademicBioPrivate={setAcademicBioPrivate}
            setAreasOfStudyInput={setAreasOfStudyInput}

            // refs
            gradYearRef={gradYearRef}

            // constants/styles
            US_STATE_ABBRS={US_STATE_ABBRS}
            MAX_BIO_CHARS={MAX_BIO_CHARS}
            docAccept={DOC_ACCEPT}
            labelStyle={labelStyle}
            labelText={labelText}
            inputStyle={inputStyle}
            textareaStyle={textareaStyle}
            hrStyle={hrStyle}
            errText={errText}
            qMark={qMark}
          />
        )}

        {/* ---- Tab: Athletics ---- */}
        {activeTab === "Athletics" && (
          <TabAthletics
          readOnlyTeamAdmin={isTeamAdminMode}
            // values
            eligibilityRegistered={eligibilityRegistered}
            ncaaId={ncaaId}
            naiaEcid={naiaEcid}
            isCommitted={isCommitted}
            committedProgram={committedProgram}
            committedProgramId={committedProgramId}
            collegeOptions={collegeOptions}
            collegeSearching={collegeSearching}

            primaryPos={primaryPos}
            secondaryPos={secondaryPos}
            isPitcher={isPitcher}
            pitcherHand={pitcherHand}
            throwsHand={throwsHand}
            batsSide={batsSide}

            hsName={hsName}
            hsCity={hsCity}
            hsState={hsState}
            hsScheduleUrl={hsScheduleUrl}
            hsWebsiteUrl={hsWebsiteUrl}
            hsSchedulePrivate={hsSchedulePrivate}

            travelTeamName={travelTeamName}
            travelTeamCity={travelTeamCity}
            travelTeamState={travelTeamState}
            travelTeamScheduleUrl={travelTeamScheduleUrl}
            travelTeamWebsiteUrl={travelTeamWebsiteUrl}
            travelTeamSchedulePrivate={travelTeamSchedulePrivate}

            otherTeams={otherTeams}

            playerBio={playerBio}
            playerBioPrivate={playerBioPrivate}

            // UI / validation
            fieldErr={fieldErr}
            showPitcherHand={showPitcherHand}

            // NEW: parent permission layer
            commitmentReadOnly={isParentMode}
            playerBioReadOnly={isParentMode}

            // handlers
            setEligibilityRegistered={setEligibilityRegistered}
            setNcaaId={setNcaaId}
            setNaiaEcid={setNaiaEcid}

            setIsCommitted={setIsCommitted}
            setCommittedProgram={setCommittedProgram}
            setCommittedProgramId={setCommittedProgramId}
            setCollegeOptions={setCollegeOptions}

            setPrimaryPos={(v: string) =>
              setPrimaryPos(v as (typeof POS_OPTIONS)[number] | "")
            }
            setSecondaryPos={(v: string) =>
              setSecondaryPos(v as (typeof SECONDARY_OPTIONS)[number] | "")
            }
            setIsPitcher={(v: string) =>
              setIsPitcher(v as (typeof YES_NO)[number] | "")
            }
            setPitcherHand={(v: string) =>
              setPitcherHand(v as (typeof PITCHER_HAND)[number] | "")
            }
            setThrowsHand={(v: string) =>
              setThrowsHand(v as (typeof THROWS_OPTIONS)[number] | "")
            }
            setBatsSide={(v: string) =>
              setBatsSide(v as (typeof BATS_OPTIONS)[number] | "")
            }

            setHsName={setHsName}
            setHsCity={setHsCity}
            setHsState={setHsState}
            setHsScheduleUrl={setHsScheduleUrl}
            setHsWebsiteUrl={setHsWebsiteUrl}
            setHsSchedulePrivate={setHsSchedulePrivate}

            setTravelTeamName={setTravelTeamName}
            setTravelTeamCity={setTravelTeamCity}
            setTravelTeamState={setTravelTeamState}
            setTravelTeamScheduleUrl={setTravelTeamScheduleUrl}
            setTravelTeamWebsiteUrl={setTravelTeamWebsiteUrl}
            setTravelTeamSchedulePrivate={setTravelTeamSchedulePrivate}

            addOtherTeam={addOtherTeam}
            updateOtherTeam={updateOtherTeam}
            removeOtherTeam={removeOtherTeam}

            setPlayerBio={setPlayerBio}
            setPlayerBioPrivate={setPlayerBioPrivate}

            // helpers/constants
            isLikelyUrl={isLikelyUrl}
            US_STATE_ABBRS={US_STATE_ABBRS}
            POS_OPTIONS={POS_OPTIONS}
            SECONDARY_OPTIONS={SECONDARY_OPTIONS}
            THROWS_OPTIONS={THROWS_OPTIONS}
            BATS_OPTIONS={BATS_OPTIONS}
            YES_NO={YES_NO}
            PITCHER_HAND={PITCHER_HAND}
            MAX_BIO_CHARS={MAX_BIO_CHARS}

            // shared styles
            labelStyle={labelStyle}
            labelText={labelText}
            inputStyle={inputStyle}
            textareaStyle={textareaStyle}
            hrStyle={hrStyle}
            errText={errText}
            qMark={qMark}
          />
        )}

        {/* ========= TAB 4: METRICS ========= */}
        {activeTab === "Metrics" && (
          <TabMetrics
            metricsPublic={metricsPublic}

            showCatcherMetrics={showCatcherMetrics}
            showPitcherMetrics={showPitcherMetrics}
            showInfieldVelo={showInfieldVelo}
            showOutfieldVelo={showOutfieldVelo}
            showRawThrowVelo={showRawThrowVelo}

            metricPrivate={metricPrivate}
            setMetricPrivate={setMetricPrivate}

            homeToFirstEntries={homeToFirstEntries}
            setHomeToFirstEntries={setHomeToFirstEntries}
            sixtyYdDashEntries={sixtyYdDashEntries}
            setSixtyYdDashEntries={setSixtyYdDashEntries}
            exitVeloEntries={exitVeloEntries}
            setExitVeloEntries={setExitVeloEntries}

            rawThrowVeloEntries={rawThrowVeloEntries}
            setRawThrowVeloEntries={setRawThrowVeloEntries}
            infieldThrowVeloEntries={infieldThrowVeloEntries}
            setInfieldThrowVeloEntries={setInfieldThrowVeloEntries}
            outfieldThrowVeloEntries={outfieldThrowVeloEntries}
            setOutfieldThrowVeloEntries={setOutfieldThrowVeloEntries}

            benchPressEntries={benchPressEntries}
            setBenchPressEntries={setBenchPressEntries}
            squatEntries={squatEntries}
            setSquatEntries={setSquatEntries}
            deadLiftEntries={deadLiftEntries}
            setDeadLiftEntries={setDeadLiftEntries}

            popTimeEntries={popTimeEntries}
            setPopTimeEntries={setPopTimeEntries}
            catcherThrowVeloEntries={catcherThrowVeloEntries}
            setCatcherThrowVeloEntries={setCatcherThrowVeloEntries}

            avgFbVeloEntries={avgFbVeloEntries}
            setAvgFbVeloEntries={setAvgFbVeloEntries}
            avgChVeloEntries={avgChVeloEntries}
            setAvgChVeloEntries={setAvgChVeloEntries}
            avgBbVeloEntries={avgBbVeloEntries}
            setAvgBbVeloEntries={setAvgBbVeloEntries}

            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
        )}

        {/* ========= TAB 5: STATS ========= */}
        {activeTab === "Stats" && (
        <TabStats
          statsPublic={statsPublic}
          showCatcherMetrics={showCatcherMetrics}
          showPitcherMetrics={showPitcherMetrics}
          statsSeasons={statsSeasons}
          addStatsSeason={addStatsSeason}
          removeStatsSeason={removeStatsSeason}
          updateStatsSeason={updateStatsSeason}
          teamOptions={teamOptions}
          seasonTerms={SEASON_TERMS}
          pitchTypes={PITCH_TYPES}
          yearOptions={yearOptions}
          setErr={setErr}
          transientSaved={transientSaved}
          styles={{ labelStyle, labelText, inputStyle, hrStyle, errText }}
          playerSlug={uploadSlug}
        />
        )}

        {/* ========= TAB 6: VIDEO / SOCIAL ========= */}
<div style={{ display: activeTab === "Video / Social Media" ? "block" : "none" }}>
  <TabVideoSocial
      ref={videoSocialRef}
      readOnlyTeamAdmin={isTeamAdminMode}
    email={profileEmail}
    planTier="All-American"
  />
</div>

        {/* ========= TAB 7: COACHES / REFERENCES ========= */}
        <div style={{ display: activeTab === "References" ? "block" : "none" }}>
          <TabCoachesReferences
            ref={coachesRef}
            email={profileEmail}
            planTier="Walk-On"
            knownTeams={teamOptions}
          />
        </div>

        {/* Actions / messages */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #0ea5e9",
                background: submitting ? "#7dd3fc" : "#38bdf8",
                color: "#083344",
                fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Saving…" : "Save Profile"}
            </button>

{msg && (
  <span style={{ color: "#15803d", fontWeight: 700 }}>
    {msg}
  </span>
)}

{err && (
  <span style={{ color: "#b91c1c", fontWeight: 700 }}>
    {err}
  </span>
)}

            {globalErr ? (
              <div style={{ color: "#b91c1c", fontWeight: 700, whiteSpace: "pre-wrap" }}>
                {globalErr}
              </div>
            ) : null}
          </div>

{/* Optional: link to public profile */}
{!isTeamAdminMode ? (
  (() => {
    if (linkSlug) {
      return (
        <div style={{ marginTop: 10 }}>
          <a
            href={`/player/${encodeURIComponent(linkSlug)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#0ea5e9",
              fontWeight: 700,
              textDecoration: "underline",
            }}
            title="Open your public profile"
          >
            View Public Profile →
          </a>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 10, color: "#64748b" }}>
        Save your profile to generate a public URL.
      </div>
    );
  })()
) : null}

{/* --- Manage Plan (bottom-right of the form panel) --- */}
{!isTeamAdminMode ? (
  (() => {
    const raw =
      (typeof (globalThis as any)?.currentPlan !== "undefined" &&
        (globalThis as any).currentPlan) ||
      (typeof (globalThis as any)?.plan !== "undefined" &&
        (globalThis as any).plan) ||
      (typeof (globalThis as any)?.planTier !== "undefined" &&
        (globalThis as any).planTier) ||
      (typeof (globalThis as any)?.user?.plan !== "undefined" &&
        (globalThis as any).user.plan) ||
      (typeof (globalThis as any)?.player?.plan !== "undefined" &&
        (globalThis as any).player.plan) ||
      null;

    const planLabel = raw
      ? String(raw)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace("Walk On", "Walk-On")
          .replace("All American", "All-American")
          .replace("Team", "Teams")
      : "Manage Plan";

    return (
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 88,
          textAlign: "right",
          pointerEvents: "auto",
        }}
      >
        <a
          href={billingHref}
          title="Manage your plan"
          style={{ textDecoration: "none" }}
        >
          <button
            type="button"
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #0ea5e9",
              background: "#38bdf8",
              color: "#083344",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              cursor: "pointer",
            }}
          >
            {planLabel}
          </button>
        </a>

        <div
          style={{
            marginTop: 10,
            fontSize: 15,
            color: "#64748b",
            maxWidth: 360,
          }}
        >
          Manage your plan and update billing/payment info.
        </div>
      </div>
    );
  })()
) : null}

        </div>
      </form>
    </main>
    );
}

export default function PlayerProfilePage() {
  return (
    <Suspense fallback={null}>
      <PlayerProfileEditor />
    </Suspense>
  );
}

// ---------- Reusable MetricSection (outside the component) ----------
function MetricSection(props: {
  title: string;
  unitHint?: string;
  entries: MetricEntry[];
  setEntries: (fn: (prev: MetricEntry[]) => MetricEntry[]) => void;
  placeholderValue?: string;
  idPrefix: string;
  isPrivate: boolean;
  onTogglePrivate: (checked: boolean) => void;
}) {
  const {
    title, unitHint, entries, setEntries, placeholderValue, idPrefix,
    isPrivate, onTogglePrivate,
  } = props;

  const [val, setVal] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [monthYear, setMonthYear] = useState<string>("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const unitHintLower = (unitHint || "").toLowerCase();
  const unitSuffix = unitHintLower === "seconds" ? "sec" : (unitHint || "");
  const fmtValue = (n: number) => {
    if (unitHintLower === "seconds") return n.toFixed(3);
    if (unitHintLower === "mph" || unitHintLower === "lbs") return Math.round(n).toString();
    return String(n);
  };

  function maskMonthYear(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    let out = mm;
    if (yyyy) out += `/${yyyy}`;
    return out;
  }
  function normalizeMmYyyy(input: string): string | null {
    const s = (input || "").trim();
    if (!s) return null;
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
  function sortAsc(a: MetricEntry, b: MetricEntry) {
    const [am, ay] = a.monthYear.split("/").map(Number);
    const [bm, by] = b.monthYear.split("/").map(Number);
    const ad = new Date(ay, am - 1, 1).getTime();
    const bd = new Date(by, bm - 1, 1).getTime();
    return ad - bd;
  }

  function doAdd() {
    setLocalErr(null);
    const raw = Number(val);
    if (!Number.isFinite(raw) || raw <= 0) {
      setLocalErr("Enter a valid numeric value.");
      return;
    }
    const norm = normalizeMmYyyy(monthYear);
    if (!norm) {
      setLocalErr("Enter a valid date as mm/yyyy.");
      return;
    }
    const rounded = roundForUnit(raw, unitHint);
    const next = [...entries, { value: rounded, source: source.trim() || "Manual", monthYear: norm }];
    next.sort(sortAsc);
    setEntries(() => next);
    setVal("");
    setSource("");
    setMonthYear("");
  }

  function removeAt(originalIndex: number) {
    const next = entries.filter((_, idx) => idx !== originalIndex);
    setEntries(() => next);
  }

  return (
    <section style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ ...labelText, margin: 0 }}>{title}</h3>
        <label title="By checking Private, this information will not be viewable on your public profile page.">
          <input type="checkbox" checked={isPrivate} onChange={(e) => onTogglePrivate(e.target.checked)} />{" "}
          Private <span style={qMark}>?</span>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, alignItems: "end" }}>
        <label style={labelStyle}>
          <span style={labelText}>
            Value {unitHint ? <small style={{ color: "#64748b", fontWeight: 500 }}>({unitHint})</small> : null}
          </span>
          <input
            id={`${idPrefix}-value`}
            inputMode="decimal"
            value={val}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d.]/g, "");
              const parts = v.split(".");
              if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
              if (unitHintLower === "seconds" && parts[1]?.length > 3) v = parts[0] + "." + parts[1].slice(0, 3);
              setVal(v);
            }}
            onBlur={(e) => {
              if (unitHintLower === "seconds") {
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n)) setVal(n.toFixed(3));
              }
            }}
            placeholder={placeholderValue || "e.g., 4.95"}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Verification Source</span>
          <input
            id={`${idPrefix}-source`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Manual, Trackman, Rapsodo, Pocket Radar"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Date (mm/yyyy)</span>
          <input
            id={`${idPrefix}-date`}
            inputMode="numeric"
            value={monthYear}
            onChange={(e) => setMonthYear(maskMonthYear(e.target.value))}
            onBlur={(e) => {
              const norm = normalizeMmYyyy(e.target.value);
              if (norm) setMonthYear(norm);
            }}
            placeholder="04/2025"
            style={inputStyle}
          />
        </label>

        <div>
          <button
            type="button"
            onClick={doAdd}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #0ea5e9", background: "#e0f2fe", color: "#0f172a", fontWeight: 800, cursor: "pointer", height: 40 }}
          >
            Add Metric
          </button>
          {localErr && <div style={{ ...errText, marginTop: 6 }}>{localErr}</div>}
        </div>
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "#0f172a", fontWeight: 700, marginBottom: 6 }}>Entries</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[...entries].slice().reverse().map((e, i) => {
              const originalIndex = entries.length - 1 - i;
              return (
                <div
                  key={`${e.monthYear}-${e.value}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 120px auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "6px 8px",
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{e.monthYear}</div>
                  <div style={{ color: "#0f172a", textAlign: "center" }}>{e.source || "Manual"}</div>
                  <div style={{ color: "#0f172a", textAlign: "right" }}>{fmtValue(e.value)} {unitSuffix}</div>
                  <button
                    type="button"
                    onClick={() => removeAt(originalIndex)}
                    title="Remove this entry"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontWeight: 800, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ================= style constants (single source of truth) =================
const labelStyle: React.CSSProperties = { display: "grid", gap: 6 };
const labelText: React.CSSProperties = { fontWeight: 700, color: "#0f172a" };

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
  width: "100%",
  background: "#ffffff",
  color: "#0f172a",
};
const textareaStyle: React.CSSProperties = {
  minHeight: 120,
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
  resize: "vertical",
  width: "100%",
  background: "#ffffff",
  color: "#0f172a",
};
const hrStyle: React.CSSProperties = {
  margin: "16px 0",
  border: "none",
  borderTop: "1px solid #e5e7eb",
};
const qMark: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "1px solid #94a3b8",
  color: "#64748b",
  fontSize: 12,
  marginLeft: 4,
};
const errText: React.CSSProperties = {
  marginTop: 4,
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 600,
};

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};
// app/(public)/player/[slug]/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import PublicProfileHeader from "@/app/components/public/PublicProfileHeader";
import PublicAcademics, { AcademicsData } from "@/app/components/public/PublicAcademics";
import PublicAthletics, { AthleticsData, TeamEntry } from "@/app/components/public/PublicAthletics";
import PublicStats from "@/app/components/public/PublicStats";
import PublicMetrics, { MetricsData } from "@/app/components/public/PublicMetrics";
import PublicMedia, { MediaData } from "@/app/components/public/PublicMedia";
import PublicCoaches, { CoachesData } from "@/app/components/public/PublicCoaches";
import CoachViewerTools from "./CoachViewerTools";

import { toPublicMedia } from "@/app/lib/publicMedia";
import {
  normalizePlanTier,
  normalizeActivityStatus,
  canViewSection,
  canViewCoreField,
} from "@/app/lib/visibility";

/** ---------- Shapes from API (loosely typed & defensive) ---------- */
type PublicProfile = {
  firstName?: string | null;
  lastName?: string | null;
  primaryPhotoUrl?: string | null;

  gradYear?: number | null;
  gpa?: number | string | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;
  age?: number | null;
  dob?: string | null;
  gender?: "Male" | "Female" | null;

  email?: string | null;
  phone?: string | null;
  contact?: { email?: string | null; phone?: string | null } | null;

  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  pitcherHand?: "RHP" | "LHP" | null;
  bats?: "R" | "L" | "S" | "Right" | "Left" | "Switch" | null;
  throws?: "R" | "L" | "S" | "Right" | "Left" | "Switch" | null;

  positions?: { primary?: string | null; secondary?: string[] | null } | null;

  committed?: { isCommitted: boolean; program?: string | null } | null;

  academics?: any;
  athletics?: any;

  ncaaId?: string | null;
  naiaEcid?: string | null;

  videoSocial?: any;
  videos?: any;

  coaches?: any;
  references?: any;
  coachesReferences?: any;

  seasons?: any[] | null;

  planTier?: "Redshirt" | "Walk-On" | "All-American" | "Teams";

  activityStatus?: string | null;
  status?: string | null;

  corePrivacy?: {
    emailPrivate?: boolean | null;
    phonePrivate?: boolean | null;
    dobPrivate?: boolean | null;
  } | null;
  emailPrivate?: boolean | null;
  phonePrivate?: boolean | null;
  dobPrivate?: boolean | null;

  // coach tools need this
  playerProfileId?: string | null;
};

type PublicPayload = {
  profile?: PublicProfile | null;
  metrics?: any | null;
  stats?: any | null;
  demoMode?: "global" | "allowlist" | "query" | null;
  planTier?: "Redshirt" | "Walk-On" | "All-American" | "Teams";
  debug?: any;
};

const PUBLIC_SECTIONS: { id: string; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "primary-video", label: "Primary Video" },
  { id: "academics", label: "Academics" },
  { id: "athletics", label: "Athletics" },
  { id: "metrics", label: "Metrics" },
  { id: "stats", label: "Stats" },
  { id: "video", label: "Videos" },
  { id: "coaches", label: "References" },
];

function JumpToSectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="Jump to section"
      style={{
        marginTop: 0,
        marginBottom: 0,
        padding: 0,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.06,
        }}
      >
        Jump to:
      </span>

      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 9999,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#0f172a",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

const SECTION_SCROLL_MARGIN = 235;
function SectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      {children}
    </section>
  );
}

export default function PublicPlayerPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();

  const fromTeaserCard = searchParams.get("from") === "teaser";
  void fromTeaserCard;

  const showDebug =
    searchParams.get("debug") === "1" || process.env.NEXT_PUBLIC_SC_PUBLIC_DEBUG === "1";

  const [data, setData] = React.useState<PublicPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Coach prompt modal (kept for later use)
  const [showCoachPrompt, setShowCoachPrompt] = React.useState(false);
  void showCoachPrompt;
  void setShowCoachPrompt;

  // ---------------- Coach viewer detection ----------------
  const [isCoachViewer, setIsCoachViewer] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/coach/dashboard", { method: "GET", cache: "no-store" });
        if (!cancelled) setIsCoachViewer(res.ok);
      } catch {
        if (!cancelled) setIsCoachViewer(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------- Load public payload ----------------
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setNotFound(false);

      try {
        const url = `/api/public/player/${encodeURIComponent(String(slug || "").trim())}${
          showDebug ? "?debug=1" : ""
        }`;

        const res = await fetch(url, { cache: "no-store" });

        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || `Failed to load player (${res.status})`);
        }

        if (!cancelled) {
          setData(json?.data ?? null);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load player.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, showDebug]);

  // ---------- Safe profile fallbacks ----------
  const safeProfile: PublicProfile = (data?.profile ?? {}) as PublicProfile;

  const vsRaw: any = (safeProfile as any).videoSocial ?? (safeProfile as any).videos ?? {};
  const coreEmail = safeProfile.email ?? safeProfile.contact?.email ?? null;
  const corePhone = safeProfile.phone ?? safeProfile.contact?.phone ?? null;

  const playerProfileId =
    String((safeProfile as any)?.playerProfileId || (safeProfile as any)?.id || "").trim() || null;

  const cardViewUrl = `/player/${encodeURIComponent(slug)}/card`;

  // ✅ FIX: hooks must be called before any early return
  const jumpSections = React.useMemo(() => {
    const base = [...PUBLIC_SECTIONS];
    if (isCoachViewer && !!playerProfileId) base.push({ id: "coach-notes", label: "Coach Notes" });
    return base;
  }, [isCoachViewer, playerProfileId]);

  const idsFromLS = React.useMemo(() => {
    try {
      if (typeof window === "undefined") return null;
      const emailKey = (coreEmail ?? "anon").toLowerCase().trim();
      const raw = localStorage.getItem(`scoutlineIds:${emailKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ncaaId = parsed?.ncaaId ? String(parsed.ncaaId).replace(/\D+/g, "") : null;
      const naiaEcid = parsed?.naiaEcid ? String(parsed.naiaEcid).trim() : null;
      return { ncaaId: ncaaId || null, naiaEcid: naiaEcid || null };
    } catch {
      return null;
    }
  }, [coreEmail]);

  const mediaDataFromApi: MediaData = React.useMemo(() => {
    let md: MediaData = toPublicMedia(vsRaw, {
      email: coreEmail,
      phone: corePhone,
      chatUrl: (vsRaw as any)?.chatUrl ?? null,
    });

    const toArray = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
    const toArrayOrScalar = (v: any): { url: string; title?: string | null }[] =>
      toArray(v)
        .map((x) =>
          typeof x === "string"
            ? { url: x, title: null }
            : { url: String(x?.url || x?.publicUrl || ""), title: x?.title ?? x?.name ?? null }
        )
        .filter((o) => !!o.url);

    const legacyUploads = [
      ...toArrayOrScalar((vsRaw as any).uploads),
      ...toArrayOrScalar((vsRaw as any).uploadedVideos),
      ...toArrayOrScalar((vsRaw as any).videoFiles),
    ];
    const legacyLinks = [
      ...toArrayOrScalar((vsRaw as any).links),
      ...toArrayOrScalar((vsRaw as any).videoLinks),
    ];

    if (legacyUploads.length) {
      const merged = (md.uploadedVideos ?? []).concat(legacyUploads);
      const seen = new Set<string>();
      md.uploadedVideos = merged.filter((v) => (seen.has(v.url) ? false : (seen.add(v.url), true)));
    }

    if (legacyLinks.length) {
      const merged = (md.externalVideos ?? []).concat(legacyLinks);
      const seen = new Set<string>();
      md.externalVideos = merged.filter((v) => (seen.has(v.url) ? false : (seen.add(v.url), true)));
    }

    md = {
      ...md,
      xUrl: (vsRaw as any).xUrl ?? md.xUrl ?? null,
      instagramUrl: (vsRaw as any).instagramUrl ?? md.instagramUrl ?? null,
      youtubeUrl: (vsRaw as any).youtubeUrl ?? (vsRaw as any).youtubeChannel ?? md.youtubeUrl ?? null,
    };

    return md;
  }, [vsRaw, coreEmail, corePhone]);

  const primaryUrlFromApi: string | null = React.useMemo(() => {
    const raw: any = vsRaw;
    if (raw?.primary && raw?.primary?.id) {
      if (raw.primary.kind === "local" && Array.isArray(raw.localVideos)) {
        const match = raw.localVideos.find((lv: any) => String(lv?.id || "") === String(raw.primary.id));
        if (match?.publicUrl) return String(match.publicUrl);
      } else if (raw.primary.kind === "external" && Array.isArray(raw.externalVideos)) {
        const match = raw.externalVideos.find((ev: any) => String(ev?.id || "") === String(raw.primary.id));
        if (match?.url) return String(match.url);
      }
    }
    return null;
  }, [vsRaw]);

  const [mediaDataView, setMediaDataView] = React.useState<MediaData>(mediaDataFromApi);
  const [primaryUrlView, setPrimaryUrlView] = React.useState<string | null>(primaryUrlFromApi);

  React.useEffect(() => {
    try {
      const emailKey = (coreEmail ?? "anon").toLowerCase().trim();
      const tryKeys = [`scoutlineVideoSocial:${emailKey}`, `scoutlineVideoSocial:anon`];
      let raw: string | null = null;
      for (const k of tryKeys) {
        raw = typeof window !== "undefined" ? localStorage.getItem(k) : null;
        if (raw) break;
      }

      if (!raw) {
        setMediaDataView(mediaDataFromApi);
        setPrimaryUrlView(primaryUrlFromApi);
        return;
      }

      const s = JSON.parse(raw) || {};
      const lsUploads = Array.isArray(s.localVideos)
        ? s.localVideos
            .filter((v: any) => !!v?.publicUrl)
            .map((v: any) => ({ url: String(v.publicUrl), title: v?.title ?? null }))
        : [];
      const lsLinks = Array.isArray(s.externalVideos)
        ? s.externalVideos
            .filter((v: any) => !!v?.url)
            .map((v: any) => ({ url: String(v.url), title: v?.title ?? null }))
        : [];

      const dedupe = (arr: { url: string; title?: string | null }[]) => {
        const seen = new Set<string>();
        return arr.filter((it) => (seen.has(it.url) ? false : (seen.add(it.url), true)));
      };

      const mergedUploads = dedupe([...(mediaDataFromApi.uploadedVideos ?? []), ...lsUploads]);
      const mergedLinks = dedupe([...(mediaDataFromApi.externalVideos ?? []), ...lsLinks]);

      const merged: MediaData = {
        ...mediaDataFromApi,
        uploadedVideos: mergedUploads,
        externalVideos: mergedLinks,
        xUrl: mediaDataFromApi.xUrl || null,
        instagramUrl: mediaDataFromApi.instagramUrl || null,
        youtubeUrl: mediaDataFromApi.youtubeUrl || null,
      };

      let primaryFromLS: string | null = primaryUrlFromApi;
      if (!primaryFromLS && s?.primary?.id && s?.primary?.kind) {
        if (s.primary.kind === "local" && Array.isArray(s.localVideos)) {
          const m = s.localVideos.find((v: any) => String(v?.id || "") === String(s.primary.id));
          primaryFromLS = m?.publicUrl || (lsUploads.length === 1 ? lsUploads[0]?.url : null);
        } else if (s.primary.kind === "external" && Array.isArray(s.externalVideos)) {
          const m = s.externalVideos.find((v: any) => String(v?.id || "") === String(s.primary.id));
          primaryFromLS = m?.url || (lsLinks.length === 1 ? lsLinks[0]?.url : null);
        }
      }

      setMediaDataView(merged);
      setPrimaryUrlView(primaryFromLS ?? null);
    } catch {
      setMediaDataView(mediaDataFromApi);
      setPrimaryUrlView(primaryUrlFromApi);
    }
  }, [slug, coreEmail, mediaDataFromApi, primaryUrlFromApi]);

  // ---------------- Early returns ----------------
  if (loading) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player</h1>
        <section style={card}>
          <h2 style={h2}>Player Not Found</h2>
          <p>
            We couldn’t find a public profile for <strong>{slug}</strong>.
          </p>
        </section>
      </main>
    );
  }

  if (err) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player</h1>
        <section style={card}>
          <h2 style={{ ...h2, color: "#b91c1c" }}>Error</h2>
          <p>{err}</p>
          {showDebug ? (
            <p style={{ marginTop: 8, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
              Try: <code>/api/public/player/{slug}?debug=1</code>
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  if (!data || !data.profile) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player</h1>
        <section style={card}>
          <p>Nothing to show yet.</p>
        </section>
      </main>
    );
  }

  const profile = data.profile as PublicProfile;

  // ---- Visibility context (PUBLIC viewer) ----
  const plan = normalizePlanTier(data.planTier ?? (profile as any)?.planTier ?? "Teams");
  const status = normalizeActivityStatus((profile as any)?.activityStatus ?? (profile as any)?.status ?? null);

  const corePrivacy = {
    emailPrivate: Boolean((profile as any)?.corePrivacy?.emailPrivate ?? (profile as any)?.emailPrivate),
    phonePrivate: Boolean((profile as any)?.corePrivacy?.phonePrivate ?? (profile as any)?.phonePrivate),
    dobPrivate: Boolean((profile as any)?.corePrivacy?.dobPrivate ?? (profile as any)?.dobPrivate),
  };

  const ctx = { viewer: "PUBLIC" as const, plan, status, corePrivacy };

  // Always show these sections on public profile
  const showVideoSocial = true;
  const showCoachesRefs = true;

  const showChat = canViewSection(ctx, "CHAT");
  const showContactEmail = canViewCoreField(ctx, "email");
  const showContactPhone = canViewCoreField(ctx, "phone");

  const profileForHeader: PublicProfile = {
    ...profile,
    ncaaId: (idsFromLS?.ncaaId ?? (profile as any).ncaaId ?? null) as any,
    naiaEcid: (idsFromLS?.naiaEcid ?? (profile as any).naiaEcid ?? null) as any,
  };

  /** ---------- Academics mapping ---------- */
  const toArray = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
  const ac = (profile as any).academics ?? {};
const academicsData: AcademicsData = {
  bio: ac.bio ?? ac.academicBio ?? null,
  gradYear: profile.gradYear ?? ac.gradYear ?? null,
  gpa: profile.gpa ?? ac.gpa ?? null,
  gpaOutOf: ac.gpaOutOf ?? ac.gpa_scale ?? ac.gpaScale ?? null,
  sat: ac.sat ?? ac.satScore ?? null,
  act: ac.act ?? ac.actScore ?? null,
  highSchool: ac.highSchool ?? ac.highSchoolName ?? null,
  highSchoolWebsite: ac.highSchoolWebsite ?? ac.hsGeneralWebsiteUrl ?? null,
  city: ac.city ?? ac.hsCity ?? null,
  state: ac.state ?? ac.hsState ?? null,
  areasOfStudy: Array.isArray(ac.areasOfStudy)
    ? ac.areasOfStudy
    : String(ac.areasOfStudyInput ?? ac.intendedMajors ?? ac.academicMajors ?? "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
  transcriptUrls: toArray(ac.transcripts ?? ac.transcriptUrls ?? ac.transcriptUrl)
    .map(String)
    .filter(Boolean),
  reportCardUrls: toArray(ac.reportCards ?? ac.reportCardUrls ?? ac.reportCardUrl)
    .map(String)
    .filter(Boolean),
  otherDocs: toArray(ac.otherAcademicDocs)
    .map((d: any) =>
      typeof d === "string" ? { label: null, url: d } : { label: d?.label ?? d?.name ?? null, url: d?.url ?? "" }
    )
    .filter((d: any) => !!d.url),
};

  /** ---------- Athletics mapping ---------- */
  const at = (profile as any).athletics ?? {};
  const eligibilityRegistered: boolean | null =
    at.eligibilityRegistered ?? at.registeredEligibilityCenters ?? at.ncaaNaiaRegistered ?? null;

  const athleticBio: string | null = at.playerBio ?? at.athleticBio ?? null;

  const derivedPositions =
    profile.positions ?? {
      primary: profile.primaryPos ?? null,
      secondary: profile.secondaryPos ? [profile.secondaryPos] : [],
    };

  const isPitcherSelected =
    String(profile.isPitcher ?? "").toLowerCase() === "yes" ||
    derivedPositions.primary === "P" ||
    (Array.isArray(derivedPositions.secondary) && derivedPositions.secondary.includes("P"));

  const hand = profile.pitcherHand === "RHP" || profile.pitcherHand === "LHP" ? profile.pitcherHand : null;
  const showPitcherHandPill = isPitcherSelected && !!hand;

  const athleticsTabTeamsRaw: any[] = Array.isArray(at.teams) ? at.teams : [];
  const athleticsTeams: TeamEntry[] = athleticsTabTeamsRaw
    .map((t) => ({
      kind: t?.kind ?? null,
      name: t?.name ?? null,
      city: t?.city ?? null,
      state: t?.state ?? null,
      scheduleUrl: t?.scheduleUrl ?? null,
      websiteUrl: t?.websiteUrl ?? null,
      statsTeamName: null,
      statsSeason: null,
      statsYear: null,
      stats: null,
    }))
    .filter((t) => !!(String(t.name || "").trim() || String(t.scheduleUrl || "").trim() || String(t.websiteUrl || "").trim()));

  const athleticsData: AthleticsData = {
    bio: athleticBio,
    eligibilityRegistered,
    primaryPos: derivedPositions.primary ?? null,
    secondaryPos: Array.isArray(derivedPositions.secondary) ? derivedPositions.secondary : [],
    pitcher: showPitcherHandPill ? hand : null,
    bats: profile.bats ?? null,
    throws: profile.throws ?? null,
    teams: athleticsTeams,
  };

  /** ---------- Stats mapping ---------- */
  const rawSeasons: any[] = Array.isArray(data.stats?.seasons)
    ? data.stats!.seasons
    : Array.isArray(profile.seasons)
    ? (profile.seasons as any[])
    : [];

  const normalizeObj = (obj: any) => (obj && typeof obj === "object" ? obj : undefined);
  const pruneEmptyStatsMap = (obj: any): any | null => {
    if (!obj || typeof obj !== "object") return null;
    const values = Object.values(obj);
    if (values.length === 0) return null;
    const hasRealValue = values.some((v) => !(v === null || v === undefined || v === ""));
    return hasRealValue ? obj : null;
  };

  const statsTeams = rawSeasons.map((s: any) => {
    const rawHitting = normalizeObj(s?.hitting) ?? normalizeObj(s?.stats?.hitting);
    const rawFielding = normalizeObj(s?.fielding) ?? normalizeObj(s?.stats?.fielding);
    const rawCatching = normalizeObj(s?.catching) ?? normalizeObj(s?.stats?.catching);
    const rawPitching = normalizeObj(s?.pitching) ?? normalizeObj(s?.stats?.pitching);

    return {
      kind: s?.kind ?? null,
      statsTeamName: String(s?.team ?? s?.teamName ?? s?.name ?? "").trim() || null,
      statsSeason: s?.seasonTerm ?? s?.season ?? null,
      statsYear: s?.seasonYear ?? s?.year ?? null,
      stats: {
        hitting: pruneEmptyStatsMap(rawHitting),
        fielding: pruneEmptyStatsMap(rawFielding),
        catching: pruneEmptyStatsMap(rawCatching),
        pitching: pruneEmptyStatsMap(rawPitching),
      },
      statsFileUrls: [],
      statsUrl: null,
    };
  });

  /** ---------- Metrics mapping ---------- */
  const m = data.metrics ?? {};
  const seriesFromA =
    Array.isArray(m.series) &&
    m.series
      .map((s: any) => ({
        key: String(s?.key ?? s?.metricKey ?? "").trim(),
        label: String(s?.label ?? s?.name ?? s?.key ?? "").trim() || "Metric",
        unit: s?.unit ?? null,
        points: Array.isArray(s?.points)
          ? s.points
              .filter((p: any) => p && (p.date || p.monthYear))
              .map((p: any) => ({
                date: String(p.date ?? p.monthYear),
                value: p.value == null ? null : Number(p.value),
                source: p.source ?? null,
              }))
          : [],
        ageAverages: s?.ageAverages && typeof s.ageAverages === "object" ? s.ageAverages : null,
      }))
      .filter((s: any) => s.key);

  const series = seriesFromA && seriesFromA.length ? seriesFromA : [];

  const metricsData: MetricsData = {
    dob: profile.dob ?? m.dob ?? null,
    series,
    positions: derivedPositions,
    isPitcher: (profile as any).isPitcher ?? (at as any).isPitcher ?? null,
    pitcherHand: (profile as any).pitcherHand ?? (at as any).pitcherHand ?? null,
  };

  /** ---------- Coaches / References ---------- */
  const rawCoachesFromApi: any[] = (() => {
    const c = (profile as any).coaches;
    const r = (profile as any).references;
    const cr = (profile as any).coachesReferences;
    const toArr2 = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
    return toArr2(c).concat(toArr2(r)).concat(toArr2(cr)).filter(Boolean);
  })();

  const coachesData: CoachesData = {
    coaches: rawCoachesFromApi.map((c) => ({
      firstName: c?.firstName ?? c?.first ?? null,
      lastName: c?.lastName ?? c?.last ?? null,
      teamOrOrg: c?.teamOrOrg ?? c?.team ?? c?.organization ?? c?.org ?? null,
      email: c?.email ?? c?.coachEmail ?? null,
      phone: c?.phone ?? c?.coachPhone ?? null,
      focus: c?.focus ?? c?.coachingFocus ?? c?.role ?? c?.position ?? null,
    })),
  };

  /** ---------- Connect row ---------- */
  const connectEmail = coreEmail;
  const connectPhone = corePhone;

  const xUrl = mediaDataView?.xUrl ?? null;
  const instagramUrl = mediaDataView?.instagramUrl ?? null;
  const youtubeUrl = mediaDataView?.youtubeUrl ?? null;

  const connectChatUrl = (mediaDataView as any)?.chatUrl ?? (vsRaw as any)?.chatUrl ?? null;

  const hasPhone = showContactPhone && !!connectPhone;
  const hasEmail = showContactEmail && !!connectEmail;
  const hasX = showVideoSocial && !!xUrl;
  const hasInstagram = showVideoSocial && !!instagramUrl;
  const hasYouTube = showVideoSocial && !!youtubeUrl;
  const hasChat = showChat && !!connectChatUrl;

  const phoneTitle = hasPhone ? String(connectPhone) : showContactPhone ? "Phone not provided" : "Phone is private";
  const emailTitle = hasEmail ? String(connectEmail) : showContactEmail ? "Email not provided" : "Email is private";

  const xTitle = hasX ? String(xUrl) : "X not provided";
  const instagramTitle = hasInstagram ? String(instagramUrl) : "Instagram not provided";
  const youtubeTitle = hasYouTube ? String(youtubeUrl) : "YouTube not provided";
  const chatTitle = hasChat ? String(connectChatUrl) : showChat ? "Chat feature coming soon" : "Not available";

  /** ---------- Render ---------- */
  return (
    <main style={wrap}>
      {/* Coach-only jacket tools */}
      <CoachViewerTools
        isCoachViewer={isCoachViewer}
        playerProfileId={playerProfileId}
        sectionScrollMargin={SECTION_SCROLL_MARGIN}
      />

      {/* Sticky block */}
      <section
        style={{
          position: "sticky",
          top: 110,
          zIndex: 20,
          marginTop: isCoachViewer && playerProfileId ? 16 : 0,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            ...card,
            marginTop: 0,
            padding: 12,
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          }}
        >
          {/* Row A */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <JumpToSectionNav sections={jumpSections} />

            <a href={cardViewUrl} style={{ ...primaryButton, whiteSpace: "nowrap" }}>
              View Player Card
            </a>
          </div>

          {/* Row B */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={connectRow}>
              <span style={connectLabel}>Connect:</span>

              <a
                href={hasPhone ? `tel:${connectPhone}` : undefined}
                title={phoneTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasPhone ? 1 : 0.35,
                  pointerEvents: hasPhone ? "auto" : "none",
                  cursor: hasPhone ? "pointer" : "default",
                }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              >
                <img src="/icons/call.webp" alt="Call" width={18} height={18} style={{ display: "block" }} />
                <span style={srOnly}>Call</span>
              </a>

              <a
                href={hasEmail ? `mailto:${connectEmail}` : undefined}
                title={emailTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasEmail ? 1 : 0.35,
                  pointerEvents: hasEmail ? "auto" : "none",
                  cursor: hasEmail ? "pointer" : "default",
                }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              >
                <img src="/icons/email.webp" alt="Email" width={18} height={18} style={{ display: "block" }} />
                <span style={srOnly}>Email</span>
              </a>

              <a
                href={hasX ? xUrl : undefined}
                title={xTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasX ? 1 : 0.35,
                  pointerEvents: hasX ? "auto" : "none",
                  cursor: hasX ? "pointer" : "default",
                }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              >
                <img src="/icons/x.webp" alt="X" width={18} height={18} style={{ display: "block" }} />
                <span style={srOnly}>X</span>
              </a>

              <a
                href={hasInstagram ? instagramUrl : undefined}
                title={instagramTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasInstagram ? 1 : 0.35,
                  pointerEvents: hasInstagram ? "auto" : "none",
                  cursor: hasInstagram ? "pointer" : "default",
                }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              >
                <img src="/icons/instagram.webp" alt="Instagram" width={18} height={18} style={{ display: "block" }} />
                <span style={srOnly}>Instagram</span>
              </a>

              <a
                href={hasYouTube ? youtubeUrl : undefined}
                title={youtubeTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasYouTube ? 1 : 0.35,
                  pointerEvents: hasYouTube ? "auto" : "none",
                  cursor: hasYouTube ? "pointer" : "default",
                }}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              >
                <img src="/icons/youtube.webp" alt="YouTube" width={48} height={48} style={{ display: "block" }} />
                <span style={srOnly}>YouTube</span>
              </a>

              <span
                title={chatTitle}
                style={{
                  ...connectIconLink,
                  opacity: hasChat ? 1 : 0.6,
                  cursor: hasChat ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => Object.assign((e.currentTarget as any).style, connectIconHover)}
                onMouseLeave={(e) =>
                  Object.assign((e.currentTarget as any).style, { transform: "none", boxShadow: "none" })
                }
              >
                <img src="/icons/chat.png" alt="" aria-hidden="true" width={48} height={48} style={{ display: "block" }} />
                <span style={srOnly}>ScoutLine Chat</span>
              </span>
            </div>

            {searchParams.get("source") === "recruiting-board" ? (
              <a
                href="/dashboard/coach/recruiting-board"
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #0ea5e9",
                  background: "#0ea5e9",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Back to Recruiting Board
              </a>
            ) : (
              <div style={{ width: 1, height: 1 }} />
            )}
          </div>
        </div>
      </section>

      {showDebug ? (
        <section style={card}>
          <h2 style={h2}>Visibility (debug)</h2>
          <pre style={pre}>
            {JSON.stringify({ plan, status, corePrivacy, showVideoSocial, showCoachesRefs, showChat }, null, 2)}
          </pre>
        </section>
      ) : null}

      {/* Core */}
      <SectionWrapper id="core">
        <PublicProfileHeader
          profile={{
            ...profileForHeader,
            positions: derivedPositions,
            gpa: academicsData.gpa as any,
            gradYear: academicsData.gradYear as any,
          }}
          metrics={data.metrics}
          demoMode={data.demoMode}
          cardStyle={card}
          h1Style={h1}
          pillStyle={pillStyle}
        />
      </SectionWrapper>

      {primaryUrlView ? (
  <SectionWrapper id="primary-video">
    <PublicMedia
      media={mediaDataView}
      title="Primary Video"
      primaryUrl={primaryUrlView}
      hidePrimaryInGrid={true}
      showOnlyPrimary={true}
      hideConnectRow={true}
      cardStyle={card}
      h2Style={h2}
      pillStyle={pillStyle}
    />
  </SectionWrapper>
) : null}

      <SectionWrapper id="academics">
        <PublicAcademics academics={academicsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      <SectionWrapper id="athletics">
        <PublicAthletics athletics={athleticsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      <SectionWrapper id="metrics">
        <PublicMetrics metrics={metricsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      <SectionWrapper id="stats">
        <PublicStats
          stats={{ teams: statsTeams, seasons: rawSeasons }}
          title="Stats"
          cardStyle={card}
          h2Style={h2}
          pillStyle={pillStyle}
        />
      </SectionWrapper>

      {showVideoSocial ? (
        <SectionWrapper id="video">
          <PublicMedia
            media={mediaDataView}
            primaryUrl={primaryUrlView}
            hidePrimaryInGrid={true}
            cardStyle={card}
            h2Style={h2}
            pillStyle={pillStyle}
          />
        </SectionWrapper>
      ) : null}

      {showCoachesRefs ? (
        <SectionWrapper id="coaches">
          <PublicCoaches data={coachesData} cardStyle={card} h2Style={h2} />
        </SectionWrapper>
      ) : null}

      {/* Optional deep debug payload */}
      {showDebug ? (
        <section style={card}>
          <h2 style={h2}>Raw payload (debug)</h2>
          <pre style={pre}>{JSON.stringify(data, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}

/** ---------- Styles ---------- */
const wrap: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "24px 16px",
};

const h1: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 900,
  margin: 0,
};

const card: React.CSSProperties = {
  marginTop: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
};

const h2: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  fontWeight: 900,
};

const pre: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 13,
  lineHeight: 1.35,
};

const pillStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "3px 10px",
};

const primaryButton: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid #eab308",
  background: "#eab308",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};

const connectRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 20,
  marginTop: 4,
};

const connectLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.06,
};

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const connectIconLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  borderRadius: 9999,
  textDecoration: "none",
  background: "transparent",
  transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
};

const connectIconHover: React.CSSProperties = {
  transform: "translateY(-1px)",
  boxShadow: "0 4px 10px rgba(15,23,42,0.18)",
  background: "#f8fafc",
};
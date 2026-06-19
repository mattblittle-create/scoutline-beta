// app/(public)/player/[slug]/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PublicProfileHeader from "@/app/components/public/PublicProfileHeader";
import PublicAcademics, { AcademicsData } from "@/app/components/public/PublicAcademics";
import PublicAthletics, { AthleticsData, TeamEntry } from "@/app/components/public/PublicAthletics";
import PublicStats from "@/app/components/public/PublicStats";
import PublicMetrics, { MetricsData } from "@/app/components/public/PublicMetrics";
import PublicMedia, { MediaData } from "@/app/components/public/PublicMedia";
import PublicCoaches, { CoachesData } from "@/app/components/public/PublicCoaches";
import ContactActionRow from "@/app/components/public/ContactActionRow";
import CoachViewerTools from "./CoachViewerTools";

import { toPublicMedia } from "@/app/lib/publicMedia";
import {
  normalizePlanTier,
  normalizeActivityStatus,
  canViewSection,
  canViewCoreField,
  feature,
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

const SECTION_SCROLL_MARGIN_DESKTOP = 300;
const SECTION_SCROLL_MARGIN_MOBILE = 200;

function SectionWrapper({
  id,
  children,
  isMobile = false,
}: {
  id: string;
  children: React.ReactNode;
  isMobile?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        scrollMarginTop: isMobile
          ? SECTION_SCROLL_MARGIN_MOBILE
          : SECTION_SCROLL_MARGIN_DESKTOP,
      }}
    >
      {children}
    </section>
  );
}

export default function PublicPlayerPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
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

  // ---------------- Viewer / coach tools detection ----------------
  const [isCoachViewer, setIsCoachViewer] = React.useState(false);
  const [viewerRole, setViewerRole] = React.useState<string | null>(null);
  const [playerUserId, setPlayerUserId] = React.useState<string | null>(null);
  const [messageRecruitSending, setMessageRecruitSending] = React.useState(false);

  const [guestBannerDismissed, setGuestBannerDismissed] = React.useState(false);
  const [showShareProfile, setShowShareProfile] = React.useState(false);
  const [shareCoachEmail, setShareCoachEmail] = React.useState("");
  const [shareSubject, setShareSubject] = React.useState("");
  const [shareMessage, setShareMessage] = React.useState("");
  const [sharingProfile, setSharingProfile] = React.useState(false);
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const viewEventTrackedRef = React.useRef(false);

  const isCoachRole = React.useMemo(() => {
  const role = String(viewerRole || "").trim().toUpperCase();

  return role === "COACH" || role === "COLLEGE_COACH";
}, [viewerRole]);

  const canMessageRecruit = isCoachRole;

const isCoachShareView =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("view") === "coach";

const isGuestCoachMode = isCoachShareView && !isCoachRole;
const showGuestCoachBanner = isGuestCoachMode && !guestBannerDismissed;

  const coachSignupUrl = "/onboarding/coach";
  const coachLoginUrl = "/login";
  const publicProfileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/player/${encodeURIComponent(slug)}`
      : `https://www.myscoutline.com/player/${encodeURIComponent(slug)}`;

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        const meJson = await meRes.json().catch(() => null);
        const role = String(meJson?.user?.role || meJson?.role || "")
          .trim()
          .toUpperCase();

        if (!cancelled) {
          setViewerRole(role || null);
        }

        if (!cancelled) {
          setIsCoachViewer(role === "COACH" || role === "COLLEGE_COACH");
        }
      } catch {
        if (!cancelled) {
          setViewerRole(null);
          setIsCoachViewer(false);
        }
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

  const vsRaw: any =
  (safeProfile as any).videoSocial ??
  (safeProfile as any).videos ??
  (safeProfile as any).media ??
  {};
  const coreEmail = safeProfile.email ?? safeProfile.contact?.email ?? null;
  const corePhone = safeProfile.phone ?? safeProfile.contact?.phone ?? null;

  const playerProfileId =
    String((safeProfile as any)?.playerProfileId || (safeProfile as any)?.id || "").trim() || null;

  React.useEffect(() => {
    let cancelled = false;

    async function loadCoachPlayerContext() {
      if (!isCoachViewer || !playerProfileId) {
        if (!cancelled) setPlayerUserId(null);
        return;
      }

      try {
        const res = await fetch(`/api/coach/player/${encodeURIComponent(playerProfileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        const nextUserId = String(json?.data?.user?.id || "").trim();
        setPlayerUserId(nextUserId || null);
      } catch {
        if (!cancelled) setPlayerUserId(null);
      }
    }

    loadCoachPlayerContext();

    return () => {
      cancelled = true;
    };
  }, [isCoachViewer, playerProfileId]);

  const cardViewUrl = `/player/${encodeURIComponent(slug)}/card`;

  // ✅ FIX: hooks must be called before any early return
const jumpSections = React.useMemo(() => {
  return [...PUBLIC_SECTIONS];
}, []);

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
  const toArrayOrScalar = (
    v: any
  ): { url: string; title?: string | null; category?: string | null }[] =>
    toArray(v)
      .map((x) =>
        typeof x === "string"
          ? { url: x, title: null, category: null }
          : {
              url: String(x?.url || x?.publicUrl || "").trim(),
              title: x?.title ?? x?.name ?? x?.label ?? null,
              category:
                x?.category === "Hitting" ||
                x?.category === "Fielding" ||
                x?.category === "Pitching" ||
                x?.category === "Baserunning"
                  ? x.category
                  : null,
            }
      )
      .filter((o) => !!o.url);

    const rawLocalUploads = [
      ...toArrayOrScalar((vsRaw as any).localVideos),
      ...toArrayOrScalar((safeProfile as any).localVideos),
      ...toArrayOrScalar((safeProfile as any).videoSocial?.localVideos),
    ];

    const legacyUploads = [
      ...toArrayOrScalar((vsRaw as any).uploads),
      ...toArrayOrScalar((vsRaw as any).uploadedVideos),
      ...toArrayOrScalar((vsRaw as any).videoFiles),
    ];

    const legacyLinks = [
      ...toArrayOrScalar((vsRaw as any).links),
      ...toArrayOrScalar((vsRaw as any).videoLinks),
    ];

    if (rawLocalUploads.length || legacyUploads.length) {
      const merged = (md.uploadedVideos ?? []).concat(rawLocalUploads, legacyUploads);
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
      xUrl: (vsRaw as any)?.xUrl ?? (vsRaw as any)?.social?.xUrl ?? md.xUrl ?? null,
      instagramUrl: (vsRaw as any)?.instagramUrl ?? (vsRaw as any)?.social?.instagramUrl ?? md.instagramUrl ?? null,
      youtubeUrl:
        (vsRaw as any)?.youtubeUrl ??
        (vsRaw as any)?.youtubeChannel ??
        (vsRaw as any)?.social?.youtubeUrl ??
        md.youtubeUrl ??
        null,
      gameChangerUrl:
        (vsRaw as any)?.gameChangerUrl ??
        (vsRaw as any)?.social?.gameChangerUrl ??
        md.gameChangerUrl ??
        null,
      maxPrepsUrl:
        (vsRaw as any)?.maxPrepsUrl ??
        (vsRaw as any)?.social?.maxPrepsUrl ??
        md.maxPrepsUrl ??
        null,
      rapsodoUrl:
        (vsRaw as any)?.rapsodoUrl ??
        (vsRaw as any)?.social?.rapsodoUrl ??
        md.rapsodoUrl ??
        null,
      trackmanUrl:
        (vsRaw as any)?.trackmanUrl ??
        (vsRaw as any)?.trackManUrl ??
        (vsRaw as any)?.social?.trackmanUrl ??
        (vsRaw as any)?.social?.trackManUrl ??
        md.trackmanUrl ??
        null,
      pocketRadarUrl:
        (vsRaw as any)?.pocketRadarUrl ??
        (vsRaw as any)?.social?.pocketRadarUrl ??
        md.pocketRadarUrl ??
        null,
    };

    return md;
  }, [vsRaw, safeProfile, coreEmail, corePhone]);

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

React.useEffect(() => {
  console.log("SCOUTLINE_TRACKING_EFFECT_REACHED");

  const playerProfileId =
    (data as any)?.profile?.profileId ||
    (data as any)?.profileId ||
    "";

  const profileSlug = slug || (data as any)?.profile?.slug || "";

  console.log("PROFILE_VIEW_EFFECT_CHECK", {
    alreadyTracked: viewEventTrackedRef.current,
    hasData: !!data,
    playerProfileId,
    profileSlug,
  });

  if (viewEventTrackedRef.current) return;
  if (!data) return;
  if (!playerProfileId && !profileSlug) return;

  const isCoachShareView =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "coach";

  viewEventTrackedRef.current = true;

  console.log("PROFILE_VIEW_CLIENT_TRACKING", {
    playerProfileId,
    slug: profileSlug,
    source: isCoachShareView ? "SHARED_LINK" : "PUBLIC_PROFILE",
  });

  fetch("/api/public/player/view-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerProfileId,
      slug: profileSlug,
      source: isCoachShareView ? "SHARED_LINK" : "PUBLIC_PROFILE",
    }),
  })
    .then(async (res) => {
      const json = await res.json().catch(() => null);
      console.log("PROFILE_VIEW_CLIENT_RESULT", res.status, json);
    })
    .catch((err) => {
      console.error("PROFILE_VIEW_CLIENT_ERROR", err);
    });
}, [data, slug]);

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

  const METRIC_META: Record<string, { label: string; unit: string | null }> = {
    homeToFirst: { label: "Home to 1B", unit: "sec" },
    sixtyYdDash: { label: "60 Yard Dash", unit: "sec" },
    exitVelo: { label: "Exit Velocity", unit: "mph" },
    rawThrowVelo: { label: "Raw Throwing Velocity", unit: "mph" },
    infieldThrowVelo: { label: "Infield Throwing Velocity", unit: "mph" },
    outfieldThrowVelo: { label: "Outfield Throwing Velocity", unit: "mph" },
    catcherThrowVelo: { label: "Catcher Throwing Velocity", unit: "mph" },
    avgFbVelo: { label: "Avg Fastball Velocity", unit: "mph" },
    avgChVelo: { label: "Avg Changeup Velocity", unit: "mph" },
    avgBbVelo: { label: "Avg Breaking Ball Velocity", unit: "mph" },
    popTime: { label: "Catcher Pop Time", unit: "sec" },
    benchPress: { label: "Bench Press", unit: "lbs" },
    squat: { label: "Squat", unit: "lbs" },
    deadLift: { label: "Dead Lift", unit: "lbs" },
  };

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

  const seriesFromRaw =
    !seriesFromA || seriesFromA.length === 0
      ? Object.entries(METRIC_META)
          .map(([key, meta]) => {
            const arr = Array.isArray((m as any)[key]) ? (m as any)[key] : [];
const points = arr
  .map((p: any) => {
    const rawDate = p?.date ?? p?.monthYear ?? "";

    // normalize MM/YYYY safely
    const normalizedDate = String(rawDate)
      .trim()
      .replace(/^(\d{1})\//, "0$1/"); // 4/2025 → 04/2025

    const value =
      p?.value == null || p?.value === "" ? null : Number(p.value);

    return {
      date: normalizedDate,
      value: Number.isFinite(value) ? value : null,
      source: p?.source ?? null,
    };
  })
  .filter((p: any) => {
    return p.date && p.value !== null;
  });

            return {
              key,
              label: meta.label,
              unit: meta.unit,
              points,
              ageAverages: null,
            };
          })
          .filter((s) => Array.isArray(s.points) && s.points.length >= 1)
      : [];

  const series =
    seriesFromA && seriesFromA.length > 0
      ? seriesFromA
      : seriesFromRaw;

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

    // Prefer the first populated source only, because the public API
    // intentionally mirrors the same normalized array into all three keys.
    if (toArr2(c).length) return toArr2(c).filter(Boolean);
    if (toArr2(r).length) return toArr2(r).filter(Boolean);
    if (toArr2(cr).length) return toArr2(cr).filter(Boolean);
    return [];
  })();

const coachesData: CoachesData = {
  coaches: rawCoachesFromApi.map((c) => {
    const teamOrOrg =
      (
        c?.teamOrOrg ||
        c?.organization ||
        c?.team ||
        c?.org ||
        null
      );

    return {
      firstName: c?.firstName ?? c?.first ?? null,
      lastName: c?.lastName ?? c?.last ?? null,
      teamOrOrg: typeof teamOrOrg === "string" ? teamOrOrg.trim() || null : null,
      email: c?.email ?? c?.coachEmail ?? null,
      phone: c?.phone ?? c?.coachPhone ?? null,
      focus: c?.focus ?? c?.coachingFocus ?? c?.role ?? c?.position ?? null,
    };
  }),
};

  /** ---------- Connect row ---------- */
  const connectEmail = coreEmail;
  const connectPhone = corePhone;

  const connectChatUrl = (mediaDataView as any)?.chatUrl ?? (vsRaw as any)?.chatUrl ?? null;

  async function handleMessageRecruit() {
    if (!playerUserId || messageRecruitSending) return;

    try {
      setMessageRecruitSending(true);

      const res = await fetch("/api/chat/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otherUserId: playerUserId,
          subject: "ScoutLine Coach Outreach",
          initialMessage: "",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to start chat (${res.status})`);
      }

      const conversationId = String(json?.data?.conversation?.id || "").trim();
      if (!conversationId) {
        throw new Error("Conversation was created, but no conversation id was returned.");
      }

      router.push(`/dashboard/coach/chat?conversationId=${encodeURIComponent(conversationId)}`);
    } catch (e: any) {
      window.alert(e?.message || "Failed to start ScoutLine Chat.");
    } finally {
      setMessageRecruitSending(false);
    }
  }

  function buildShareSubject() {
  const p = (data as any)?.profile || {};

  const playerName = [p.firstName, p.lastName]
    .filter(Boolean)
    .join(" ");

  const gradYear = p.gradYear || "";
  const primaryPos = p.primaryPos || p.primaryPosition || "";
  const secondaryPos = p.secondaryPos || p.secondaryPosition || "";
const pitcherHandedness =
  p.pitcherHand ||
  "";

  const positionString = [
    primaryPos,
    secondaryPos,
    pitcherHandedness,
  ]
    .filter(Boolean)
    .join(" / ");

  return [
    playerName,
    gradYear,
    positionString,
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildShareMessage() {
  const p = (data as any)?.profile || {};

  const playerName = [p.firstName, p.lastName]
    .filter(Boolean)
    .join(" ");

  const highSchool = p.hsName || "";

  const travelTeam =
    p.travelTeamName ||
    p.travelBallTeam ||
    "";

  const otherTeams = Array.isArray(p.otherTeams)
    ? p.otherTeams
    : [];

  return [
    "Coach,",
    "",
    "I wanted to share my ScoutLine recruiting profile with you.",
    "",
    "Thank you for your time and consideration.",
    "",
    playerName,
    highSchool,
    travelTeam,
    ...otherTeams,
  ]
    .filter(Boolean)
    .join("\n");
}

  async function handleShareProfile() {
  const email = shareCoachEmail.trim();

  if (!email) {
    setShareStatus("Enter a coach email address.");
    return;
  }

  try {
    setSharingProfile(true);
    setShareStatus(null);

const res = await fetch("/api/player/share-profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    slug,
    subject: shareSubject.trim(),
    coachEmail: email,
    message: shareMessage.trim(),
    profileUrl: `${publicProfileUrl}?view=coach`,
    player: {
      firstName: (data as any)?.profile?.firstName || "",
      lastName: (data as any)?.profile?.lastName || "",
      gradYear: (data as any)?.profile?.gradYear || "",
      primaryPos:
        (data as any)?.profile?.primaryPos ||
        (data as any)?.profile?.primaryPosition ||
        "",
      secondaryPos:
        (data as any)?.profile?.secondaryPos ||
        (data as any)?.profile?.secondaryPosition ||
        "",
      pitcherHandedness:
        (data as any)?.profile?.pitcherHandedness ||
        (data as any)?.profile?.throwingHand ||
        "",
      highSchool: (data as any)?.profile?.highSchool || "",
      travelTeam:
        (data as any)?.profile?.travelTeam ||
        (data as any)?.profile?.travelBallTeam ||
        "",
      otherTeams: (data as any)?.profile?.otherTeams || [],
    },
  }),
});

  const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Could not send profile.");
    }

    setShareStatus("Profile sent.");
    setShareCoachEmail("");
    setShareMessage("");
  } catch (err: any) {
    setShareStatus(err?.message || "Could not send profile.");
  } finally {
    setSharingProfile(false);
  }
}

  /** ---------- Render ---------- */
  return (
    <main style={wrap}>
      {showGuestCoachBanner ? (
  <section
    style={{
      ...card,
      position: "sticky",
      top: 0,
      zIndex: 50,
      marginBottom: 12,
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
      boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 950, color: "#1e3a8a", marginBottom: 6 }}>
          Viewing as Guest Coach
        </div>

        <div style={{ color: "#334155", fontSize: 13, fontWeight: 750, lineHeight: 1.5 }}>
          Coach accounts are always free and take just a few minutes to set up.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {[
            "Search full database of players",
            "Build recruiting boards",
            "Share notes with program staff",
            "Track prospects",
            "Message players",
            "Access verified program tools",
          ].map((item) => (
            <span key={item} style={smallNeutralPillStyle}>
              ✓ {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <a
  href={coachSignupUrl}
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "10px 14px",
    background: "#0f172a",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
  }}
>
          Create Free Coach Account
        </a>

        <a
  href={coachLoginUrl}
  style={{
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
  }}
>
          Log In
        </a>

        <button
          type="button"
          onClick={() => setGuestBannerDismissed(true)}
          style={{
  borderRadius: 999,
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
}}
        >
          Not Now
        </button>
      </div>
    </div>
  </section>
) : null}
      {/* Sticky block */}
      <section
        style={{
          position: "sticky",
          top: isMobile ? 118 : 110,
          zIndex: 40,
          marginTop: isCoachViewer && playerProfileId ? 16 : 0,
          marginBottom: isMobile ? 6 : 8,
        }}
      >
        <div
          style={{
            ...card,
            marginTop: 0,
            padding: isMobile ? 8 : 12,
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
            overflow: "hidden",
          }}
        >
      {/* Coach-only jacket tools */}
        {isCoachViewer && playerProfileId ? (
          <CoachViewerTools
            isCoachViewer={isCoachViewer}
            playerProfileId={playerProfileId}
            sectionScrollMargin={340}
          />
        ) : null}

          {/* Row A */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: isMobile ? 6 : 10,
            }}
          >
{isMobile ? (
  <div
    style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
      width: "100%",
      minWidth: 0,
    }}
  >
    <select
      aria-label="Jump to section"
      defaultValue=""
      onChange={(e) => {
        const id = e.target.value;
        if (!id) return;

        const el = document.getElementById(id);
        if (el) {
          const offset = isMobile
            ? SECTION_SCROLL_MARGIN_MOBILE
            : SECTION_SCROLL_MARGIN_DESKTOP;

          const y =
            el.getBoundingClientRect().top +
            window.scrollY -
            offset;

          window.scrollTo({
            top: Math.max(0, y),
            behavior: "smooth",
          });
        }

        e.currentTarget.value = "";
      }}
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        height: 34,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: 12,
        fontWeight: 800,
        padding: "0 10px",
      }}
    >
      <option value="">Jump To...</option>
      {jumpSections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.label}
        </option>
      ))}
    </select>

    <a
      href={cardViewUrl}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 34,
        padding: "0 10px",
        borderRadius: 10,
        border: "1px solid #eab308",
        background: "#eab308",
        color: "#334155",
        fontSize: 12,
        fontWeight: 900,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Card
    </a>
  </div>
) : (
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

    {jumpSections.map((section) => (
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

    <a
      href={cardViewUrl}
      style={{
        fontSize: 13,
        fontWeight: 800,
        padding: "6px 12px",
        borderRadius: 9999,
        border: "1px solid #eab308",
        background: "#eab308",
        color: "#334155",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      View Player Card
    </a>
  </nav>
)}
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

              <ContactActionRow
                email={showContactEmail ? connectEmail : null}
                phoneDigits={showContactPhone ? connectPhone : null}
                xUrl={showVideoSocial ? mediaDataView?.xUrl ?? null : null}
                instagramUrl={showVideoSocial ? mediaDataView?.instagramUrl ?? null : null}
                youtubeUrl={showVideoSocial ? mediaDataView?.youtubeUrl ?? null : null}
                gameChangerUrl={showVideoSocial ? (mediaDataView as any)?.gameChangerUrl ?? null : null}
                maxPrepsUrl={showVideoSocial ? (mediaDataView as any)?.maxPrepsUrl ?? null : null}
                rapsodoUrl={showVideoSocial ? (mediaDataView as any)?.rapsodoUrl ?? null : null}
                trackmanUrl={showVideoSocial ? (mediaDataView as any)?.trackmanUrl ?? null : null}
                pocketRadarUrl={showVideoSocial ? (mediaDataView as any)?.pocketRadarUrl ?? null : null}
                chatUrl={showChat ? connectChatUrl : null}
              />

             {!isCoachRole ? (
  <button
    type="button"
    onClick={() => {
      setShowShareProfile((prev) => {
        const next = !prev;

        if (next) {
          setShareSubject(buildShareSubject());
          setShareMessage(buildShareMessage());
        }

        return next;
      });

      setShareStatus(null);
    }}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 34,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid #caa042",
      background: "#caa042",
      color: "#0f172a",
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
      cursor: "pointer",
    }}
  >
    Share Profile
  </button>
) : null}

              {canMessageRecruit ? (
                <button
                  type="button"
                  onClick={handleMessageRecruit}
                  disabled={!playerUserId || messageRecruitSending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 34,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #0ea5e9",
                    background: "#0ea5e9",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    cursor:
                      !playerUserId || messageRecruitSending
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      !playerUserId || messageRecruitSending
                        ? 0.65
                        : 1,
                  }}
                  title="Start ScoutLine Chat with this recruit"
                >
                  {messageRecruitSending ? "Opening Chat..." : "Message Recruit"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

{!isCoachRole && showShareProfile ? (
  <section style={{ ...card, marginTop: 10, marginBottom: 12 }}>
    <h2 style={h2}>Share Profile</h2>

    <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
      Send this public player profile directly to a college coach. The subject line, body, and signature are editable.
    </p>

    <div style={{ display: "grid", gap: 10 }}>
  <input
    type="text"
    value={shareSubject}
    onChange={(e) => setShareSubject(e.target.value)}
    placeholder="Subject"
    style={{
      width: "100%",
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 14,
      fontWeight: 700,
    }}
  />

<input
  type="email"
  value={shareCoachEmail}
  onChange={(e) => setShareCoachEmail(e.target.value)}
  placeholder="Coach email address"
  style={{
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 700,
  }}
/>

      <textarea
        value={shareMessage}
        onChange={(e) => setShareMessage(e.target.value)}
        placeholder="Optional message"
        rows={4}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 14,
          fontWeight: 700,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={handleShareProfile}
          disabled={sharingProfile}
style={{
  borderRadius: 999,
  padding: "10px 14px",
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
  cursor: sharingProfile ? "not-allowed" : "pointer",
  opacity: sharingProfile ? 0.7 : 1,
}}
        >
          {sharingProfile ? "Sending..." : "Send Profile"}
        </button>

        <button
          type="button"
          onClick={() => setShowShareProfile(false)}
          style={{
  borderRadius: 999,
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
}}
        >
          Cancel
        </button>

        {shareStatus ? (
          <span style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>
            {shareStatus}
          </span>
        ) : null}
      </div>
    </div>
  </section>
) : null}

      {showDebug ? (
        <section style={card}>
          <h2 style={h2}>Visibility (debug)</h2>
          <pre style={pre}>
            {JSON.stringify({ plan, status, corePrivacy, showVideoSocial, showCoachesRefs, showChat }, null, 2)}
          </pre>
        </section>
      ) : null}

      {/* Core */}
      <SectionWrapper id="core" isMobile={isMobile}>
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
  <SectionWrapper id="primary-video" isMobile={isMobile}>
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

      <SectionWrapper id="academics" isMobile={isMobile}>
        <PublicAcademics academics={academicsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      <SectionWrapper id="athletics" isMobile={isMobile}>
        <PublicAthletics athletics={athleticsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      <SectionWrapper id="metrics" isMobile={isMobile}>
        <PublicMetrics
          metrics={metricsData}
          canShowCharts={feature(ctx, "METRICS_GROWTH_CHARTS")}
          cardStyle={card}
          h2Style={h2}
          pillStyle={pillStyle}
        />
      </SectionWrapper>

      <SectionWrapper id="stats" isMobile={isMobile}>
        <PublicStats
          stats={{ teams: statsTeams, seasons: rawSeasons }}
          title="Stats"
          cardStyle={card}
          h2Style={h2}
          pillStyle={pillStyle}
        />
      </SectionWrapper>

      {showVideoSocial ? (
        <SectionWrapper id="video" isMobile={isMobile}>
          <PublicMedia
            media={mediaDataView}
            primaryUrl={primaryUrlView}
            showPrimaryHero={false}
            hidePrimaryInGrid={false}
            hideConnectRow={true}
            cardStyle={card}
            h2Style={h2}
            pillStyle={pillStyle}
          />
        </SectionWrapper>
      ) : null}

      {showCoachesRefs ? (
        <SectionWrapper id="coaches" isMobile={isMobile}>
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
  overflow: "hidden",
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
  gap: 8,
  marginTop: 2,
  minWidth: 0,
  maxWidth: "100%",
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

const smallNeutralPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 9px",
  background: "#ffffff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: "nowrap",
};
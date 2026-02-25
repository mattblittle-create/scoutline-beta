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

  // NEW: top-level governing IDs (for header pills)
  ncaaId?: string | null;
  naiaEcid?: string | null;

  videoSocial?: {
    externalVideos?: { id: string; title?: string; url: string; source?: string }[];
    localVideos?: { id: string; title?: string; publicUrl: string }[];
    social?: { xHandle?: string; instagramHandle?: string; youtubeChannelUrl?: string };
    chatUrl?: string | null;
    primary?: { kind: "local" | "external"; id: string } | null;
  };

  videos?: any;
  coaches?: any;
  references?: any;
  coachesReferences?: any;

  seasons?: any[] | null;

  // (optional) sometimes present from other API shapes
  planTier?: "Redshirt" | "Walk-On" | "All-American" | "Teams";

  // (optional) activity status shapes
  activityStatus?: string | null;
  status?: string | null;

  // (optional) core privacy shapes
  corePrivacy?: {
    emailPrivate?: boolean | null;
    phonePrivate?: boolean | null;
    dobPrivate?: boolean | null;
  } | null;
  emailPrivate?: boolean | null;
  phonePrivate?: boolean | null;
  dobPrivate?: boolean | null;
};

type DebugIdsTraceEntry = { path: string; raw: unknown; coerced: string | null };

type PublicPayload = {
  profile?: PublicProfile | null;
  metrics?: any | null;
  stats?: any | null; // { seasons: [...] }
  demoMode?: "global" | "allowlist" | "query" | null;
  planTier?: "Redshirt" | "Walk-On" | "All-American" | "Teams";
  debug?: {
    idsTrace: {
      ncaa: DebugIdsTraceEntry[];
      naia: DebugIdsTraceEntry[];
    };
    rawNamespaces: {
      has_atomic_keys: string[];
      has_academics_keys: string[];
      has_athletics_keys: string[];
      has_eligibility_keys: string[];
    };
  };
};

const PUBLIC_SECTIONS = [
  { id: "core", label: "Core" },
  { id: "academics", label: "Academics" },
  { id: "athletics", label: "Athletics" },
  { id: "metrics", label: "Metrics" },
  { id: "stats", label: "Stats" },
  { id: "video", label: "Videos" },
  { id: "coaches", label: "References" },
] as const;

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

// Wrap each major section so scroll-to anchors land with space under the sticky bar
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
  const demoParam = searchParams.get("demo") === "1";
  const fromTeaserCard = searchParams.get("from") === "teaser";

  // Debug toggle
  const showDebug =
    searchParams.get("debug") === "1" || process.env.NEXT_PUBLIC_SC_PUBLIC_DEBUG === "1";

  const [data, setData] = React.useState<PublicPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [showCoachPrompt, setShowCoachPrompt] = React.useState(false);

    // ---------------- Coach viewer tools (only when logged-in coach) ----------------
  const [isCoachViewer, setIsCoachViewer] = React.useState(false);

  const [coachRatingLoading, setCoachRatingLoading] = React.useState(false);
  const [coachRatingSaving, setCoachRatingSaving] = React.useState(false);
  const [coachRatingError, setCoachRatingError] = React.useState<string | null>(null);
  const [coachRating, setCoachRating] = React.useState<number>(0);

  const [coachNotes, setCoachNotes] = React.useState<any[]>([]);
  const [coachNotesLoading, setCoachNotesLoading] = React.useState(false);
  const [coachNotesError, setCoachNotesError] = React.useState<string | null>(null);
  const [newCoachNoteText, setNewCoachNoteText] = React.useState("");
  const [addingCoachNote, setAddingCoachNote] = React.useState(false);

  const [coachListsLoading, setCoachListsLoading] = React.useState(false);
  const [coachListsError, setCoachListsError] = React.useState<string | null>(null);
  const [coachLists, setCoachLists] = React.useState<any[]>([]);
  const [coachSelectedListId, setCoachSelectedListId] = React.useState<string>("");
  const [coachSelectedListName, setCoachSelectedListName] = React.useState<string>("");
  const [coachMemberIds, setCoachMemberIds] = React.useState<Set<string>>(new Set());
  const [coachNewListName, setCoachNewListName] = React.useState("");
  const [coachCreatingList, setCoachCreatingList] = React.useState(false);
  const [coachListSaving, setCoachListSaving] = React.useState(false);
  const [coachListActionError, setCoachListActionError] = React.useState<string | null>(null);

  const cardViewUrl = `/player/${encodeURIComponent(slug)}/card`;

    // Detect coach session (logged-in coaches only see the jacket tools)
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

  // Fetch once per slug/demo toggle
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setNotFound(false);

      try {
        const isLocalhost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

        const debugParam = searchParams.get("debug") === "1";

        const qsParts: string[] = [];
        if (demoParam) qsParts.push("demo=1");
        if (debugParam) qsParts.push("debug=1");
        if (debugParam || isLocalhost) qsParts.push("fresh=1");
        const qs = qsParts.length ? `?${qsParts.join("&")}` : "";

        const res = await fetch(`/api/public/player/${encodeURIComponent(slug)}${qs}`, {
          cache: "no-store",
        });

        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => ({} as any));
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load profile.");
        }

        if (!cancelled) {
          setData(json.data || null);

          if (debugParam) {
            console.log("PUBLIC API DEBUG:", json.data?.debug ?? null);
            console.log("PUBLIC API PLAN DEBUG:", json.data?.debug?.planDebug ?? null);
          }

          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load profile.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, demoParam, searchParams]);

  // Timed coach prompt after viewing the page
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Only show this when a coach has arrived via the teaser card/QR
    if (!fromTeaserCard) return;

    // Never show in demo mode
    if (demoParam) return;

    // Allow ?noprompt=1 to disable while debugging
    if (searchParams.get("noprompt") === "1") return;

    const timer = window.setTimeout(() => {
      setShowCoachPrompt(true);
    }, 20000); // ~20 seconds

    return () => window.clearTimeout(timer);
  }, [slug, fromTeaserCard, demoParam, searchParams]);

  // ---------- SAFETY FALLBACKS for hooks (must run before any early return) ----------
  const safeProfile: PublicProfile = (data?.profile ?? {}) as PublicProfile;
  const vsRaw = (safeProfile as any).videoSocial ?? (safeProfile as any).videos ?? {};
  const coreEmail = safeProfile.email ?? safeProfile.contact?.email ?? null;
  const corePhone = safeProfile.phone ?? safeProfile.contact?.phone ?? null;

  // Coach-only tools: safe to compute from safeProfile (before early returns)
  const playerProfileId = String((safeProfile as any)?.playerProfileId || "").trim() || null;

  console.log("PUBLIC PROFILE DEBUG", {
  dataPlanTier: data?.planTier,
  profilePlanTier: (safeProfile as any)?.planTier,
  activityStatus: (safeProfile as any)?.activityStatus,
  status: (safeProfile as any)?.status,
});

  // Load coach rating / notes / lists when coach viewer + playerProfileId present
  React.useEffect(() => {
    if (!isCoachViewer) return;
    if (!playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        // Rating
        setCoachRatingLoading(true);
        setCoachRatingError(null);

        const rr = await fetch(`/api/coach/player-rating?playerProfileId=${encodeURIComponent(playerProfileId)}`, {
          method: "GET",
          cache: "no-store",
        });
        const rj = await rr.json().catch(() => ({}));
        if (!cancelled) {
          const n = Number(rj?.data?.rating ?? 0);
          const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
          setCoachRating(safe);
        }
      } catch {
        if (!cancelled) setCoachRating(0);
      } finally {
        if (!cancelled) setCoachRatingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCoachViewer, playerProfileId]);

  React.useEffect(() => {
    if (!isCoachViewer) return;
    if (!playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        setCoachNotesLoading(true);
        setCoachNotesError(null);

        const res = await fetch(`/api/coach/notes?playerProfileId=${encodeURIComponent(playerProfileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setCoachNotesError(json?.error || `Failed to load coach notes (${res.status})`);
          setCoachNotes([]);
          return;
        }

        const arr = Array.isArray(json?.data?.notes) ? json.data.notes : [];
        const sorted = [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCoachNotes(sorted);
      } catch (e: any) {
        if (!cancelled) {
          setCoachNotesError(e?.message || "Failed to load coach notes.");
          setCoachNotes([]);
        }
      } finally {
        if (!cancelled) setCoachNotesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCoachViewer, playerProfileId]);

  React.useEffect(() => {
    if (!isCoachViewer) return;

    let cancelled = false;

    (async () => {
      try {
        setCoachListsLoading(true);
        setCoachListsError(null);

        const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setCoachListsError(json?.error || `Failed to load lists (${res.status})`);
          setCoachLists([]);
          setCoachSelectedListId("");
          setCoachSelectedListName("");
          setCoachMemberIds(new Set());
          return;
        }

        const incoming = Array.isArray(json?.data?.lists) ? json.data.lists : [];
        setCoachLists(incoming);

        // Start blank
        setCoachSelectedListId("");
        setCoachSelectedListName("");
        setCoachMemberIds(new Set());
      } catch (e: any) {
        if (!cancelled) {
          setCoachListsError(e?.message || "Failed to load lists.");
          setCoachLists([]);
        }
      } finally {
        if (!cancelled) setCoachListsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCoachViewer]);

    React.useEffect(() => {
    if (!isCoachViewer) return;
    loadCoachSelectedListDetail(coachSelectedListId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachSelectedListId, isCoachViewer]);

  // Optional localStorage bridge for governing IDs so the public header can show before DB save
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

  // Memoize API -> PublicMedia mapping so it’s stable across renders
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
            : {
                url: String(x?.url || x?.publicUrl || ""),
                title: x?.title ?? x?.name ?? null,
              }
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

    // Allow direct URLs to override handle-derived links
    md = {
      ...md,
      xUrl: (vsRaw as any).xUrl ?? md.xUrl ?? null,
      instagramUrl: (vsRaw as any).instagramUrl ?? md.instagramUrl ?? null,
      youtubeUrl:
        (vsRaw as any).youtubeUrl ?? (vsRaw as any).youtubeChannel ?? md.youtubeUrl ?? null,
    };

    return md;
  }, [vsRaw, coreEmail, corePhone]);

  // Primary hero from API (by id)
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

  // Merge localStorage (dev bridge) with API media
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

      const xUrlLS = s.social?.xHandle
        ? `https://twitter.com/${String(s.social.xHandle).replace(/^@+/, "")}`
        : null;
      const igUrlLS = s.social?.instagramHandle
        ? `https://instagram.com/${String(s.social.instagramHandle).replace(/^@+/, "")}`
        : null;
      const ytUrlLS = s.social?.youtubeChannelUrl ? String(s.social.youtubeChannelUrl) : null;

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
        xUrl: mediaDataFromApi.xUrl || xUrlLS || null,
        instagramUrl: mediaDataFromApi.instagramUrl || igUrlLS || null,
        youtubeUrl: mediaDataFromApi.youtubeUrl || ytUrlLS || null,
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
            We couldn’t find a public profile for <strong>{slug}</strong>. If you just created or updated your
            profile, make sure you’ve saved it and that your public page is enabled.
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
const plan = normalizePlanTier(
  data.planTier ?? (profile as any)?.planTier ?? "Teams" // ✅ default to Teams
);
  const status = normalizeActivityStatus((profile as any)?.activityStatus ?? (profile as any)?.status ?? null);

  const corePrivacy = {
    emailPrivate: Boolean((profile as any)?.corePrivacy?.emailPrivate ?? (profile as any)?.emailPrivate),
    phonePrivate: Boolean((profile as any)?.corePrivacy?.phonePrivate ?? (profile as any)?.phonePrivate),
    dobPrivate: Boolean((profile as any)?.corePrivacy?.dobPrivate ?? (profile as any)?.dobPrivate),
  };

  const ctx = { viewer: "PUBLIC" as const, plan, status, corePrivacy };

  // Show/hide sections (PUBLIC surface)
  // We show Videos + References if there is actual content OR the viewer is a logged-in coach.
  // IMPORTANT: use mediaDataFromApi (the same normalization used by the UI) so legacy shapes still count.
  const rawVideoSocial: any = (profile as any)?.videoSocial ?? (profile as any)?.videos ?? {};

  const hasVideoSectionContent =
    (mediaDataFromApi?.uploadedVideos?.length ?? 0) > 0 ||
    (mediaDataFromApi?.externalVideos?.length ?? 0) > 0 ||
    Boolean(
      mediaDataFromApi?.xUrl ||
        mediaDataFromApi?.instagramUrl ||
        mediaDataFromApi?.youtubeUrl ||
        (mediaDataFromApi as any)?.chatUrl
    ) ||
    // fallback: if raw object has links but media mapper didn’t catch something
    Boolean(
      (Array.isArray(rawVideoSocial?.localVideos) && rawVideoSocial.localVideos.length) ||
        (Array.isArray(rawVideoSocial?.externalVideos) && rawVideoSocial.externalVideos.length) ||
        (Array.isArray(rawVideoSocial?.uploads) && rawVideoSocial.uploads.length) ||
        (Array.isArray(rawVideoSocial?.links) && rawVideoSocial.links.length)
    );

  const hasCoachesSectionContent =
    (Array.isArray((profile as any)?.coaches) && (profile as any).coaches.length > 0) ||
    (Array.isArray((profile as any)?.references) && (profile as any).references.length > 0) ||
    (Array.isArray((profile as any)?.coachesReferences) && (profile as any).coachesReferences.length > 0);

  // ✅ Always show these sections on the public profile page, even if empty.
  // (Only "Coach Notes" + coach jacket remain coach-only.)
  const showVideoSocial = true;
  const showCoachesRefs = true;

  // Chat remains gated
  const showChat = canViewSection(ctx, "CHAT");

  // Core contact privacy (PUBLIC surface)
  const showContactEmail = canViewCoreField(ctx, "email");
  const showContactPhone = canViewCoreField(ctx, "phone");

  // --- Dev overrides so we can see pills immediately ---
  const qsNcaa = searchParams.get("ncaa")?.trim() || null;
  const qsNaia = searchParams.get("naia")?.trim() || null;
  void qsNcaa;
  void qsNaia;

  const profileForHeader: PublicProfile = {
    ...profile,
    ncaaId: (idsFromLS?.ncaaId ?? (profile as any).ncaaId ?? null) as any,
    naiaEcid: (idsFromLS?.naiaEcid ?? (profile as any).naiaEcid ?? null) as any,
  };

  {showDebug && (
  <section style={card}>
    <h2 style={h2}>Visibility (debug)</h2>
    <pre style={pre}>
      {JSON.stringify(
        {
          plan,
          status,
          corePrivacy,
          showVideoSocial,
          showCoachesRefs,
          showChat,
        },
        null,
        2
      )}
    </pre>
  </section>
)}

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
    city: ac.city ?? ac.hsCity ?? null,
    state: ac.state ?? ac.hsState ?? null,
    areasOfStudy: Array.isArray(ac.areasOfStudy)
      ? ac.areasOfStudy
      : String(
          ac.areasOfStudyInput ??
            ac.intendedMajors ??
            ac.academicMajors ??
            (profile as any).areasOfStudyInput ??
            (profile as any).areasOfStudy ??
            ""
        )
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
        typeof d === "string"
          ? { label: null, url: d }
          : {
              label: d?.label ?? d?.name ?? null,
              url: d?.url ?? "",
            }
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
    .filter(
      (t) =>
        !!(String(t.name || "").trim() || String(t.scheduleUrl || "").trim() || String(t.websiteUrl || "").trim())
    );

  const athleticsData: AthleticsData = {
    bio: athleticBio,
    eligibilityRegistered: eligibilityRegistered,
    primaryPos: derivedPositions.primary ?? null,
    secondaryPos: Array.isArray(derivedPositions.secondary) ? derivedPositions.secondary : [],
    pitcher: showPitcherHandPill ? hand : null,
    bats: profile.bats ?? null,
    throws: profile.throws ?? null,
    teams: athleticsTeams,
  };

  const normalizeHand = (val: any): string | undefined => {
    const v = String(val || "").toLowerCase();
    if (!v) return undefined;
    if (v.startsWith("r")) return "R";
    if (v.startsWith("l")) return "L";
    if (v.startsWith("s")) return "S";
    return undefined;
  };

  const batsLabel = normalizeHand(profile.bats);
  const throwsLabel = normalizeHand(profile.throws);
  void batsLabel;
  void throwsLabel;

  /** ---------- Stats mapping ---------- */
  const STATS_UPLOAD_BASE = "/uploads/stats";

  const SEASON_ORDER: Record<string, number> = { winter: 1, spring: 2, summer: 3, fall: 4 };

  const isUrlish = (u: any) =>
    (typeof u === "string" && /^https?:\/\//i.test(u)) || (typeof u === "string" && u.startsWith("/"));

  const takeUrl = (o: any): string | null =>
    typeof o === "string" ? o : o && typeof o === "object" ? o.publicUrl || o.url || o.href || null : null;

  const collectUrls = (val: any): string[] => {
    const out: string[] = [];
    const collect = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) {
        v.forEach(collect);
        return;
      }
      const u = takeUrl(v);
      if (u && isUrlish(u)) out.push(String(u));
    };

    if (!val) return out;
    if (typeof val === "string") {
      if (isUrlish(val)) out.push(val);
      return out;
    }
    if (Array.isArray(val)) {
      val.forEach(collect);
      return out;
    }

    collect(val);
    const candidates = [
      (val as any).statsFileUrls,
      (val as any).statsUrl,
      (val as any).fileUrls,
      (val as any).files,
      (val as any).uploads,
      (val as any).links,
      (val as any).documents,
      (val as any).file,
      (val as any).doc,
      (val as any).stats && (val as any).stats.fileUrls,
      (val as any).stats && (val as any).stats.files,
      (val as any).stats && (val as any).stats.links,
    ];
    candidates.forEach(collect);
    return out;
  };

  const rawSeasons: any[] = Array.isArray(data.stats?.seasons)
    ? data.stats!.seasons
    : Array.isArray(profile.seasons)
    ? (profile.seasons as any[])
    : [];

  const getSeasonYear = (s: any): number => {
    if (s?.seasonYear != null) return Number(s.seasonYear);
    if (s?.year != null) return Number(s.year);
    if (typeof s?.season === "string") {
      const m = s.season.match(/(20\d{2})/);
      if (m) return Number(m[1]);
    }
    return 0;
  };

  const getSeasonTermRank = (s: any): number => {
    const key = String(s?.seasonTerm ?? s?.season ?? "").trim().toLowerCase().split(/\s+/)[0];
    return SEASON_ORDER[key] ?? 0;
  };

  const pickLatestSeasonForTeaser = (seasons: any[]): any | null => {
    let best: any | null = null;
    let bestYear = 0;
    let bestTermRank = 0;

    for (const s of seasons) {
      if (!s) continue;
      const year = getSeasonYear(s);
      const termRank = getSeasonTermRank(s);

      if (year > bestYear || (year === bestYear && termRank > bestTermRank)) {
        best = s;
        bestYear = year;
        bestTermRank = termRank;
      }
    }

    return best;
  };
  void pickLatestSeasonForTeaser;

  // Sorted seasons (by year + season term) just for completeness
  const sortedSeasonsForTeaser: any[] = [...rawSeasons].sort((a, b) => {
    const getYear = (s: any): number => {
      if (s?.seasonYear != null) return Number(s.seasonYear);
      if (s?.year != null) return Number(s.year);
      if (typeof s?.season === "string") {
        const m = s.season.match(/(20\d{2})/);
        if (m) return Number(m[1]);
      }
      return 0;
    };

    const normalizeTerm = (v: any): number => {
      const key = String(v ?? "").trim().toLowerCase().split(/\s+/)[0];
      return SEASON_ORDER[key] ?? 0;
    };

    const yearA = getYear(a);
    const yearB = getYear(b);

    if (yearA !== yearB) return yearA - yearB;

    const termA = normalizeTerm(a?.seasonTerm ?? a?.season);
    const termB = normalizeTerm(b?.seasonTerm ?? b?.season);

    if (termA !== termB) return termA - termB;

    return 0;
  });
  void sortedSeasonsForTeaser;

  const normalizeObj = (obj: any) => (obj && typeof obj === "object" ? obj : undefined);

  const pruneEmptyStatsMap = (obj: any): any | null => {
    if (!obj || typeof obj !== "object") return null;

    const values = Object.values(obj);
    if (values.length === 0) return null;

    const hasRealValue = values.some((v) => {
      if (v === null || v === undefined || v === "") return false;
      if (typeof v === "number" && Number.isNaN(v)) return false;
      return true;
    });

    return hasRealValue ? obj : null;
  };

  const statsTeams = rawSeasons.map((s: any) => {
    const urls = [
      ...(Array.isArray(s?.statsFileUrls) ? s.statsFileUrls.filter(isUrlish) : []),
      ...collectUrls(s),
      ...collectUrls(s?.stats),
    ];

    const names: string[] = Array.isArray(s?.statsFileNames) ? s.statsFileNames : [];
    if ((!urls || urls.length === 0) && names.length) {
      for (const name of names) {
        const safe = String(name || "").replace(/^\/+/, "");
        urls.push(`${STATS_UPLOAD_BASE}/${encodeURIComponent(slug)}/${encodeURIComponent(safe)}`);
      }
    }

    const seen = new Set<string>();
    const uniqueUrls = urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

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
      statsFileUrls: uniqueUrls,
      statsUrl: uniqueUrls.length ? uniqueUrls[0] : null,
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

  let series = seriesFromA && seriesFromA.length ? seriesFromA : [];
  if (!series.length) {
    const editorLike = Object.entries(m || {}).filter(([, v]) => Array.isArray(v));
    series = editorLike.map(([key, arr]) => ({
      key,
      label: key as string,
      unit: unitForMetricKey(key),
      points: (arr as any[])
        .filter((e) => e && (e.monthYear || e.date) && (typeof e.value === "number" || e.value != null))
        .map((e) => ({
          date: String(e.monthYear ?? e.date),
          value: Number(e.value),
          source: e.source ?? null,
        })),
      ageAverages: null,
    }));
  }

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

  const rawCoachesFromLS: any[] = (() => {
    try {
      const emailKey = (coreEmail ?? "anon").toLowerCase().trim();
      const tryKeys = [`scoutlineCoaches:${emailKey}`, `scoutlineCoaches:anon`];
      for (const k of tryKeys) {
        const raw = typeof window !== "undefined" ? localStorage.getItem(k) : null;
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.coaches) ? parsed.coaches : [];
        return arr.map((c: any) => ({
          firstName: c?.firstName ?? null,
          lastName: c?.lastName ?? null,
          teamOrOrg: c?.team ?? null,
          focus: c?.focus ?? null,
          email: c?.email ?? null,
          phone: c?.phone ?? null,
        }));
      }
    } catch {}
    return [];
  })();

  const mergedRawCoaches: any[] = (() => {
    const seen = new Set<string>();
    const out: any[] = [];
    const push = (it: any) => {
      if (!it) return;
      const fn = String(it?.firstName ?? it?.first ?? "").trim();
      const ln = String(it?.lastName ?? it?.last ?? "").trim();
      const em = String(it?.email ?? it?.coachEmail ?? "").trim().toLowerCase();
      const ph = String(it?.phone ?? it?.coachPhone ?? "").trim();
      const key = [fn, ln, em, ph].join("|");
      if (!seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    };
    rawCoachesFromApi.forEach(push);
    rawCoachesFromLS.forEach(push);
    return out;
  })();

  const coachesData: CoachesData = {
    coaches: mergedRawCoaches.map((c) => ({
      firstName: c?.firstName ?? c?.first ?? null,
      lastName: c?.lastName ?? c?.last ?? null,
      teamOrOrg: c?.teamOrOrg ?? c?.team ?? c?.organization ?? c?.org ?? null,
      email: c?.email ?? c?.coachEmail ?? null,
      phone: c?.phone ?? c?.coachPhone ?? null,
      focus: c?.focus ?? c?.coachingFocus ?? c?.role ?? c?.position ?? null,
    })),
  };

  /** ---------- Connect row (top floating block) ---------- */
  // Core contact (from Core tab)
  const connectEmail = coreEmail;
  const connectPhone = corePhone;

  // Social URLs from media data (but section may be hidden by plan/status)
  const xUrl = mediaDataView?.xUrl ?? null;
  const instagramUrl = mediaDataView?.instagramUrl ?? null;
  const youtubeUrl = mediaDataView?.youtubeUrl ?? null;

  // Underlying handles for tooltips
  const xHandleRaw = (vsRaw as any)?.social?.xHandle ?? null;
  const instagramHandleRaw = (vsRaw as any)?.social?.instagramHandle ?? null;
  const youtubeChannelRaw = (vsRaw as any)?.social?.youtubeChannelUrl ?? (vsRaw as any)?.youtubeChannel ?? null;

  // Chat link (if/when available)
  const connectChatUrl = (mediaDataView as any)?.chatUrl ?? (vsRaw as any)?.chatUrl ?? null;

  // Enforce privacy + section gating
  const hasPhone = showContactPhone && !!connectPhone;
  const hasEmail = showContactEmail && !!connectEmail;

  const hasX = showVideoSocial && !!xUrl;
  const hasInstagram = showVideoSocial && !!instagramUrl;
  const hasYouTube = showVideoSocial && !!youtubeUrl;

  const hasChat = showChat && !!connectChatUrl;

  const phoneTitle = hasPhone ? String(connectPhone) : showContactPhone ? "Phone not provided" : "Phone is private";
  const emailTitle = hasEmail ? String(connectEmail) : showContactEmail ? "Email not provided" : "Email is private";

  const xTitle = hasX ? String(xHandleRaw || xUrl) : showVideoSocial ? "X handle / URL not provided" : "Not available";
  const instagramTitle = hasInstagram
    ? String(instagramHandleRaw || instagramUrl)
    : showVideoSocial
    ? "Instagram handle / URL not provided"
    : "Not available";
  const youtubeTitle = hasYouTube
    ? String(youtubeUrl || youtubeChannelRaw || "")
    : showVideoSocial
    ? "YouTube URL not provided"
    : "Not available";

  const chatTitle = hasChat ? String(connectChatUrl) : showChat ? "Chat feature coming soon" : "Not available";

// Jump-to list should not include hidden sections (so anchors don’t point to nothing)
const jumpSections = (() => {
  // ✅ Always include core sections (including Videos + References).
  const base = [...PUBLIC_SECTIONS];

  // ✅ Coach-only: add quick jump back to the coach tools block
  if (isCoachViewer) {
    base.push({ id: "coach-notes", label: "Coach Notes" });
  }

  return base;
})();

  async function saveCoachRating(nextRating: number) {
    if (!playerProfileId) return;

    const clamped = Math.max(0, Math.min(5, Math.round(nextRating)));
    const next = coachRating === clamped ? 0 : clamped;

    const prev = coachRating;
    setCoachRating(next);
    setCoachRatingSaving(true);
    setCoachRatingError(null);

    try {
      const res = await fetch("/api/coach/player-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId, rating: next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to save rating (${res.status})`);

      const n = Number(json?.data?.rating ?? next);
      const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : next;
      setCoachRating(safe);
    } catch (e: any) {
      setCoachRating(prev);
      setCoachRatingError(e?.message || "Failed to save rating.");
    } finally {
      setCoachRatingSaving(false);
    }
  }

  async function addCoachNote() {
    if (!playerProfileId) return;
    if (!newCoachNoteText.trim()) return;

    try {
      setAddingCoachNote(true);
      setCoachNotesError(null);

      const res = await fetch("/api/coach/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId, noteText: newCoachNoteText.trim(), sharedWithOrg: true }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false || !json?.data?.note) {
        throw new Error(json?.error || `Failed to save note (${res.status})`);
      }

      setCoachNotes((prev) => [json.data.note, ...prev]);
      setNewCoachNoteText("");
    } catch (e: any) {
      setCoachNotesError(e?.message || "Failed to save note.");
    } finally {
      setAddingCoachNote(false);
    }
  }

  async function loadCoachSelectedListDetail(listId: string) {
    if (!listId) {
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return;
    }

    setCoachListActionError(null);

    const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(listId)}`, { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setCoachListActionError(json?.error || `Failed to load list (${res.status})`);
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return;
    }

    setCoachSelectedListName(json?.data?.list?.name || "Selected List");
    const ids = new Set<string>(
      (Array.isArray(json?.data?.members) ? json.data.members : [])
        .map((m: any) => String(m?.playerProfileId || "").trim())
        .filter(Boolean)
    );
    setCoachMemberIds(ids);
  }

  async function refreshCoachListsPreserveSelection() {
    const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) return;

    const incoming = Array.isArray(json?.data?.lists) ? json.data.lists : [];
    setCoachLists(incoming);

    setCoachSelectedListId((prev) => {
      if (prev && incoming.some((l: any) => l.id === prev)) return prev;
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return "";
    });
  }

  async function createCoachRecruitingList() {
    const name = coachNewListName.trim();
    if (!name) return;

    try {
      setCoachCreatingList(true);
      setCoachListActionError(null);

      const res = await fetch("/api/coach/recruiting-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to create list (${res.status})`);

      const newId = String(json?.data?.list?.id || "").trim();
      if (!newId) throw new Error("List created but missing id.");

      await refreshCoachListsPreserveSelection();
      setCoachSelectedListId(newId);
      setCoachNewListName("");
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to create list.");
    } finally {
      setCoachCreatingList(false);
    }
  }

  async function addPlayerToCoachSelectedList() {
    if (!playerProfileId || !coachSelectedListId) return;

    try {
      setCoachListSaving(true);
      setCoachListActionError(null);

      const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to add (${res.status})`);

      setCoachMemberIds((prev) => {
        const next = new Set(prev);
        next.add(playerProfileId);
        return next;
      });

      await refreshCoachListsPreserveSelection();
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to add player to list.");
    } finally {
      setCoachListSaving(false);
    }
  }

  async function removePlayerFromCoachSelectedList() {
    if (!playerProfileId || !coachSelectedListId) return;

    try {
      setCoachListSaving(true);
      setCoachListActionError(null);

      const res = await fetch(
        `/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members/${encodeURIComponent(playerProfileId)}`,
        { method: "DELETE", cache: "no-store" }
      );

      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to remove (${res.status})`);

      setCoachMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(playerProfileId);
        return next;
      });

      await refreshCoachListsPreserveSelection();
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to remove player from list.");
    } finally {
      setCoachListSaving(false);
    }
  }

/** ---------- Render ---------- */
return (
  <main style={wrap}>
            {/* Coach-only tools (shown only when logged-in coach) */}
                <div
          id="coach-notes"
          style={{
            scrollMarginTop: SECTION_SCROLL_MARGIN,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={coachLabel}>Internal Program Rating</div>

            {coachRatingLoading ? (
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Loading…</div>
            ) : (
              <RatingPickerInline
                value={coachRating}
                disabled={coachRatingSaving}
                onChange={(n) => saveCoachRating(n)}
              />
            )}

            {coachRatingSaving ? (
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Saving…</div>
            ) : null}
          </div>
        </div>

        {coachRatingError ? (
          <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>
            {coachRatingError}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 14, marginTop: 12 }}>
          {/* Notes */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
              Coach Notes
            </div>

            <textarea
              value={newCoachNoteText}
              onChange={(e) => setNewCoachNoteText(e.target.value)}
              rows={3}
              placeholder="Add a note about this player (e.g. makeup, follow-up items)..."
              style={coachTextarea}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                type="button"
                onClick={addCoachNote}
                disabled={addingCoachNote || !newCoachNoteText.trim()}
                style={{ ...coachBtnGold, opacity: addingCoachNote || !newCoachNoteText.trim() ? 0.6 : 1 }}
              >
                {addingCoachNote ? "Saving…" : "Add Note"}
              </button>
            </div>

            {coachNotesLoading ? <div style={coachTinyMuted}>Loading notes…</div> : null}
            {coachNotesError ? <div style={coachTinyError}>{coachNotesError}</div> : null}

            {!coachNotesLoading && !coachNotesError && coachNotes.length === 0 ? (
              <div style={coachTinyMuted}>No notes yet.</div>
            ) : null}

            {!coachNotesLoading && !coachNotesError && coachNotes.length > 0 ? (
              <div style={{ display: "grid", gap: 10, maxHeight: 220, overflowY: "auto", paddingTop: 6 }}>
                {coachNotes.map((n: any) => (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#f8fafc",
                      padding: "10px 10px",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.35 }}>
                      {n.noteText}
                    </div>

                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>
                        By {(n?.coach?.name || (n?.coach?.email ? String(n.coach.email).split("@")[0] : "Coach"))}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Lists */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
              Recruiting Target Lists
            </div>

            {coachListsLoading ? <div style={coachTinyMuted}>Loading lists…</div> : null}
            {coachListsError ? <div style={coachTinyError}>{coachListsError}</div> : null}
            {coachListActionError ? <div style={coachTinyError}>{coachListActionError}</div> : null}

            <div style={{ display: "grid", gap: 10 }}>
              <div style={coachTinyMuted}>Create a list</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={coachNewListName}
                  onChange={(e) => setCoachNewListName(e.target.value)}
                  placeholder='e.g. "2028 Middle Infielders"'
                  style={{ ...coachInput, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={createCoachRecruitingList}
                  disabled={coachCreatingList || !coachNewListName.trim()}
                  style={{ ...coachBtnGold, opacity: coachCreatingList || !coachNewListName.trim() ? 0.6 : 1 }}
                >
                  {coachCreatingList ? "Creating…" : "Create"}
                </button>
              </div>

              <div style={{ height: 1, background: "#eef2f7" }} />

              <div style={coachTinyMuted}>Add to an existing list</div>

              <select
                value={coachSelectedListId}
                onChange={(e) => setCoachSelectedListId(e.target.value)}
                style={coachInput}
              >
                <option value="">— Select a list —</option>
                {coachLists.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.memberCount})
                  </option>
                ))}
              </select>

              {!coachSelectedListId ? (
                <div style={coachTinyMuted}>Select a list to add this player.</div>
              ) : coachMemberIds.has(playerProfileId) ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={coachTinyMuted}>
                    In <b>{coachSelectedListName || "this list"}</b>
                  </div>
                  <button
                    type="button"
                    onClick={removePlayerFromCoachSelectedList}
                    disabled={coachListSaving}
                    style={{ ...coachBtnDangerOutline, opacity: coachListSaving ? 0.7 : 1 }}
                  >
                    {coachListSaving ? "Updating…" : "Remove"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addPlayerToCoachSelectedList}
                  disabled={coachListSaving}
                  style={{ ...coachBtnGold, opacity: coachListSaving ? 0.7 : 1 }}
                >
                  {coachListSaving ? "Adding…" : "Add Player to List"}
                </button>
              )}
            </div>
          </div>
        </div>

    {/* ===================== Sticky floating block: Jump To + Connect ===================== */}
    <section
      style={{
        position: "sticky",
        top: 110, // keep tight to site header
        zIndex: 20,
        marginTop: isCoachViewer ? 16 : 0, // only add gap when coach jacket exists
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
        {/* Row A: Jump To (left) + View Player Card (right) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <JumpToSectionNav sections={jumpSections as any} />

          <a href={cardViewUrl} style={{ ...primaryButton, whiteSpace: "nowrap" }}>
            View Player Card
          </a>
        </div>

        {/* Row B: Connect (left) + Back to Recruiting Board (right) */}
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

            {/* Call */}
            <a
              href={hasPhone ? `tel:${connectPhone}` : undefined}
              title={phoneTitle}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              style={{
                ...connectIconLink,
                opacity: hasPhone ? 1 : 0.35,
                pointerEvents: hasPhone ? "auto" : "none",
                cursor: hasPhone ? "pointer" : "default",
              }}
            >
              <img src="/icons/call.webp" alt="Call" width={18} height={18} style={{ display: "block" }} />
              <span style={srOnly}>Call</span>
            </a>

            {/* Email */}
            <a
              href={hasEmail ? `mailto:${connectEmail}` : undefined}
              title={emailTitle}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              style={{
                ...connectIconLink,
                opacity: hasEmail ? 1 : 0.35,
                pointerEvents: hasEmail ? "auto" : "none",
                cursor: hasEmail ? "pointer" : "default",
              }}
            >
              <img src="/icons/email.webp" alt="Email" width={18} height={18} style={{ display: "block" }} />
              <span style={srOnly}>Email</span>
            </a>

            {/* X */}
            <a
              href={hasX ? xUrl : undefined}
              title={xTitle}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              style={{
                ...connectIconLink,
                opacity: hasX ? 1 : 0.35,
                pointerEvents: hasX ? "auto" : "none",
                cursor: hasX ? "pointer" : "default",
              }}
            >
              <img src="/icons/x.webp" alt="X" width={18} height={18} style={{ display: "block" }} />
              <span style={srOnly}>X</span>
            </a>

            {/* Instagram */}
            <a
              href={hasInstagram ? instagramUrl : undefined}
              title={instagramTitle}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              style={{
                ...connectIconLink,
                opacity: hasInstagram ? 1 : 0.35,
                pointerEvents: hasInstagram ? "auto" : "none",
                cursor: hasInstagram ? "pointer" : "default",
              }}
            >
              <img src="/icons/instagram.webp" alt="Instagram" width={18} height={18} style={{ display: "block" }} />
              <span style={srOnly}>Instagram</span>
            </a>

            {/* YouTube */}
            <a
              href={hasYouTube ? youtubeUrl : undefined}
              title={youtubeTitle}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, connectIconHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, { transform: "none", boxShadow: "none" })}
              style={{
                ...connectIconLink,
                opacity: hasYouTube ? 1 : 0.35,
                pointerEvents: hasYouTube ? "auto" : "none",
                cursor: hasYouTube ? "pointer" : "default",
              }}
            >
              <img src="/icons/youtube.webp" alt="YouTube" width={48} height={48} style={{ display: "block" }} />
              <span style={srOnly}>YouTube</span>
            </a>

            {/* ScoutLine Chat (coming soon) */}
            <span
              title="ScoutLine Chat (coming soon)"
              onMouseEnter={(e) => {
                Object.assign((e.currentTarget as any).style, connectIconHover);
                (e.currentTarget as any).style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                Object.assign((e.currentTarget as any).style, { transform: "none", boxShadow: "none" });
                (e.currentTarget as any).style.opacity = "0.6";
              }}
              style={{
                ...connectIconLink,
                opacity: 0.6,
                cursor: "not-allowed",
              }}
            >
              <img src="/icons/chat.png" alt="" aria-hidden="true" width={48} height={48} style={{ display: "block" }} />
              <span style={srOnly}>ScoutLine Chat (coming soon)</span>
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
            // keeps spacing stable when not showing the button
            <div style={{ width: 1, height: 1 }} />
          )}
        </div>
      </div>
    </section>
{/* ===================== /Sticky floating block ===================== */}

    {/* Core / Header */}
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

      {/* Academics */}
      <SectionWrapper id="academics">
        <PublicAcademics academics={academicsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      {/* Athletics */}
      <SectionWrapper id="athletics">
        <PublicAthletics athletics={athleticsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      {/* Metrics */}
      <SectionWrapper id="metrics">
        <PublicMetrics metrics={metricsData} cardStyle={card} h2Style={h2} pillStyle={pillStyle} />
      </SectionWrapper>

      {/* Stats */}
      <SectionWrapper id="stats">
        <PublicStats
          stats={{ teams: statsTeams, seasons: rawSeasons }}
          title="Stats"
          cardStyle={card}
          h2Style={h2}
          pillStyle={pillStyle}
        />
      </SectionWrapper>

      {/* Videos (plan/status gated) */}
      {showVideoSocial && (
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
      )}

      {/* Coaches / References (plan/status gated) */}
      {showCoachesRefs && (
        <SectionWrapper id="coaches">
          <PublicCoaches data={coachesData} cardStyle={card} h2Style={h2} />
        </SectionWrapper>
      )}

      {/* Bottom "View Player Card" button section */}

      {/* ---- EXISTING DEBUG SECTIONS ---- */}
      {showDebug && (
        <section style={card}>
          <h2 style={h2}>Governing IDs — deep trace</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>NCAA ID (profile):</strong> {String(profile.ncaaId ?? "—")}
            </div>
            <div>
              <strong>NAIA ECID (profile):</strong> {String(profile.naiaEcid ?? "—")}
            </div>
            <div>
              <strong>NCAA ID (profile.athletics):</strong> {String((profile as any)?.athletics?.ncaaId ?? "—")}
            </div>
            <div>
              <strong>NAIA ECID (profile.athletics):</strong> {String((profile as any)?.athletics?.naiaEcid ?? "—")}
            </div>
          </div>

          {data.debug?.idsTrace && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: "8px 0", fontSize: 16, fontWeight: 800 }}>Resolver Trace</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>NCAA paths checked:</div>
                  <pre style={pre}>{JSON.stringify(data.debug.idsTrace.ncaa, null, 2)}</pre>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 4 }}>NAIA paths checked:</div>
                  <pre style={pre}>{JSON.stringify(data.debug.idsTrace.naia, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {data.debug?.rawNamespaces && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: "8px 0", fontSize: 16, fontWeight: 800 }}>Atomic Namespaces (keys present)</h3>
              <pre style={pre}>{JSON.stringify(data.debug.rawNamespaces, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {showDebug && data.metrics && (
        <section style={card}>
          <h2 style={h2}>Metrics (raw)</h2>
          <pre style={pre}>{JSON.stringify(data.metrics, null, 2)}</pre>
        </section>
      )}

      {showDebug && data.stats && (
        <section style={card}>
          <h2 style={h2}>Stats (raw)</h2>
          <pre style={pre}>{JSON.stringify(data.stats, null, 2)}</pre>
        </section>
      )}

      {showDebug && (
        <section style={card}>
          <h2 style={h2}>Media (debug)</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>Primary URL:</strong> {String(primaryUrlView || "—")}
            </div>
            <div>
              <strong>Uploaded count:</strong> {mediaDataView?.uploadedVideos?.length ?? 0}
            </div>
            <div>
              <strong>External count:</strong> {mediaDataView?.externalVideos?.length ?? 0}
            </div>
            <div>
              <strong>X:</strong> {mediaDataView?.xUrl || "—"}
            </div>
            <div>
              <strong>Instagram:</strong> {mediaDataView?.instagramUrl || "—"}
            </div>
            <div>
              <strong>YouTube:</strong> {mediaDataView?.youtubeUrl || "—"}
            </div>
          </div>
          <pre style={pre}>
            {JSON.stringify(
              { vsRaw, mediaDataFromApi, mediaDataView, primaryUrlFromApi, primaryUrlView },
              null,
              2
            )}
          </pre>
        </section>
      )}

      {showCoachPrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
            }}
          >
            <h2 style={{ ...h2, marginBottom: 6 }}>Coaches: unlock full access</h2>
            <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
              To continue viewing this player profile, coaches need to have an account. This provides additional access
              to in-depth stats, specific metrics and player development, videos and social media, and player email and
              phone contact. The player profile can also be saved and shared with other coaches in your organization.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <a
                href="/login"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #0ea5e9",
                  background: "#e0f2fe",
                  color: "#0f172a",
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Log In
              </a>
              <a
                href="/signup/coach"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #eab308",
                  background: "#fef3c7",
                  color: "#78350f",
                  fontSize: 12,
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Create Free Coach Account
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** ---------- Helpers ---------- */
function unitForMetricKey(key: string | undefined | null) {
  const k = String(key || "").toLowerCase();
  if (k.includes("velo")) return "mph";
  if (k.includes("throw")) return "mph";
  if (k.includes("bench") || k.includes("squat")) return "lbs";
  if (k.includes("pop") || k.includes("sixty") || k.includes("home")) return "seconds";
  return null;
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
void numOrNull;

function normalizeBatThrowDisplay(v: any): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.startsWith("r")) return "R";
  if (s.startsWith("l")) return "L";
  if (s.startsWith("s")) return "S";
  return null;
}
void normalizeBatThrowDisplay;

function formatHeightLabel(ft: number | null, inches: number | null): string | null {
  if (ft == null && inches == null) return null;
  const ftPart = ft != null ? String(ft) : "";
  const inPart = inches != null ? String(inches) : "";
  if (!ftPart && !inPart) return null;
  if (!inPart) return `${ftPart}'`;
  return `${ftPart}'${inPart}"`;
}
void formatHeightLabel;

function IconWrap(props: { title: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={props.title}
    >
      {props.children}
    </span>
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
  gap: 20, // 👈 increased spacing between icons
  marginTop: 4,
};

const connectLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.06,
};

const connectPill: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 10px",
  borderRadius: 9999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  whiteSpace: "nowrap",
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

function RatingPickerInline(props: { value: number; disabled?: boolean; onChange: (n: number) => void }) {
  const v = Math.max(0, Math.min(5, Math.round(props.value || 0)));

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = i < v;

        return (
          <button
            key={n}
            type="button"
            disabled={props.disabled}
            onClick={() => props.onChange(n)}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(14,165,233,0.35)",
              background: "#fff",
              padding: 4,
              opacity: props.disabled ? 0.6 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
            }}
            title={`Set rating to ${n}/5`}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block" }}>
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill={filled ? "#caa042" : "#ffffff"}
                stroke="#0ea5e9"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}

      <button
        type="button"
        disabled={props.disabled}
        onClick={() => props.onChange(0)}
        style={{
          marginLeft: 6,
          border: "none",
          background: "transparent",
          color: "#0ea5e9",
          fontWeight: 900,
          fontSize: 12,
          opacity: props.disabled ? 0.6 : 1,
          cursor: props.disabled ? "not-allowed" : "pointer",
        }}
        title="Clear rating"
      >
        Clear
      </button>
    </div>
  );
}

const coachBackBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 900,
  textDecoration: "none",
};

const coachLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const coachInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
};

const coachTextarea: React.CSSProperties = {
  ...coachInput,
  minHeight: 90,
  resize: "none",
  lineHeight: 1.35,
};

const coachBtnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  cursor: "pointer",
};

const coachBtnDangerOutline: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 900,
  cursor: "pointer",
};

const coachTinyMuted: React.CSSProperties = { fontSize: 11, color: "#64748b", fontWeight: 700 };
const coachTinyError: React.CSSProperties = { fontSize: 11, color: "#b91c1c", fontWeight: 900, marginTop: 6 };

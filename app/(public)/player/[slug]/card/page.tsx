// app/(public)/player/[slug]/card/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import CoachTeaserCard from "@/app/components/public/CoachTeaserCard";

function hasMeaningfulStats(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;

  for (const v of Object.values(obj)) {
    if (v === null || v === undefined) continue;

    if (typeof v === "number") {
      if (Number.isFinite(v)) return true;
      continue;
    }

    if (typeof v === "string") {
      if (v.trim() !== "") return true;
      continue;
    }

    if (typeof v === "object") {
      if (Array.isArray(v)) {
        if (v.some((x) => x != null && String(x).trim() !== "")) return true;
      } else {
        if (hasMeaningfulStats(v)) return true;
      }
    }
  }

  return false;
}

type PublicProfile = {
  firstName?: string | null;
  lastName?: string | null;
  primaryPhotoUrl?: string | null;

  gradYear?: number | null;
  gpa?: number | string | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;
  dob?: string | null;

  email?: string | null;
  phone?: string | null;
  contact?: { email?: string | null; phone?: string | null } | null;

  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  pitcherHand?: "RHP" | "LHP" | null;
  bats?: string | null;
  throws?: string | null;

  positions?: { primary?: string | null; secondary?: string[] | null } | null;

  academics?: any;
  athletics?: any;

  seasons?: any[] | null;

  // for hometown
  hometown?: string | null;
  homeTown?: string | null;
  state?: string | null;
  homeState?: string | null;
};

type PublicPayload = {
  profile?: PublicProfile | null;
  stats?: {
    seasons?: any[];
  } | null;
};

export default function PlayerCardPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const fromTeaserCard = searchParams.get("from") === "teaser";

  const [data, setData] = React.useState<PublicPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setNotFound(false);

      try {
        const res = await fetch(`/api/public/player/${encodeURIComponent(slug)}`, { cache: "no-store" });

        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load player card.");
        }

        if (!cancelled) {
          setData(json.data || null);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load player card.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handlePrint = React.useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  // ✅ Share should share the CARD link (this page), ideally with from=teaser
  const getCardShareUrl = React.useCallback(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);

    // If we arrived from teaser, guarantee the param exists in what we share/copy
    if (fromTeaserCard) u.searchParams.set("from", "teaser");

    return u.toString();
  }, [fromTeaserCard]);

  const handleSend = React.useCallback(async () => {
    if (typeof window === "undefined") return;

    const url = getCardShareUrl();

    // 1) Web Share API (mobile friendly)
    try {
      const navAny = navigator as any;
      if (navAny.share) {
        await navAny.share({
          title: "ScoutLine Player Card",
          text: "ScoutLine Player Card",
          url,
        });
        return;
      }
    } catch {
      // fall through
    }

    // 2) Copy to clipboard / prompt fallback
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied. Paste into email or a DM.");
      } else {
        window.prompt("Copy this link and paste it into an email or social message:", url);
      }
    } catch {
      window.prompt("Copy this link and paste it into an email or social message:", url);
    }
  }, [getCardShareUrl]);

  // ---------------- Early returns (no hooks below this line) ----------------
  if (loading) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player Card</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player Card</h1>
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
        <h1 style={h1}>Player Card</h1>
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
        <h1 style={h1}>Player Card</h1>
        <section style={card}>
          <p>Nothing to show yet.</p>
        </section>
      </main>
    );
  }

  const profile = data.profile as PublicProfile;

  /** ---------- Academics for card ---------- */
  const ac = (profile as any).academics ?? {};
  const gradYear = profile.gradYear ?? ac.gradYear ?? null;
  const gpaValue = profile.gpa ?? ac.gpa ?? null;
  const gpa = gpaValue != null && gpaValue !== "" ? String(gpaValue) : null;
  const highSchoolName = ac.highSchool ?? ac.highSchoolName ?? null;

  /** ---------- Positions & bats/throws ---------- */
  const derivedPositions =
    profile.positions ?? {
      primary: profile.primaryPos ?? null,
      secondary: profile.secondaryPos ? [profile.secondaryPos] : [],
    };

  const isPitcherSelected =
    String(profile.isPitcher ?? "").toLowerCase() === "yes" ||
    derivedPositions.primary === "P" ||
    (Array.isArray(derivedPositions.secondary) && derivedPositions.secondary.includes("P"));

  const isCatcherSelected =
    derivedPositions.primary === "C" ||
    (Array.isArray(derivedPositions.secondary) && derivedPositions.secondary.includes("C"));

  const hand = profile.pitcherHand === "RHP" || profile.pitcherHand === "LHP" ? profile.pitcherHand : null;
  const showPitcherHandPill = isPitcherSelected && !!hand;

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

  const positionsForCard = {
    primary: derivedPositions.primary ?? profile.primaryPos ?? "",
    secondary: (Array.isArray(derivedPositions.secondary) && derivedPositions.secondary[0]) || profile.secondaryPos || null,
    pitcherHand: showPitcherHandPill ? (hand as "RHP" | "LHP" | null) : null,
  };

  /** ---------- Hometown ---------- */
  const hometownCityForCard = (profile as any).hometown ?? (profile as any).homeTown ?? null;
  const hometownStateForCard = (profile as any).state ?? (profile as any).homeState ?? null;

  /** ---------- Stats / single-season blocks for card ---------- */
  const SEASON_ORDER: Record<string, number> = { winter: 1, spring: 2, summer: 3, fall: 4 };

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

  const latestSeasonRaw = pickLatestSeasonForTeaser(rawSeasons);

  const latestHitting = latestSeasonRaw?.hitting ?? latestSeasonRaw?.stats?.hitting ?? null;
  const latestPitching = latestSeasonRaw?.pitching ?? latestSeasonRaw?.stats?.pitching ?? null;
  const latestFielding = latestSeasonRaw?.fielding ?? latestSeasonRaw?.stats?.fielding ?? null;
  const latestCatching = latestSeasonRaw?.catching ?? latestSeasonRaw?.stats?.catching ?? null;

  const teaserHitting =
    latestHitting && Object.keys(latestHitting).length
      ? {
          ab: numOrNull(latestHitting.ab ?? latestHitting.AB),
          r: numOrNull(latestHitting.r ?? latestHitting.R),
          h: numOrNull(latestHitting.h ?? latestHitting.H),
          rbi: numOrNull(latestHitting.rbi ?? latestHitting.RBI),
          avg: numOrNull(latestHitting.avg ?? latestHitting.AVG),
          obp: numOrNull(latestHitting.obp ?? latestHitting.OBP),
          slg: numOrNull(latestHitting.slg ?? latestHitting.SLG),
        }
      : null;

  const teaserPitching =
    isPitcherSelected && hasMeaningfulStats(latestPitching)
      ? {
          ip: numOrNull(latestPitching.ip ?? latestPitching.IP),
          bf: numOrNull(latestPitching.bf ?? latestPitching.BF),
          h: numOrNull(latestPitching.h ?? latestPitching.H),
          er: numOrNull(latestPitching.er ?? latestPitching.ER),
          bb: numOrNull(latestPitching.bb ?? latestPitching.BB),
          so: numOrNull(latestPitching.so ?? latestPitching.SO),
          era: numOrNull(latestPitching.era ?? latestPitching.ERA),
        }
      : null;

  const teaserFielding =
    latestFielding && Object.keys(latestFielding).length
      ? {
          a: numOrNull(latestFielding.a ?? latestFielding.A),
          po: numOrNull(latestFielding.po ?? latestFielding.PO),
          e: numOrNull(latestFielding.e ?? latestFielding.E),
          tc: numOrNull(latestFielding.tc ?? latestFielding.TC),
          fpct: numOrNull(latestFielding.fpct ?? latestFielding.FPCT),
        }
      : null;

  const teaserCatching =
    isCatcherSelected && hasMeaningfulStats(latestCatching)
      ? {
          inn: numOrNull(latestCatching.inn ?? latestCatching.INN),
          sb: numOrNull(latestCatching.sb ?? latestCatching.SB ?? latestCatching.sba ?? latestCatching.SBA),
          cs: numOrNull(latestCatching.cs ?? latestCatching.CS),
          pb: numOrNull(latestCatching.pb ?? latestCatching.PB),
        }
      : null;

  const seasonTermForCard = latestSeasonRaw
    ? String(latestSeasonRaw.seasonTerm ?? latestSeasonRaw.season ?? "").trim().split(/\s+/)[0] || null
    : null;

  const seasonYearForCard =
    latestSeasonRaw
      ? Number(latestSeasonRaw.seasonYear ?? latestSeasonRaw.year ?? getSeasonYear(latestSeasonRaw)) || null
      : null;

  const seasonLabelForCard =
    seasonTermForCard && seasonYearForCard
      ? `${seasonTermForCard} ${seasonYearForCard}`
      : seasonTermForCard
      ? seasonTermForCard
      : seasonYearForCard
      ? String(seasonYearForCard)
      : null;

  const teamNameForCard = latestSeasonRaw
    ? String(latestSeasonRaw.team ?? latestSeasonRaw.teamName ?? latestSeasonRaw.name ?? "").trim() || null
    : null;

  /** ---------- Identity bits for card ---------- */
  const fullNameForCard = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Unnamed Player";

  const heightForCard =
    profile.heightFt != null && profile.heightIn != null ? `${profile.heightFt}'${profile.heightIn}"` : null;

  const weightForCard = profile.weightLb != null ? `${profile.weightLb} lb` : null;

  const academicBio: string | null = ac.bio ?? ac.academicBio ?? null;
  const athleticBio: string | null = (profile as any).athletics?.athleticBio ?? (profile as any).athletics?.playerBio ?? null;

  /** ---------- URLs ---------- */
  const fullProfileUrl = `/player/${encodeURIComponent(slug)}`;

  // ✅ QR should send coaches to FULL PROFILE (not card) with from=teaser
  const baseForQr =
    (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const profileUrlForQr = baseForQr
    ? `${baseForQr}/player/${encodeURIComponent(slug)}?from=teaser`
    : `/player/${encodeURIComponent(slug)}?from=teaser`;

  return (
    <main style={wrap}>
      {/* tiny toast */}
      {toast ? (
        <div style={toastStyle} role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <a href={fullProfileUrl} style={linkStyle}>
          ← Back to full profile
        </a>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={handleSend} style={primaryButton}>
            Share Player Card
          </button>
          <button type="button" onClick={handlePrint} style={secondaryButton}>
            Print Player Card
          </button>
        </div>
      </header>

      <section style={card} className="print-area">
        <CoachTeaserCard
          photoUrl={profile.primaryPhotoUrl || "/placeholder-player-photo.png"}
          fullName={fullNameForCard}
          gradYear={gradYear as number | null}
          positions={positionsForCard}
          height={heightForCard || undefined}
          weight={weightForCard || undefined}
          dob={profile.dob || undefined}
          gpa={gpa || undefined}
          bats={batsLabel}
          throws={throwsLabel}
          hometownCity={hometownCityForCard || undefined}
          hometownState={hometownStateForCard || undefined}
          hitting={teaserHitting as any}
          pitching={teaserPitching as any}
          fielding={teaserFielding as any}
          catching={teaserCatching as any}
          seasonLabel={seasonLabelForCard || undefined}
          teamName={teamNameForCard || undefined}
          academicBio={academicBio || undefined}
          athleticBio={athleticBio || undefined}
          highSchoolName={highSchoolName || undefined}
          profileUrl={profileUrlForQr}
        />
      </section>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 0; }
        }
      `}</style>
    </main>
  );
}

/** ---------- Helpers ---------- */
function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ---------- Styles ---------- */
const wrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 16px",
};

const h1: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 900,
  margin: "0 0 8px",
};

const card: React.CSSProperties = {
  marginTop: 8,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 8,
};

const h2: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  fontWeight: 900,
};

const primaryButton: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#111827",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
  textDecoration: "none",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 86,
  right: 16,
  zIndex: 50,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  fontWeight: 900,
  fontSize: 12,
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
};

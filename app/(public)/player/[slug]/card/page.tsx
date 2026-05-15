// app/(public)/player/[slug]/card/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import CoachTeaserCard from "@/app/components/public/CoachTeaserCard";
import PublicMedia, { MediaData } from "@/app/components/public/PublicMedia";
import { toPublicMedia } from "@/app/lib/publicMedia";

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
  metrics?: any;
};

import { useParams } from "next/navigation";

export default function PlayerCardPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const searchParams = useSearchParams();
  const fromTeaserCard = searchParams.get("from") === "teaser";

  const [data, setData] = React.useState<PublicPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<string | null>(null);
  const [shareMode, setShareMode] = React.useState<"intro" | "followup">("intro");
  const [viewerRole, setViewerRole] = React.useState<string | null>(null);

  const isParentViewer =
    String(viewerRole || "").trim().toUpperCase() === "PARENT";

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

    React.useEffect(() => {
    let cancelled = false;

    async function loadViewerRole() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (cancelled) return;

        const role = String(json?.user?.role || json?.role || "")
          .trim()
          .toUpperCase();

        setViewerRole(role || null);
      } catch {
        if (!cancelled) setViewerRole(null);
      }
    }

    loadViewerRole();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slug) {
        setLoading(false);
        setNotFound(false);
        setErr("Invalid player URL.");
        return;
      }

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

  const getCardShareUrl = React.useCallback(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    if (fromTeaserCard) u.searchParams.set("from", "teaser");
    return u.toString();
  }, [fromTeaserCard]);

    if (!slug) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Player Card</h1>
        <p>Invalid player URL.</p>
      </main>
    );
  }

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
    secondary:
      Array.isArray(derivedPositions.secondary) && derivedPositions.secondary.length > 0
        ? derivedPositions.secondary.join("/")
        : profile.secondaryPos || null,
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

  const baseForQr =
    (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const profileUrlForQr = baseForQr
    ? `${baseForQr}/player/${encodeURIComponent(slug)}?from=teaser`
    : `/player/${encodeURIComponent(slug)}?from=teaser`;

      /** ---------- Primary video for card-only section ---------- */
  const vsRaw = ((profile as any).videoSocial ?? (profile as any).videos ?? {}) as any;

  const mediaDataForCard: MediaData = toPublicMedia(vsRaw, {
    email: profile.email ?? profile.contact?.email ?? null,
    phone: profile.phone ?? profile.contact?.phone ?? null,
    chatUrl: vsRaw?.chatUrl ?? null,
  });

  const primaryUrlForCard: string | null = (() => {
    if (vsRaw?.primary && vsRaw?.primary?.id) {
      if (vsRaw.primary.kind === "local" && Array.isArray(vsRaw.localVideos)) {
        const match = vsRaw.localVideos.find(
          (lv: any) => String(lv?.id || "") === String(vsRaw.primary.id)
        );
        if (match?.publicUrl) return String(match.publicUrl);
      }

      if (vsRaw.primary.kind === "external" && Array.isArray(vsRaw.externalVideos)) {
        const match = vsRaw.externalVideos.find(
          (ev: any) => String(ev?.id || "") === String(vsRaw.primary.id)
        );
        if (match?.url) return String(match.url);
      }
    }

    return null;
  })();

  /** ---------- Recruit-share subject/body helpers ---------- */
  function getLatestMetric(metrics: any, key: string): number | null {
    if (!metrics) return null;

    const arr = metrics?.[key];
    if (!Array.isArray(arr) || !arr.length) return null;

    let latestValue: number | null = null;
    let latestTs = -Infinity;

    for (const m of arr) {
      if (!m) continue;

      const val = Number(m.value);
      if (!Number.isFinite(val)) continue;

      const rawDate = String(m.monthYear || m.date || "").trim();
      let ts = -Infinity;

      const mmYyyy = rawDate.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmYyyy) {
        const mm = Number(mmYyyy[1]);
        const yyyy = Number(mmYyyy[2]);
        ts = new Date(yyyy, mm - 1, 1).getTime();
      } else {
        const parsed = new Date(rawDate).getTime();
        ts = Number.isFinite(parsed) ? parsed : -Infinity;
      }

      if (ts > latestTs) {
        latestTs = ts;
        latestValue = val;
      }
    }

    return latestValue;
  }

  function buildRecruitMessage() {
    const name = fullNameForCard || "Player";
    const grad = gradYear ? `${gradYear}` : "";

    const rawPrimary = String(positionsForCard?.primary || "").trim();
    const rawSecondary = String(positionsForCard?.secondary || "").trim();

    const secondaryParts = rawSecondary
      ? rawSecondary.split("/").map((p) => p.trim()).filter(Boolean)
      : [];

    const isPitcherPos = (p: string) => ["P", "RHP", "LHP"].includes(p);

    const pitcherLabel =
      positionsForCard?.pitcherHand === "RHP" || positionsForCard?.pitcherHand === "LHP"
        ? positionsForCard.pitcherHand
        : rawPrimary === "RHP" || rawPrimary === "LHP"
        ? rawPrimary
        : secondaryParts.includes("RHP")
        ? "RHP"
        : secondaryParts.includes("LHP")
        ? "LHP"
        : rawPrimary === "P" || secondaryParts.includes("P")
        ? "P"
        : null;

    const fieldPositions = [
      rawPrimary && !isPitcherPos(rawPrimary) ? rawPrimary : null,
      ...secondaryParts.filter((p) => !isPitcherPos(p)),
    ].filter(Boolean) as string[];

    const posParts = [...fieldPositions];
    if (pitcherLabel) posParts.push(pitcherLabel);

    const posString = posParts.join("/").trim();

    const isPitcherOnly = !!pitcherLabel && fieldPositions.length === 0;
    const isTwoWay = !!pitcherLabel && fieldPositions.length > 0;

    const metrics = (data as any)?.metrics || null;

    const sixty = getLatestMetric(metrics, "sixtyYdDash");
    const ev = getLatestMetric(metrics, "exitVelo");
    const fb = getLatestMetric(metrics, "avgFbVelo");
    const ch = getLatestMetric(metrics, "avgChVelo");
    const br = getLatestMetric(metrics, "avgBbVelo");

    const gpaStr =
      gpa && Number.isFinite(Number(gpa)) ? `${Number(gpa).toFixed(2)} GPA` : null;

    const sixtyStr = sixty != null ? `${sixty.toFixed(2)} 60` : null;
    const evStr = ev != null ? `${Math.round(ev)} EV` : null;
    const fbStr = fb != null ? `${Math.round(fb)} FB` : null;
    const chStr = ch != null ? `${Math.round(ch)} CH` : null;
    const brStr = br != null ? `${Math.round(br)} BR` : null;

    const introSubject = [
      name,
      grad && posString ? `${grad} ${posString}` : grad || posString || null,
      gpaStr,
      sixtyStr,
      evStr,
      fbStr,
      chStr,
      brStr,
      "ScoutLine Profile",
    ]
      .filter(Boolean)
      .join(" | ");

    const followUpSubject = [
      "Updated ScoutLine Profile:",
      name,
      grad && posString ? `${grad} ${posString}` : grad || posString || null,
      "New Stats / Metrics / Video",
    ]
      .filter(Boolean)
      .join(" | ");

    let introBody = "";
    let followUpBody = "";

    if (fromTeaserCard) {
      introBody = `Coach,

I wanted to share one of our players with you:

${name}
${grad ? `Class of ${grad}` : ""}
${posString}

You can view his full ScoutLine player card here:
${getCardShareUrl()}

Would love your feedback.

Thanks,
`;

      followUpBody = `Coach,

I wanted to send along updated information for one of our players:

${name}
${grad ? `Class of ${grad}` : ""}
${posString}

We’ve recently added updated stats, metrics, and video here:
${getCardShareUrl()}

Would love your feedback.

Thanks,
`;
    } else {
      introBody = `Coach,

My name is ${name}, and I’m a ${grad} ${posString}.

I wanted to share my ScoutLine player card with you:
${getCardShareUrl()}

I’d really appreciate you taking a look. Looking forward to connecting.

Thank you,
${name}
`;

      followUpBody = `Coach,

I wanted to follow up and share updated information on my ScoutLine player card.

${name}
${grad ? `Class of ${grad}` : ""}
${posString}

I’ve recently added updated stats, metrics, and video here:
${getCardShareUrl()}

Thank you for your time and consideration.

${name}
`;
    }

    return {
      introSubject,
      followUpSubject,
      introBody,
      followUpBody,
    };
  }

  const metricsForCard = (data as any)?.metrics || null;

  const benchValue = getLatestMetric(metricsForCard, "benchPress");
  const squatValue = getLatestMetric(metricsForCard, "squat");
  const deadLiftValue = getLatestMetric(metricsForCard, "deadLift");

  const benchForCard = benchValue != null ? `${Math.round(benchValue)} lb` : undefined;
  const squatForCard = squatValue != null ? `${Math.round(squatValue)} lb` : undefined;
  const deadLiftForCard = deadLiftValue != null ? `${Math.round(deadLiftValue)} lb` : undefined;

  const handleSend = () => {
    if (typeof window === "undefined") return;

    const { introSubject, followUpSubject, introBody, followUpBody } = buildRecruitMessage();

    const subject = shareMode === "followup" ? followUpSubject : introSubject;
    const body = shareMode === "followup" ? followUpBody : introBody;

    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleOpenDraft = () => {
    if (typeof window === "undefined") return;

    const { introSubject, followUpSubject, introBody, followUpBody } = buildRecruitMessage();

    const subject = shareMode === "followup" ? followUpSubject : introSubject;
    const body = shareMode === "followup" ? followUpBody : introBody;

    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const handleCopySubjectOnly = async () => {
    if (typeof window === "undefined") return;

    const { introSubject, followUpSubject } = buildRecruitMessage();
    const subject = shareMode === "followup" ? followUpSubject : introSubject;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(subject);
        setToast(
          shareMode === "followup"
            ? "Follow-up subject copied."
            : "Intro subject copied."
        );
      } else {
        window.prompt("Copy this subject:", subject);
      }
    } catch {
      window.prompt("Copy this subject:", subject);
    }
  };

  const handleCopyFullEmail = async () => {
    if (typeof window === "undefined") return;

    const { introSubject, followUpSubject, introBody, followUpBody } = buildRecruitMessage();

    const subject = shareMode === "followup" ? followUpSubject : introSubject;
    const body = shareMode === "followup" ? followUpBody : introBody;
    const fullMessage = `Subject: ${subject}\n\n${body}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullMessage);
        setToast(
          shareMode === "followup"
            ? "Follow-up full email copied."
            : "Intro full email copied."
        );
      } else {
        window.prompt("Copy this email:", fullMessage);
      }
    } catch {
      window.prompt("Copy this email:", fullMessage);
    }
  };

  return (
    <main style={wrap}>
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

        {!isParentViewer ? (
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 8,
              justifyContent: "flex-end",
              alignItems: "center",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            <div style={modeToggleWrap}>
              <button
                type="button"
                onClick={() => setShareMode("intro")}
                style={{
                  ...modeToggleBtn,
                  minWidth: 120,
                  justifyContent: "center",
                  ...(shareMode === "intro" ? modeToggleBtnActive : {}),
                }}
              >
                Introduction
              </button>
              <button
                type="button"
                onClick={() => setShareMode("followup")}
                style={{
                  ...modeToggleBtn,
                  minWidth: 170,
                  justifyContent: "center",
                  ...(shareMode === "followup" ? modeToggleBtnActive : {}),
                }}
              >
                Follow Up / Updated
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              style={{ ...primaryButton, minWidth: 135, whiteSpace: "nowrap" }}
            >
              {shareMode === "followup" ? "Send Follow Up" : "Send Intro"}
            </button>

            <button type="button" onClick={handleOpenDraft} style={secondaryButton}>
              Open Email Draft
            </button>

            <button type="button" onClick={handleCopySubjectOnly} style={secondaryButton}>
              Copy Subject Only
            </button>

            <button type="button" onClick={handleCopyFullEmail} style={secondaryButton}>
              Copy Full Email
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{ ...secondaryButton, minWidth: 135, whiteSpace: "nowrap" }}
            >
              Print Player Card
            </button>
          </div>
        ) : null}
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
          bench={benchForCard}
          squat={squatForCard}
          deadLift={deadLiftForCard}
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

{primaryUrlForCard ? (
  <section style={card} className="no-print">
    <PublicMedia
      media={mediaDataForCard}
      title="Primary Video"
      primaryUrl={primaryUrlForCard}
      hidePrimaryInGrid={true}
      showOnlyPrimary={true}
      hideConnectRow={true}
      cardStyle={{ marginTop: 0 }}
      h2Style={h2}
    />
  </section>
) : null}

<style>{`
  @media print {
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
    .no-print, .no-print * { display: none !important; }
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

const modeToggleWrap: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  background: "#ffffff",
  padding: 3,
  gap: 4,
};

const modeToggleBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const modeToggleBtnActive: React.CSSProperties = {
  background: "#e0f2fe",
  color: "#0f172a",
};
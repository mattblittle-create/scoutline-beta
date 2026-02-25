"use client";

import React, { useRef, useState } from "react";

/** ---------- CHILD HANDLES (already exposed by your tabs) ---------- */
export type VideoSocialPayload = {
  externalVideos: { id: string; title?: string; url: string; source: "youtube"|"vimeo"|"mp4"|"gamechanger"|"unknown"; addedAt: number }[];
  localVideos: { id: string; title?: string; publicUrl: string; fileType: string; fileSize: number; addedAt: number }[];
  social: { xHandle?: string; instagramHandle?: string; youtubeChannelUrl?: string };
  primary: { kind: "local" | "external"; id: string } | null;
};

export type VideoSocialHandle = {
  /** Only includes local videos that have a publicUrl, external links, social, and primary */
  getPayload: () => VideoSocialPayload;
};

export type CoachRef = {
  id: string;
  name: string;
  role?: "Head Coach"|"Assistant Coach"|"Trainer"|"Reference"|"Other";
  organization?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type CoachesHandle = {
  /** Returns the list of coaches/references */
  getPayload: () => CoachRef[];
};

/** ---------- PARENT-HELD STATE TYPES (example; adapt to your shapes) ---------- */
type PrivacyFlags = {
  emailPrivate: boolean;
  phonePrivate: boolean;
  metricsPrivate?: boolean;
  statsPrivate?: boolean;
};

type Season = {
  year: number; // e.g., 2026
  level: "MS"|"HS"|"Travel"|"Showcase"|"Other";
  teamName?: string;
};

type MetricsBlock = {
  hitter?: { exitVeloMax?: number; batSpeedMax?: number };
  pitcher?: { fbVeloMax?: number; spinRateMax?: number };
  catcher?: { popTimeBest?: number; throwDownVeloMax?: number };
};

type StatsBlock = {
  seasonAverages?: { ab?: number; avg?: number; obp?: number; slg?: number; ops?: number };
  pitching?: { ip?: number; era?: number; k?: number; bb?: number; whip?: number };
};

/** ---------- FINAL ATOMIC PAYLOAD (parent sends this) ---------- */
type PlayerProfileAtomicPayload = {
  email: string;

  profile: {
    firstName: string;
    lastName: string;
    primaryPhotoUrl?: string | null;
    positions: { primary?: string; secondary?: string[] };
    athletics: { isCatcher?: boolean; isPitcher?: boolean };
    seasons: Season[];
    privacy: PrivacyFlags;

    // Align to DB Plan enum (REDSHIRT | WALK_ON | ALL_AMERICAN | TEAM)
    planTier?: "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN" | "TEAM";

    // 🔹 NEW: Committed block (checkbox + college only)
    committed?: {
      isCommitted: boolean;
      college?: string; // required if isCommitted = true (validated on save)
    };
  };

  metrics: MetricsBlock;
  stats:   StatsBlock;

  videoSocial: VideoSocialPayload;
  coaches: CoachRef[];

  updatedAt: number;
  schemaVersion: number;
};

/** ---------- EXAMPLE PARENT COMPONENT ---------- */
export default function ParentProfileEditor() {
  // Identity
  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName]   = useState<string>("");
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(null);

  // Positions / athletics
  const [positions, setPositions] = useState<{ primary?: string; secondary?: string[] }>({});
  const [athletics, setAthletics] = useState<{ isCatcher?: boolean; isPitcher?: boolean }>({});

  // Seasons / privacy / plan
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyFlags>({ emailPrivate: true, phonePrivate: true });
  const [planTier, setPlanTier] =
    useState<"REDSHIRT"|"WALK_ON"|"ALL_AMERICAN"|"TEAM">("REDSHIRT");

  // 🔹 NEW: Committed UI state
  const [committed, setCommitted] = useState<{ isCommitted: boolean; college?: string }>({
    isCommitted: false,
    college: "",
  });

  // Metrics / Stats
  const [metrics, setMetrics] = useState<MetricsBlock>({});
  const [stats, setStats]     = useState<StatsBlock>({});

  const showCatcherMetrics = !!athletics.isCatcher;
  const showPitcherMetrics = !!athletics.isPitcher;

  // Child tab refs
  const videoRef   = useRef<VideoSocialHandle>(null);
  const coachesRef = useRef<CoachesHandle>(null);

  // UX state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  /** Single place that builds the atomic payload */
  const buildAtomicPayload = (): PlayerProfileAtomicPayload => {
    const videoSocial = videoRef.current?.getPayload() ?? {
      externalVideos: [],
      localVideos: [],
      social: {},
      primary: null,
    };
    const coaches = coachesRef.current?.getPayload() ?? [];

    // Trim committed college when unchecked
    const committedBlock =
      committed.isCommitted
        ? { isCommitted: true, college: (committed.college || "").trim() || undefined }
        : { isCommitted: false };

    return {
      email,
      profile: {
        firstName,
        lastName,
        primaryPhotoUrl,
        positions,
        athletics,
        seasons,
        privacy,
        planTier,
        committed: committedBlock,
      },
      metrics: {
        ...metrics,
        catcher: showCatcherMetrics ? metrics.catcher : undefined,
        pitcher: showPitcherMetrics ? metrics.pitcher : undefined,
      },
      stats,
      videoSocial,
      coaches,
      updatedAt: Date.now(),
      schemaVersion: 2, // bump since we added profile.committed
    };
  };

  /** Save handler: call this from your Save Profile button */
  const onSave = async () => {
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);

    try {
      const payload = buildAtomicPayload();

      // Minimal guardrails
      if (!payload.email) throw new Error("Missing email.");
      if (!payload.profile.firstName || !payload.profile.lastName) {
        throw new Error("Please provide first and last name.");
      }
      // 🔹 NEW: If committed is checked, college is required
      if (payload.profile.committed?.isCommitted && !payload.profile.committed.college) {
        throw new Error("Please enter the committed college.");
      }

      const res = await fetch("/api/player/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Save failed (${res.status}).`);
      }

      setSaveMsg("Profile saved ✅");
    } catch (err: any) {
      setSaveErr(err?.message || "Something went wrong saving your profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginTop: 0 }}>Player Profile</h1>

      {/* ---------------- Basic Identity ---------------- */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Identity</h2>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            First name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      {/* ---------------- NEW: Committed ---------------- */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Committed</h2>
        <div style={rowStyle}>
          <label style={{ ...labelStyle, maxWidth: 220, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={committed.isCommitted}
              onChange={(e) => {
                const checked = e.target.checked;
                setCommitted((c) => ({
                  isCommitted: checked,
                  college: checked ? (c.college ?? "") : "",
                }));
              }}
            />
            <span>Committed</span>
          </label>

          <label style={{ ...labelStyle, flex: 1, opacity: committed.isCommitted ? 1 : 0.5 }}>
            College (required if committed)
            <input
              value={committed.college ?? ""}
              onChange={(e) =>
                setCommitted((c) => ({ ...c, college: e.target.value }))
              }
              disabled={!committed.isCommitted}
              placeholder="e.g., Clemson University"
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      {/* ---------------- Plan Tier ---------------- */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Plan</h2>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Tier
            <select
              value={planTier}
              onChange={(e) =>
                setPlanTier(e.target.value as "REDSHIRT"|"WALK_ON"|"ALL_AMERICAN"|"TEAM")
              }
              style={inputStyle}
            >
              <option value="REDSHIRT">Redshirt</option>
              <option value="WALK_ON">Walk-On</option>
              <option value="ALL_AMERICAN">All-American</option>
              <option value="TEAM">Team</option>
            </select>
          </label>
        </div>
      </section>

      {/* ---------------- Your other sections (positions/athletics/metrics/stats/etc.) ---------------- */}
      {/* <TabVideoSocial ref={videoRef} ... /> */}
      {/* <TabCoachesReferences ref={coachesRef} ... /> */}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            background: saving ? "#94a3b8" : "#0f766e",
            color: "white",
          }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>

        {saveMsg && (
          <span style={{ color: "#15803d", fontWeight: 700 }}>{saveMsg}</span>
        )}
        {saveErr && (
          <span style={{ color: "#b91c1c", fontWeight: 700 }}>{saveErr}</span>
        )}
      </div>
    </main>
  );
}

/** ---------------- Inline styles (keep simple) ---------------- */
const sectionStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  margin: "16px 0",
  background: "#fff",
};

const h2Style: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: "1.1rem",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 220,
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  outline: "none",
} as const;

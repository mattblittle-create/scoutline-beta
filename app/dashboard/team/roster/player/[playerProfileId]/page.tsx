// app/dashboard/team/roster/player/[playerProfileId]/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type TabKey = "core" | "academics" | "athletics" | "metrics" | "stats" | "video" | "coaches";

type MetricEntry = { monthYear: string; value: number; source?: string | null };

function isObj(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function safeStr(v: any) {
  return v == null ? "" : String(v);
}

function normMonthYear(v: any) {
  // expects MM/YYYY
  const s = String(v || "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const mm = String(Math.max(1, Math.min(12, Number(m[1])))).padStart(2, "0");
  return `${mm}/${m[2]}`;
}

function sortMonthAsc(a: string, b: string) {
  const [am, ay] = String(a).split("/").map(Number);
  const [bm, by] = String(b).split("/").map(Number);
  const ad = new Date(ay || 0, (am || 1) - 1, 1).getTime();
  const bd = new Date(by || 0, (bm || 1) - 1, 1).getTime();
  return ad - bd;
}

function metricLabel(k: string) {
  const map: Record<string, string> = {
    homeToFirst: "Home to 1st",
    sixtyYdDash: "60 yd dash",
    exitVelo: "Exit velo",
    rawThrowVelo: "Raw throw velo",
    infieldThrowVelo: "Infield throw velo",
    outfieldThrowVelo: "Outfield throw velo",
    catcherThrowVelo: "Catcher throw velo",
    avgFbVelo: "Avg FB velo",
    avgChVelo: "Avg CH velo",
    avgBbVelo: "Avg BB velo",
    popTime: "Pop time",
    benchPress: "Bench press",
    squat: "Squat",
  };
  return map[k] || k;
}

function unitForMetric(k: string) {
  const map: Record<string, string> = {
    homeToFirst: "sec",
    sixtyYdDash: "sec",
    popTime: "sec",
    exitVelo: "mph",
    rawThrowVelo: "mph",
    infieldThrowVelo: "mph",
    outfieldThrowVelo: "mph",
    catcherThrowVelo: "mph",
    avgFbVelo: "mph",
    avgChVelo: "mph",
    avgBbVelo: "mph",
    benchPress: "lbs",
    squat: "lbs",
  };
  return map[k] || "";
}

type TeamPlayerPayload = {
  ok: boolean;
  data?: {
    playerProfileId: string;
    email: string;
    slug?: string | null;
    photoUrl?: string | null;
    atomic: any; // PlayerProfile.data blob
  };
  error?: string;
};

type CoachRow = {
  firstName?: string | null;
  lastName?: string | null;
  teamOrOrg?: string | null;
  email?: string | null;
  phone?: string | null;
  focus?: string | null;
};

type VideoRow = { id?: string; title?: string | null; url?: string | null; source?: string | null };
type UploadRow = { id?: string; title?: string | null; publicUrl?: string | null };

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export default function TeamRosterPlayerEditPage({ params }: { params: { playerProfileId: string } }) {
  const playerProfileId = params.playerProfileId;

  const [tab, setTab] = React.useState<TabKey>("metrics");

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState<string>("");
  const [slug, setSlug] = React.useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [atomic, setAtomic] = React.useState<any>({});

  // save UX
  const [saving, setSaving] = React.useState(false);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  // stats JSON editor
  const [statsJsonDraft, setStatsJsonDraft] = React.useState<string>("");
  const [statsJsonErr, setStatsJsonErr] = React.useState<string | null>(null);

  // metric add form
  const [newMetricKey, setNewMetricKey] = React.useState<string>("exitVelo");
  const [newMetricMonth, setNewMetricMonth] = React.useState<string>("");
  const [newMetricValue, setNewMetricValue] = React.useState<string>("");
  const [newMetricSource, setNewMetricSource] = React.useState<string>("");

  // video/social
  const [xHandle, setXHandle] = React.useState("");
  const [igHandle, setIgHandle] = React.useState("");
  const [ytUrl, setYtUrl] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setSaveErr(null);
      setSaveMsg(null);

      try {
        const res = await fetch(`/api/team/player-profile?playerProfileId=${encodeURIComponent(playerProfileId)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as TeamPlayerPayload;

        if (cancelled) return;

        if (!res.ok || !json?.ok || !json.data) {
          setLoadError(json?.error || "Failed to load player profile.");
          setLoading(false);
          return;
        }

        setEmail(json.data.email || "");
        setSlug(json.data.slug ?? null);
        setPhotoUrl(json.data.photoUrl ?? null);
        const a = json.data.atomic || {};
        setAtomic(a);

        // prime stats JSON editor
        const seasons = Array.isArray(a?.statsSeasons) ? a.statsSeasons : [];
        setStatsJsonDraft(JSON.stringify(seasons, null, 2));
        setStatsJsonErr(null);

        // prime social editor
        const vs = isObj(a?.videoSocial) ? a.videoSocial : {};
        const social = (isObj(vs?.social) ? vs.social : isObj(a?.social) ? a.social : {}) as any;
        setXHandle(safeStr(social?.xHandle || ""));
        setIgHandle(safeStr(social?.instagramHandle || ""));
        setYtUrl(safeStr(social?.youtubeChannelUrl || social?.youtubeUrl || ""));

        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(e?.message || "Failed to load player profile.");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [playerProfileId]);

  const fullName =
    `${safeStr(atomic?.firstName).trim()} ${safeStr(atomic?.lastName).trim()}`.trim() || email || "Player";

  // ---------- View-only sections (Core/Academics/Athletics) ----------
  const coreView = {
    firstName: safeStr(atomic?.firstName || ""),
    lastName: safeStr(atomic?.lastName || ""),
    gradYear: atomic?.gradYear ?? atomic?.academics?.gradYear ?? null,
    heightFt: atomic?.heightFt ?? null,
    heightIn: atomic?.heightIn ?? null,
    weightLb: atomic?.weightLb ?? null,
    primaryPos: atomic?.primaryPos ?? atomic?.positions?.primary ?? null,
    secondaryPos:
      atomic?.secondaryPos ??
      (Array.isArray(atomic?.positions?.secondary) ? atomic.positions.secondary[0] : null) ??
      null,
    bats: atomic?.bats ?? null,
    throws: atomic?.throws ?? null,
    hometown: atomic?.hometown ?? atomic?.homeTown ?? null,
    state: atomic?.state ?? atomic?.homeState ?? null,
    email: atomic?.email ?? email ?? null,
    phone: atomic?.phone ?? null,
  };

  const academicsView = {
    gpa: atomic?.gpa ?? atomic?.academics?.gpa ?? null,
    gpaOutOf: atomic?.academics?.gpaOutOf ?? atomic?.academics?.gpaScale ?? null,
    sat: atomic?.academics?.sat ?? null,
    act: atomic?.academics?.act ?? null,
    highSchool: atomic?.academics?.highSchool ?? atomic?.academics?.highSchoolName ?? null,
    city: atomic?.academics?.city ?? null,
    state: atomic?.academics?.state ?? null,
    areasOfStudy:
      atomic?.academics?.areasOfStudy ??
      atomic?.academics?.intendedMajors ??
      atomic?.academics?.areasOfStudyInput ??
      null,
    bio: atomic?.academics?.bio ?? atomic?.academics?.academicBio ?? null,
  };

  const athleticsView = {
    primaryPos: atomic?.primaryPos ?? atomic?.positions?.primary ?? null,
    secondaryPos:
      atomic?.secondaryPos ??
      (Array.isArray(atomic?.positions?.secondary) ? atomic.positions.secondary.join(", ") : null) ??
      null,
    isPitcher: atomic?.isPitcher ?? null,
    pitcherHand: atomic?.pitcherHand ?? null,
    bats: atomic?.bats ?? null,
    throws: atomic?.throws ?? null,
    eligibilityRegistered:
      atomic?.athletics?.eligibilityRegistered ??
      atomic?.athletics?.registeredEligibilityCenters ??
      atomic?.athletics?.ncaaNaiaRegistered ??
      null,
    bio: atomic?.athletics?.playerBio ?? atomic?.athletics?.athleticBio ?? null,
    teams: Array.isArray(atomic?.athletics?.teams) ? atomic.athletics.teams : [],
  };

  // ---------- Editable sections ----------
  const metrics: Record<string, MetricEntry[]> = isObj(atomic?.metrics) ? atomic.metrics : {};
  const metricKeys = Object.keys(metrics)
    .filter((k) => Array.isArray(metrics[k]))
    .sort((a, b) => metricLabel(a).localeCompare(metricLabel(b)));

  const statsSeasons = Array.isArray(atomic?.statsSeasons) ? atomic.statsSeasons : [];

  const vsRaw = isObj(atomic?.videoSocial) ? atomic.videoSocial : {};
  const externalVideos: VideoRow[] =
    Array.isArray(vsRaw?.externalVideos)
      ? vsRaw.externalVideos
      : Array.isArray(atomic?.externalVideos)
      ? atomic.externalVideos
      : [];
  const localVideos: UploadRow[] =
    Array.isArray(vsRaw?.localVideos)
      ? vsRaw.localVideos
      : Array.isArray(atomic?.localVideos)
      ? atomic.localVideos
      : [];

  const coaches: CoachRow[] = Array.isArray(atomic?.coaches) ? atomic.coaches : [];

  function canSaveNow() {
    if (loading) return false;
    if (loadError) return false;
    if (saving) return false;
    if (!playerProfileId) return false;
    return true;
  }

  function buildPostUrl() {
    let url = "/api/team/player-profile";
    if (playerProfileId) url += `?playerProfileId=${encodeURIComponent(playerProfileId)}`;
    return url;
  }

  async function onSave() {
    if (!canSaveNow()) return;

    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);

    try {
      const res = await fetch(buildPostUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atomic }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to save player profile.");

      setSaveMsg("Saved!");

      if (json?.data?.atomic) {
        const a = json.data.atomic;
        setAtomic(a);

        // re-prime stats editor and social editor
        const seasons = Array.isArray(a?.statsSeasons) ? a.statsSeasons : [];
        setStatsJsonDraft(JSON.stringify(seasons, null, 2));
        setStatsJsonErr(null);

        const vs = isObj(a?.videoSocial) ? a.videoSocial : {};
        const social = (isObj(vs?.social) ? vs.social : isObj(a?.social) ? a.social : {}) as any;
        setXHandle(safeStr(social?.xHandle || ""));
        setIgHandle(safeStr(social?.instagramHandle || ""));
        setYtUrl(safeStr(social?.youtubeChannelUrl || social?.youtubeUrl || ""));
      }
    } catch (e: any) {
      setSaveErr(e?.message || "Something went wrong saving.");
    } finally {
      setSaving(false);
    }
  }

  function setAtomicKey(key: string, value: any) {
    setAtomic((prev: any) => ({ ...(prev || {}), [key]: value }));
  }

  // ---- Metrics editor helpers ----
  function upsertMetricEntry(metricKey: string, idx: number, patch: Partial<MetricEntry>) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const m = isObj(next.metrics) ? { ...next.metrics } : {};
      const arr = Array.isArray(m[metricKey]) ? [...m[metricKey]] : [];
      const cur = arr[idx] || { monthYear: "", value: 0, source: null };
      arr[idx] = {
        ...cur,
        ...patch,
        monthYear: normMonthYear((patch as any)?.monthYear ?? cur.monthYear),
      };
      m[metricKey] = arr;
      next.metrics = m;
      return next;
    });
  }

  function removeMetricEntry(metricKey: string, idx: number) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const m = isObj(next.metrics) ? { ...next.metrics } : {};
      const arr = Array.isArray(m[metricKey]) ? [...m[metricKey]] : [];
      arr.splice(idx, 1);
      m[metricKey] = arr;
      next.metrics = m;
      return next;
    });
  }

  function addMetricEntry() {
    const key = String(newMetricKey || "").trim();
    const monthYear = normMonthYear(newMetricMonth);
    const v = Number(newMetricValue);
    if (!key || !monthYear || !Number.isFinite(v)) return;

    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const m = isObj(next.metrics) ? { ...next.metrics } : {};
      const arr = Array.isArray(m[key]) ? [...m[key]] : [];
      arr.push({ monthYear, value: v, source: newMetricSource.trim() || null });
      m[key] = arr;
      next.metrics = m;
      return next;
    });

    setNewMetricMonth("");
    setNewMetricValue("");
    setNewMetricSource("");
  }

  // ---- Stats JSON editor helpers ----
  function applyStatsJsonDraft() {
    try {
      const parsed = JSON.parse(statsJsonDraft || "[]");
      if (!Array.isArray(parsed)) throw new Error("Stats seasons must be an array.");
      setStatsJsonErr(null);
      setAtomicKey("statsSeasons", parsed);
      setSaveMsg("Stats updated locally — click Save Profile to publish.");
    } catch (e: any) {
      setStatsJsonErr(e?.message || "Invalid JSON");
    }
  }

  // ---- Video/Social helpers ----
  function setVideoSocialSocial(nextSocial: any) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      vs.social = nextSocial;
      next.videoSocial = vs;
      // keep legacy top-level social in sync (optional but helpful)
      next.social = nextSocial;
      return next;
    });
  }

  function saveSocialFieldsToAtomic() {
    setVideoSocialSocial({
      xHandle: xHandle.trim() || null,
      instagramHandle: igHandle.trim() || null,
      youtubeChannelUrl: ytUrl.trim() || null,
    });
    setSaveMsg("Social updated locally — click Save Profile to publish.");
  }

  function addExternalVideo() {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.externalVideos) ? [...vs.externalVideos] : [];
      arr.push({ id: genId("ext"), title: "", url: "", source: "YouTube" });
      vs.externalVideos = arr;
      next.videoSocial = vs;
      // keep legacy top-level too
      next.externalVideos = arr;
      return next;
    });
  }

  function updateExternalVideo(idx: number, patch: Partial<VideoRow>) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.externalVideos) ? [...vs.externalVideos] : [];
      const cur = arr[idx] || {};
      arr[idx] = { ...cur, ...patch };
      vs.externalVideos = arr;
      next.videoSocial = vs;
      next.externalVideos = arr;
      return next;
    });
  }

  function removeExternalVideo(idx: number) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.externalVideos) ? [...vs.externalVideos] : [];
      arr.splice(idx, 1);
      vs.externalVideos = arr;
      next.videoSocial = vs;
      next.externalVideos = arr;
      return next;
    });
  }

  function addLocalVideo() {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.localVideos) ? [...vs.localVideos] : [];
      arr.push({ id: genId("up"), title: "", publicUrl: "" });
      vs.localVideos = arr;
      next.videoSocial = vs;
      next.localVideos = arr;
      return next;
    });
  }

  function updateLocalVideo(idx: number, patch: Partial<UploadRow>) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.localVideos) ? [...vs.localVideos] : [];
      const cur = arr[idx] || {};
      arr[idx] = { ...cur, ...patch };
      vs.localVideos = arr;
      next.videoSocial = vs;
      next.localVideos = arr;
      return next;
    });
  }

  function removeLocalVideo(idx: number) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const vs = isObj(next.videoSocial) ? { ...next.videoSocial } : {};
      const arr = Array.isArray(vs.localVideos) ? [...vs.localVideos] : [];
      arr.splice(idx, 1);
      vs.localVideos = arr;
      next.videoSocial = vs;
      next.localVideos = arr;
      return next;
    });
  }

  // ---- Coaches editor helpers ----
  function addCoach() {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const arr = Array.isArray(next.coaches) ? [...next.coaches] : [];
      arr.push({ firstName: "", lastName: "", teamOrOrg: "", email: "", phone: "", focus: "" });
      next.coaches = arr;
      return next;
    });
  }

  function updateCoach(idx: number, patch: Partial<CoachRow>) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const arr = Array.isArray(next.coaches) ? [...next.coaches] : [];
      const cur = arr[idx] || {};
      arr[idx] = { ...cur, ...patch };
      next.coaches = arr;
      return next;
    });
  }

  function removeCoach(idx: number) {
    setAtomic((prev: any) => {
      const next = { ...(prev || {}) };
      const arr = Array.isArray(next.coaches) ? [...next.coaches] : [];
      arr.splice(idx, 1);
      next.coaches = arr;
      return next;
    });
  }

  const canSave = canSaveNow();

  return (
    <main style={{ display: "grid", gap: 12 }}>
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Edit Player Profile as Team Admin</div>

          <div style={muted}>
            Team Admin can edit <b>Metrics</b>, <b>Stats</b>, <b>Video/Social</b>, and <b>Coaches/References</b>.
            Core, Academics, and Athletics are <b>view-only</b> for Team Admin. Only Player and Parent can edit Core, Academics, and Athletics.
          </div>

          <div style={miniHint}>
            Player: <span style={{ fontWeight: 900, color: "#0f172a" }}>{fullName}</span>
          </div>

          {slug ? (
            <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/player/${slug}`} style={{ ...btnGhost, padding: "8px 10px" }}>
                View Public Profile
              </Link>
              <Link href={`/player/${slug}/card?from=teaser`} target="_blank" style={{ ...btnGhost, padding: "8px 10px" }}>
                View Player Card
              </Link>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/team/roster" style={btnGhost}>
            Back to Roster
          </Link>
        </div>
      </section>

      <section style={card}>
        <div style={tabRow}>
          <TabButton active={tab === "core"} onClick={() => setTab("core")}>
            Core
          </TabButton>
          <TabButton active={tab === "academics"} onClick={() => setTab("academics")}>
            Academics
          </TabButton>
          <TabButton active={tab === "athletics"} onClick={() => setTab("athletics")}>
            Athletics
          </TabButton>
          <TabButton active={tab === "metrics"} onClick={() => setTab("metrics")}>
            Metrics
          </TabButton>
          <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
            Stats
          </TabButton>
          <TabButton active={tab === "video"} onClick={() => setTab("video")}>
            Video / Social
          </TabButton>
          <TabButton active={tab === "coaches"} onClick={() => setTab("coaches")}>
            Coaches / References
          </TabButton>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading ? <Placeholder title="Loading…" bullets={["Pulling the player’s saved data…"]} /> : null}

          {!loading && loadError ? (
            <div style={placeholder}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Couldn’t load player</div>
              <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800 }}>{loadError}</div>
              <div style={{ marginTop: 10, color: "#475569", fontWeight: 800 }}>
                Make sure <span style={{ fontFamily: "monospace" }}>/api/team/player-profile</span> can read by{" "}
                <span style={{ fontFamily: "monospace" }}>playerProfileId</span>.
              </div>
            </div>
          ) : null}

          {/* ---------------- VIEW ONLY: CORE ---------------- */}
          {!loading && !loadError && tab === "core" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>
                Core <span style={lockPill}>View-only for Team Admin</span>
              </div>

              <div style={grid2}>
                <ReadField label="First Name" value={coreView.firstName || "—"} />
                <ReadField label="Last Name" value={coreView.lastName || "—"} />
                <ReadField label="Grad Year" value={coreView.gradYear ?? "—"} />
                <ReadField
                  label="Height"
                  value={
                    coreView.heightFt != null && coreView.heightIn != null
                      ? `${coreView.heightFt}'${coreView.heightIn}"`
                      : "—"
                  }
                />
                <ReadField label="Weight" value={coreView.weightLb != null ? `${coreView.weightLb} lb` : "—"} />
                <ReadField label="Primary / Secondary" value={`${coreView.primaryPos ?? "—"} / ${coreView.secondaryPos ?? "—"}`} />
                <ReadField label="Bats / Throws" value={`${coreView.bats ?? "—"} / ${coreView.throws ?? "—"}`} />
                <ReadField label="Hometown" value={`${coreView.hometown ?? "—"}${coreView.state ? `, ${coreView.state}` : ""}`} />
                <ReadField label="Email" value={coreView.email ?? "—"} />
                <ReadField label="Phone" value={coreView.phone ?? "—"} />
              </div>

              <div style={mutedSmall}>
                Team Admin can view this info, but only player/parent can edit it.
              </div>
            </div>
          ) : null}

          {/* ---------------- VIEW ONLY: ACADEMICS ---------------- */}
          {!loading && !loadError && tab === "academics" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>
                Academics <span style={lockPill}>View-only for Team Admin</span>
              </div>

              <div style={grid2}>
                <ReadField label="GPA" value={academicsView.gpa ?? "—"} />
                <ReadField label="GPA Scale" value={academicsView.gpaOutOf ?? "—"} />
                <ReadField label="SAT" value={academicsView.sat ?? "—"} />
                <ReadField label="ACT" value={academicsView.act ?? "—"} />
                <ReadField label="High School" value={academicsView.highSchool ?? "—"} />
                <ReadField label="City / State" value={`${academicsView.city ?? "—"}${academicsView.state ? `, ${academicsView.state}` : ""}`} />
                <ReadField label="Areas of Study" value={academicsView.areasOfStudy ?? "—"} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>Academic Bio</div>
                <div style={readBox}>{academicsView.bio ? String(academicsView.bio) : "—"}</div>
              </div>

              <div style={mutedSmall}>
                Team Admin can view this info, but only player/parent can edit it.
              </div>
            </div>
          ) : null}

          {/* ---------------- VIEW ONLY: ATHLETICS ---------------- */}
          {!loading && !loadError && tab === "athletics" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>
                Athletics <span style={lockPill}>View-only for Team Admin</span>
              </div>

              <div style={grid2}>
                <ReadField label="Primary Pos" value={athleticsView.primaryPos ?? "—"} />
                <ReadField label="Secondary Pos" value={athleticsView.secondaryPos ?? "—"} />
                <ReadField label="Pitcher" value={athleticsView.isPitcher ?? "—"} />
                <ReadField label="Pitcher Hand" value={athleticsView.pitcherHand ?? "—"} />
                <ReadField label="Bats" value={athleticsView.bats ?? "—"} />
                <ReadField label="Throws" value={athleticsView.throws ?? "—"} />
                <ReadField label="Eligibility Registered" value={athleticsView.eligibilityRegistered ?? "—"} />
                <ReadField label="Teams" value={Array.isArray(athleticsView.teams) ? String(athleticsView.teams.length) : "0"} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>Athletic Bio</div>
                <div style={readBox}>{athleticsView.bio ? String(athleticsView.bio) : "—"}</div>
              </div>

              <div style={mutedSmall}>
                Team Admin can view this info, but only player/parent can edit it.
              </div>
            </div>
          ) : null}

          {/* ---------------- EDITABLE: METRICS ---------------- */}
          {!loading && !loadError && tab === "metrics" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>Metrics</div>

              <div style={subCard}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Add a metric entry</div>
                <div style={grid3}>
                  <div>
                    <div style={label}>Metric</div>
                    <select value={newMetricKey} onChange={(e) => setNewMetricKey(e.target.value)} style={input}>
                      {[
                        "exitVelo",
                        "homeToFirst",
                        "sixtyYdDash",
                        "rawThrowVelo",
                        "infieldThrowVelo",
                        "outfieldThrowVelo",
                        "catcherThrowVelo",
                        "avgFbVelo",
                        "avgChVelo",
                        "avgBbVelo",
                        "popTime",
                        "benchPress",
                        "squat",
                      ].map((k) => (
                        <option key={k} value={k}>
                          {metricLabel(k)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={label}>Month/Year</div>
                    <input
                      style={input}
                      value={newMetricMonth}
                      onChange={(e) => setNewMetricMonth(e.target.value)}
                      placeholder="02/2026"
                    />
                  </div>

                  <div>
                    <div style={label}>Value</div>
                    <input
                      style={input}
                      value={newMetricValue}
                      onChange={(e) => setNewMetricValue(e.target.value)}
                      placeholder="92"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={label}>Source (optional)</div>
                    <input
                      style={input}
                      value={newMetricSource}
                      onChange={(e) => setNewMetricSource(e.target.value)}
                      placeholder="Perfect Game / Trackman / Coach"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addMetricEntry}
                    style={{
                      ...btnGold,
                      opacity: newMetricKey && newMetricMonth && newMetricValue ? 1 : 0.6,
                      cursor: newMetricKey && newMetricMonth && newMetricValue ? "pointer" : "not-allowed",
                    }}
                    disabled={!newMetricKey || !newMetricMonth || !newMetricValue}
                  >
                    Add Entry
                  </button>
                </div>

                <div style={mutedSmall}>Click “Save Profile” below to publish updates.</div>
              </div>

              {metricKeys.length === 0 ? (
                <div style={{ marginTop: 12, color: "#64748b", fontWeight: 800 }}>No metrics saved yet.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {metricKeys.map((k) => {
                    const entries = (metrics[k] || []).slice().sort((a, b) => sortMonthAsc(a.monthYear, b.monthYear));
                    const unit = unitForMetric(k);

                    return (
                      <div key={k} style={subCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 900, color: "#0f172a" }}>{metricLabel(k)}</div>
                          <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12 }}>{unit ? `Unit: ${unit}` : ""}</div>
                        </div>

                        {entries.length === 0 ? (
                          <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>No entries.</div>
                        ) : (
                          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                            {entries.map((e, idx) => (
                              <div key={`${k}-${idx}`} style={metricRow}>
                                <div style={{ display: "grid", gap: 6 }}>
                                  <div style={label}>Month/Year</div>
                                  <input
                                    style={input}
                                    value={safeStr(e.monthYear)}
                                    onChange={(ev) => upsertMetricEntry(k, idx, { monthYear: ev.target.value })}
                                  />
                                </div>

                                <div style={{ display: "grid", gap: 6 }}>
                                  <div style={label}>Value</div>
                                  <input
                                    style={input}
                                    value={safeStr(e.value)}
                                    onChange={(ev) =>
                                      upsertMetricEntry(k, idx, {
                                        value: Number(ev.target.value),
                                      })
                                    }
                                    inputMode="decimal"
                                  />
                                </div>

                                <div style={{ display: "grid", gap: 6 }}>
                                  <div style={label}>Source</div>
                                  <input
                                    style={input}
                                    value={safeStr(e.source || "")}
                                    onChange={(ev) => upsertMetricEntry(k, idx, { source: ev.target.value || null })}
                                  />
                                </div>

                                <div style={{ display: "flex", alignItems: "end" }}>
                                  <button type="button" style={btnDangerOutline} onClick={() => removeMetricEntry(k, idx)}>
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* ---------------- EDITABLE: STATS ---------------- */}
          {!loading && !loadError && tab === "stats" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>Stats</div>

              <div style={mutedSmall}>
                For now this uses a JSON editor for <span style={{ fontFamily: "monospace" }}>statsSeasons</span> so you can edit immediately.
                (Later, we’ll swap in your full Stats tab UI.)
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={label}>statsSeasons (array)</div>
                <textarea
                  value={statsJsonDraft}
                  onChange={(e) => setStatsJsonDraft(e.target.value)}
                  rows={14}
                  style={textarea}
                />
                {statsJsonErr ? <div style={{ ...mutedSmall, color: "#b91c1c", fontWeight: 900 }}>{statsJsonErr}</div> : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                  <button type="button" onClick={applyStatsJsonDraft} style={btnGhost}>
                    Apply JSON to Profile
                  </button>
                  <div style={miniHint}>
                    Seasons saved: <span style={{ fontWeight: 900 }}>{statsSeasons.length}</span>
                  </div>
                </div>

                <div style={mutedSmall}>After “Apply”, click “Save Profile” below to publish updates.</div>
              </div>
            </div>
          ) : null}

          {/* ---------------- EDITABLE: VIDEO / SOCIAL ---------------- */}
          {!loading && !loadError && tab === "video" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>Video / Social</div>

              <div style={subCard}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Social</div>
                <div style={grid3}>
                  <div>
                    <div style={label}>X Handle</div>
                    <input style={input} value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="@username" />
                  </div>
                  <div>
                    <div style={label}>Instagram Handle</div>
                    <input style={input} value={igHandle} onChange={(e) => setIgHandle(e.target.value)} placeholder="@username" />
                  </div>
                  <div>
                    <div style={label}>YouTube Channel URL</div>
                    <input style={input} value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/..." />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" style={btnGold} onClick={saveSocialFieldsToAtomic}>
                    Apply Social to Profile
                  </button>
                </div>
                <div style={mutedSmall}>After “Apply”, click “Save Profile” below to publish updates.</div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div style={subCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>External Videos</div>
                    <button type="button" style={btnGhost} onClick={addExternalVideo}>
                      + Add External Video
                    </button>
                  </div>

                  {externalVideos.length === 0 ? (
                    <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>No external videos yet.</div>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {externalVideos.map((v, idx) => (
                        <div key={v?.id || idx} style={videoRow}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={label}>Title</div>
                            <input
                              style={input}
                              value={safeStr(v?.title || "")}
                              onChange={(e) => updateExternalVideo(idx, { title: e.target.value })}
                              placeholder="Summer Highlights"
                            />
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={label}>URL</div>
                            <input
                              style={input}
                              value={safeStr(v?.url || "")}
                              onChange={(e) => updateExternalVideo(idx, { url: e.target.value })}
                              placeholder="https://youtu.be/..."
                            />
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={label}>Source</div>
                            <input
                              style={input}
                              value={safeStr(v?.source || "")}
                              onChange={(e) => updateExternalVideo(idx, { source: e.target.value })}
                              placeholder="YouTube"
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "end" }}>
                            <button type="button" style={btnDangerOutline} onClick={() => removeExternalVideo(idx)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={subCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>Uploaded Videos</div>
                    <button type="button" style={btnGhost} onClick={addLocalVideo}>
                      + Add Upload (URL)
                    </button>
                  </div>

                  {localVideos.length === 0 ? (
                    <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>No uploaded videos yet.</div>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {localVideos.map((v, idx) => (
                        <div key={v?.id || idx} style={videoRow}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={label}>Title</div>
                            <input
                              style={input}
                              value={safeStr(v?.title || "")}
                              onChange={(e) => updateLocalVideo(idx, { title: e.target.value })}
                              placeholder="BP Session"
                            />
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div style={label}>Public URL</div>
                            <input
                              style={input}
                              value={safeStr(v?.publicUrl || "")}
                              onChange={(e) => updateLocalVideo(idx, { publicUrl: e.target.value })}
                              placeholder="/uploads/..."
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "end" }}>
                            <button type="button" style={btnDangerOutline} onClick={() => removeLocalVideo(idx)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={mutedSmall}>Click “Save Profile” below to publish updates.</div>
              </div>
            </div>
          ) : null}

          {/* ---------------- EDITABLE: COACHES ---------------- */}
          {!loading && !loadError && tab === "coaches" ? (
            <div style={sectionBox}>
              <div style={sectionTitle}>Coaches / References</div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={miniHint}>
                  Entries saved: <span style={{ fontWeight: 900 }}>{coaches.length}</span>
                </div>
                <button type="button" style={btnGhost} onClick={addCoach}>
                  + Add Coach
                </button>
              </div>

              {coaches.length === 0 ? (
                <div style={{ marginTop: 10, color: "#64748b", fontWeight: 800 }}>No coaches/references yet.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {coaches.map((c, idx) => (
                    <div key={idx} style={subCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>Coach #{idx + 1}</div>
                        <button type="button" style={btnDangerOutline} onClick={() => removeCoach(idx)}>
                          Remove
                        </button>
                      </div>

                      <div style={grid3}>
                        <div>
                          <div style={label}>First Name</div>
                          <input style={input} value={safeStr(c.firstName || "")} onChange={(e) => updateCoach(idx, { firstName: e.target.value })} />
                        </div>
                        <div>
                          <div style={label}>Last Name</div>
                          <input style={input} value={safeStr(c.lastName || "")} onChange={(e) => updateCoach(idx, { lastName: e.target.value })} />
                        </div>
                        <div>
                          <div style={label}>Team/Org</div>
                          <input style={input} value={safeStr(c.teamOrOrg || "")} onChange={(e) => updateCoach(idx, { teamOrOrg: e.target.value })} />
                        </div>
                      </div>

                      <div style={grid3}>
                        <div>
                          <div style={label}>Email</div>
                          <input style={input} value={safeStr(c.email || "")} onChange={(e) => updateCoach(idx, { email: e.target.value })} />
                        </div>
                        <div>
                          <div style={label}>Phone</div>
                          <input style={input} value={safeStr(c.phone || "")} onChange={(e) => updateCoach(idx, { phone: e.target.value })} />
                        </div>
                        <div>
                          <div style={label}>Focus / Role</div>
                          <input style={input} value={safeStr(c.focus || "")} onChange={(e) => updateCoach(idx, { focus: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={mutedSmall}>Click “Save Profile” below to publish updates.</div>
            </div>
          ) : null}
        </div>

        {/* ✅ Bottom Save Bar */}
        <div style={saveBar}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {saveErr ? <div style={saveError}>{saveErr}</div> : null}
            {saveMsg ? <div style={saveOk}>{saveMsg}</div> : null}

            <button type="button" onClick={onSave} style={btnGold} disabled={!canSave}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>

          {/* right side reserved */}
          <div />
        </div>
      </section>
    </main>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={props.onClick} style={{ ...tabBtn, ...(props.active ? tabActive : {}) }}>
      {props.children}
    </button>
  );
}

function ReadField({ label: lbl, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <div style={label}>{lbl}</div>
      <div style={readBox}>{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}

function Placeholder({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div style={placeholder}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#475569", fontWeight: 800, lineHeight: 1.45 }}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Styles ---------------- */

const topRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "stretch",
  justifyContent: "space-between",
  padding: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
};

const muted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const mutedSmall: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
  lineHeight: 1.35,
};

const miniHint: React.CSSProperties = {
  marginTop: 6,
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.35,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const tabRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const tabBtn: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const tabActive: React.CSSProperties = {
  borderColor: "#caa042",
  background: "#fffbeb",
};

const placeholder: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
};

const sectionBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const lockPill: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#64748b",
  fontWeight: 900,
  fontSize: 11,
};

const grid2: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  alignItems: "end",
};

const subCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
};

const label: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 600,
  outline: "none",
  background: "#fff",
};

const textarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 600,
  outline: "none",
  background: "#fff",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

const readBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  minHeight: 42,
  display: "flex",
  alignItems: "center",
};

const metricRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "end",
};

const videoRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.8fr) auto",
  gap: 10,
  alignItems: "end",
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const btnDangerOutline: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const saveBar: React.CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const saveOk: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  fontWeight: 900,
  fontSize: 12,
};

const saveError: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 900,
  fontSize: 12,
};

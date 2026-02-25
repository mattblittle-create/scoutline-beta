// app/dashboard/coach/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";

const ROLE_PRESETS = [
  "Head Coach",
  "Assistant Coach",
  "Pitching Coach",
  "Hitting Coach",
  "Fielding Coach",
  "Recruiting Coordinator",
  "Recruiting Staff",
  "Program Manager",
  "Program Staff",
  "General Manager",
] as const;

type StaffTitle = (typeof ROLE_PRESETS)[number];

function normalizeStaffTitle(v: any): StaffTitle {
  const raw = String(v ?? "").trim();
  const hit = ROLE_PRESETS.find((x) => x === raw);
  return hit || "Assistant Coach";
}

const COLLEGE_DIVISION_OPTIONS = [
  "NCAA Division I",
  "NCAA Division II",
  "NCAA Division III",
  "NAIA",
  "NJCAA Division I",
  "NJCAA Division II",
  "NJCAA Division III",
  "CCCAA",
  "USCAA",
  "NCCAA",
] as const;

const CONFERENCES_BY_DIVISION: Record<string, string[]> = {
  "NCAA Division I": [
    "America East",
    "American Athletic",
    "ASUN",
    "Atlantic 10",
    "ACC",
    "Big 12",
    "Big East",
    "Big Sky",
    "Big South",
    "Big Ten",
    "Big West",
    "CAA (Coastal Athletic Association)",
    "Conference USA",
    "Horizon League",
    "Ivy League",
    "MAAC",
    "MAC",
    "MEAC",
    "Missouri Valley",
    "Mountain West",
    "NEC",
    "OVC",
    "Pac-12",
    "Patriot League",
    "SEC",
    "SoCon",
    "Southland",
    "Summit League",
    "Sun Belt",
    "SWAC",
    "WAC",
    "WCC",
    "Independents",
  ],
  "NCAA Division II": [
    "California Collegiate Athletic Association (CCAA)",
    "Central Atlantic Collegiate Conference (CACC)",
    "Central Intercollegiate Athletic Association (CIAA)",
    "Conference Carolinas",
    "East Coast Conference (ECC)",
    "Great American Conference (GAC)",
    "Great Lakes Intercollegiate Athletic Conference (GLIAC)",
    "Great Lakes Valley Conference (GLVC)",
    "Great Midwest Athletic Conference (G-MAC)",
    "Great Northwest Athletic Conference (GNAC)",
    "Gulf South Conference (GSC)",
    "Lone Star Conference (LSC)",
    "Mid-America Intercollegiate Athletics Association (MIAA)",
    "Mountain East Conference (MEC)",
    "Northeast-10 Conference (NE10)",
    "Northern Sun Intercollegiate Conference (NSIC)",
    "Pacific West Conference (PacWest)",
    "Peach Belt Conference (PBC)",
    "Pennsylvania State Athletic Conference (PSAC)",
    "Rocky Mountain Athletic Conference (RMAC)",
    "South Atlantic Conference (SAC)",
    "Southern Intercollegiate Athletic Conference (SIAC)",
  ],
  "NCAA Division III": [
    "Allegheny Mountain Collegiate Conference (AMCC)",
    "American Rivers Conference (A-R-C)",
    "American Southwest Conference (ASC)",
    "Atlantic East Conference (AEC)",
    "Centennial Conference",
    "CUNYAC",
    "Coast to Coast Athletic Conference (C2C)",
    "College Conference of Illinois and Wisconsin (CCIW)",
    "Collegiate Conference of the South (CCS)",
    "Conference of New England (CNE)",
    "Empire 8",
    "Great Northeast Athletic Conference (GNAC)",
    "Heartland Collegiate Athletic Conference (HCAC)",
    "Landmark Conference",
    "Liberty League",
    "Little East Conference (LEC)",
    "Michigan Intercollegiate Athletic Association (MIAA)",
    "Middle Atlantic Conferences (MAC)",
    "Midwest Conference",
    "Minnesota Intercollegiate Athletic Conference (MIAC)",
    "NESCAC",
    "New England Women’s and Men’s Athletic Conference (NEWMAC)",
    "New Jersey Athletic Conference (NJAC)",
    "North Atlantic Conference (NAC)",
    "North Coast Athletic Conference (NCAC)",
    "Northern Athletics Collegiate Conference (NACC)",
    "Northwest Conference (NWC)",
    "Ohio Athletic Conference (OAC)",
    "Old Dominion Athletic Conference (ODAC)",
    "Presidents’ Athletic Conference (PAC)",
    "Skyline Conference",
    "Southern Athletic Association (SAA)",
    "Southern California Intercollegiate Athletic Conference (SCIAC)",
    "Southern Collegiate Athletic Conference (SCAC)",
    "St. Louis Intercollegiate Athletic Conference (SLIAC)",
    "State University of New York Athletic Conference (SUNYAC)",
    "United East Conference",
    "Upper Midwest Athletic Conference (UMAC)",
    "USA South Athletic Conference",
    "Wisconsin Intercollegiate Athletic Conference (WIAC)",
  ],
  NAIA: [
    "American Midwest Conference (AMC)",
    "Appalachian Athletic Conference (AAC)",
    "California Pacific Conference (CalPac)",
    "Cascade Collegiate Conference (CCC)",
    "Chicagoland Collegiate Athletic Conference (CCAC)",
    "Crossroads League",
    "Frontier Conference",
    "Great Plains Athletic Conference (GPAC)",
    "Gulf Coast Athletic Conference (GCAC)",
    "Golden State Athletic Conference (GSAC)",
    "Heart of America Athletic Conference (HAAC)",
    "Kansas Collegiate Athletic Conference (KCAC)",
    "Mid-South Conference",
    "Midwest Collegiate Conference (MCC)",
    "Red River Athletic Conference (RRAC)",
    "River States Conference (RSC)",
    "Sooner Athletic Conference (SAC)",
    "Southern States Athletic Conference (SSAC)",
    "The Sun Conference",
    "Wolverine-Hoosier Athletic Conference (WHAC)",
  ],
  "NJCAA Division I": Array.from({ length: 24 }, (_, i) => `NJCAA Region ${i + 1}`),
  "NJCAA Division II": Array.from({ length: 24 }, (_, i) => `NJCAA Region ${i + 1}`),
  "NJCAA Division III": Array.from({ length: 24 }, (_, i) => `NJCAA Region ${i + 1}`),
  CCCAA: [
    "Orange Empire Conference",
    "South Coast Conference",
    "Western State Conference",
    "Big 8 Conference",
    "Pacific Coast Athletic Conference (PCAC)",
    "Central Valley Conference",
    "Golden Valley Conference",
    "Coast Conference",
  ],
  USCAA: [],
  NCCAA: [],
};

type RecruitingTarget = { gradYear: number; positions: string[] };
const POSITION_OPTIONS = ["RHP", "LHP", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility"] as const;

type ApiOk = {
  ok: true;
  data: {
    coach: {
      id: string;
      slug: string | null;
      name: string | null;
      role: string | null;
      email: string;
      contactEmail?: string | null;
      workPhone: string | null;
      workPhoneExt: string | null;
      phonePrivate: boolean;
      photoUrl: string | null;
      recruitingTargets: RecruitingTarget[];
      coachBio?: string | null;
    };
    program: {
      collegeId: string | null;
      collegeName: string | null;
      logoUrl: string | null;
      websiteUrl: string | null;
      programWebsiteUrl: string | null;
      division: string | null;
      conference: string | null;
      programBio?: string | null;
      lastEditedAt?: string | null;
      lastEditedBy?: { id: string; name: string | null; email: string } | null;
    };
  };
};

type ApiErr = { ok: false; error: string };

async function uploadImage(file: File, kind: "coach-photo" | "college-logo") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);

  const res = await fetch("/api/uploads/image", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.error || `Upload failed (${res.status})`);
  return String(json.url);
}

const BIO_WORD_LIMIT = 500;

function wordCount(text: string) {
  const t = String(text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function clampToWords(text: string, maxWords: number) {
  const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return text;
  return parts.slice(0, maxWords).join(" ");
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatPhoneUS(input: any) {
  const d = digitsOnly(input).slice(0, 10);
  if (!d) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function splitFullName(full: string): { first: string; last: string } {
  const s = String(full || "").trim().replace(/\s+/g, " ");
  if (!s) return { first: "", last: "" };
  const parts = s.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <div style={{ fontWeight: 900, fontSize: 12, color: "#64748b" }}>{props.label}</div>
      {props.hint ? <div style={{ fontSize: 11, color: "#94a3b8" }}>{props.hint}</div> : null}
      {props.children}
    </div>
  );
}

function RecruitingTargetsSection(props: {
  recruitingTargets: RecruitingTarget[];
  sortedRecruitingTargets: RecruitingTarget[];
  newTargetYear: string;
  setNewTargetYear: (v: string) => void;
  addTargetYear: () => void;
  removeTargetYear: (gradYear: number) => void;
  toggleTargetPosition: (gradYear: number, pos: string) => void;
}) {
  const {
    recruitingTargets,
    sortedRecruitingTargets,
    newTargetYear,
    setNewTargetYear,
    addTargetYear,
    removeTargetYear,
    toggleTargetPosition,
  } = props;

  return (
    <div id="recruiting-targets" style={card}>
      <div style={cardTitle}>Recruiting Targets</div>
      <div style={cardSub}>
        Set which grad year(s) and position(s) your program is actively recruiting. These appear on your public coach profile and as
        Quick Presets on the Recruiting Board.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={labelTiny}>Add grad year. After hitting 'Add Year',  you will be able to select position(s).</div>
          <input
            value={newTargetYear}
            onChange={(e) => setNewTargetYear(e.target.value)}
            style={{ ...input, width: 180 }}
            placeholder={String(new Date().getFullYear() + 1)}
          />
        </div>

        <button type="button" onClick={addTargetYear} style={btnOutlineSmall}>
          Add Year
        </button>
      </div>

      {recruitingTargets.length === 0 ? (
        <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>No recruiting targets set yet.</div>
      ) : (
        <div style={targetsScrollWrap}>
          {sortedRecruitingTargets.map((t) => (
            <div key={t.gradYear} style={targetYearBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Class of {t.gradYear}</div>
                <button type="button" onClick={() => removeTargetYear(t.gradYear)} style={btnRemoveSmall}>
                  Remove year
                </button>
              </div>

              <div style={chipsWrap}>
                {POSITION_OPTIONS.map((p) => {
                  const active = (t.positions || []).includes(p);
                  return (
                    <button key={p} type="button" onClick={() => toggleTargetPosition(t.gradYear, p)} style={active ? chipOn : chipOff}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [coachSlug, setCoachSlug] = useState<string>("");

  const [coachFirstName, setCoachFirstName] = useState("");
  const [coachLastName, setCoachLastName] = useState("");
  const coachName = useMemo(() => `${coachFirstName} ${coachLastName}`.trim(), [coachFirstName, coachLastName]);
  const [coachRole, setCoachRole] = useState<StaffTitle>("Assistant Coach");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [coachXUrl, setCoachXUrl] = useState("");
  const [coachInstagramUrl, setCoachInstagramUrl] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [workPhoneExt, setWorkPhoneExt] = useState("");
  const [phonePrivate, setPhonePrivate] = useState(true);
  const [photoUrl, setPhotoUrl] = useState("");

  const [coachBio, setCoachBio] = useState("");

  const [recruitingTargets, setRecruitingTargets] = useState<RecruitingTarget[]>([]);
  const [newTargetYear, setNewTargetYear] = useState("");

  const sortedRecruitingTargets = useMemo(() => {
    const arr = [...recruitingTargets];
    arr.sort((a, b) => (a.gradYear ?? 0) - (b.gradYear ?? 0));
    return arr;
  }, [recruitingTargets]);

  const [collegeName, setCollegeName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [programWebsiteUrl, setProgramWebsiteUrl] = useState("");
  const [recruitingQuestionnaireUrl, setRecruitingQuestionnaireUrl] = useState("");
  const [programXUrl, setProgramXUrl] = useState("");
  const [programInstagramUrl, setProgramInstagramUrl] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");

  const [programBio, setProgramBio] = useState("");

  const [programLastEditedAt, setProgramLastEditedAt] = useState<string | null>(null);
  const [programLastEditedBy, setProgramLastEditedBy] = useState<{ name: string | null; email: string } | null>(null);

  const conferenceOptions = useMemo(() => {
    const d = (division || "").trim();
    return d ? CONFERENCES_BY_DIVISION[d] || [] : [];
  }, [division]);

  useEffect(() => {
    const d = (division || "").trim();
    if (!d) return;

    const opts = Object.prototype.hasOwnProperty.call(CONFERENCES_BY_DIVISION, d) ? CONFERENCES_BY_DIVISION[d] || [] : [];
    if (opts.length === 0) return;

    const v = (conference || "").trim();
    if (v && !opts.includes(v)) setConference("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division]);

  const [uploadingCoachPhoto, setUploadingCoachPhoto] = useState(false);
  const [uploadingCollegeLogo, setUploadingCollegeLogo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/coach/profile", { method: "GET", cache: "no-store" });
        const text = await res.text();
        const json: ApiOk | ApiErr = text ? (JSON.parse(text) as any) : ({ ok: false, error: "Empty response" } as any);

        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setErr((!json.ok && (json as any).error) || `Failed (${res.status})`);
          return;
        }

        setCoachSlug(json.data.coach.slug ?? "");

      {
        const parts = splitFullName(json.data.coach.name ?? "");
        setCoachFirstName(parts.first);
        setCoachLastName(parts.last);
      }
        setCoachRole(normalizeStaffTitle(json.data.coach.role));
        setEmail(json.data.coach.email ?? "");
        setContactEmail((json.data.coach as any).contactEmail ?? "");
        setCoachXUrl((json.data.coach as any).coachXUrl ?? "");
        setCoachInstagramUrl((json.data.coach as any).coachInstagramUrl ?? "");
        setWorkPhone(digitsOnly(json.data.coach.workPhone ?? ""));
        setWorkPhoneExt(digitsOnly((json.data.coach as any).workPhoneExt ?? "").slice(0, 6));
        setPhonePrivate(!!json.data.coach.phonePrivate);
        setPhotoUrl(json.data.coach.photoUrl ?? "");

        setCoachBio(json.data.coach.coachBio ?? "");
        setRecruitingTargets(Array.isArray(json.data.coach.recruitingTargets) ? json.data.coach.recruitingTargets : []);

        setCollegeName(json.data.program.collegeName ?? "");
        setLogoUrl(json.data.program.logoUrl ?? "");
        setWebsiteUrl(json.data.program.websiteUrl ?? "");
        setProgramWebsiteUrl(json.data.program.programWebsiteUrl ?? "");
        setRecruitingQuestionnaireUrl((json.data.program as any).recruitingQuestionnaireUrl ?? "");
        setProgramXUrl((json.data.program as any).programXUrl ?? "");
        setProgramInstagramUrl((json.data.program as any).programInstagramUrl ?? "");

        setProgramBio(json.data.program.programBio ?? "");

        const rawDivision = (json.data.program.division ?? "").trim();
        const rawConference = (json.data.program.conference ?? "").trim();
        const normalizedConference = rawConference.trim().toUpperCase() === "DEV" ? "" : rawConference.trim();

        const normDiv = rawDivision.replace(/\s+/g, " ").trim().toLowerCase();
        const isDefaultDivision =
          /(^|\b)ncaa(\b|$)/i.test(normDiv) &&
          (/\bdivision\s*(i|1)\b/i.test(normDiv) || /\bd\s*-?\s*1\b/i.test(normDiv) || /\bdi\b/i.test(normDiv));

        const normalizedDivision = normalizedConference === "" && isDefaultDivision ? "" : rawDivision;

        setDivision(normalizedDivision);
        setConference(normalizedConference);

        const lastEditedAt = (json.data.program as any)?.lastEditedAt ?? null;
        const lastEditedBy = (json.data.program as any)?.lastEditedBy ?? null;

        setProgramLastEditedAt(typeof lastEditedAt === "string" ? lastEditedAt : null);
        setProgramLastEditedBy(
          lastEditedBy && typeof lastEditedBy === "object"
            ? { name: lastEditedBy.name ?? null, email: String(lastEditedBy.email || "") }
            : null
        );
      } catch (e: any) {
        setErr(e?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTargetPosition(gradYear: number, pos: string) {
    setRecruitingTargets((prev) =>
      prev.map((t) => {
        if (t.gradYear !== gradYear) return t;
        const set = new Set(t.positions || []);
        if (set.has(pos)) set.delete(pos);
        else set.add(pos);
        return { ...t, positions: Array.from(set) };
      })
    );
  }

  function removeTargetYear(gradYear: number) {
    setRecruitingTargets((prev) => prev.filter((t) => t.gradYear !== gradYear));
  }

  function addTargetYear() {
    const y = Number(String(newTargetYear || "").trim());
    if (!Number.isFinite(y) || y < 1900 || y > 3000) return;

    setRecruitingTargets((prev) => {
      if (prev.some((t) => t.gradYear === y)) return prev;
      return [...prev, { gradYear: y, positions: [] }].sort((a, b) => a.gradYear - b.gradYear);
    });
    setNewTargetYear("");
  }

  async function save() {
    try {
      setSaving(true);
      setErr(null);
      setOkMsg(null);

      const phoneDigits = digitsOnly(workPhone).slice(0, 10);
      const extDigits = digitsOnly(workPhoneExt).slice(0, 6);

      const res = await fetch("/api/coach/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach: {
            name: `${coachFirstName} ${coachLastName}`.trim(),
            role: coachRole.trim(),
            contactEmail: contactEmail.trim(),
            coachXUrl: coachXUrl.trim(),
            coachInstagramUrl: coachInstagramUrl.trim(),
            workPhone: phoneDigits,
            workPhoneExt: extDigits,
            phonePrivate,
            photoUrl: photoUrl.trim(),
            coachBio: clampToWords(coachBio, BIO_WORD_LIMIT),
            recruitingTargets,
          },
          program: {
            logoUrl: logoUrl.trim(),
            websiteUrl: websiteUrl.trim(),
            programWebsiteUrl: programWebsiteUrl.trim(),
            recruitingQuestionnaireUrl: recruitingQuestionnaireUrl.trim(),
            programXUrl: programXUrl.trim(),
            programInstagramUrl: programInstagramUrl.trim(),
            division: division.trim(),
            conference: conference.trim(),
            programBio: clampToWords(programBio, BIO_WORD_LIMIT),
          },
        }),
      });

      const text = await res.text();
      const json: ApiOk | ApiErr = text ? (JSON.parse(text) as any) : ({ ok: false, error: "Empty response" } as any);

      if (!res.ok || !json.ok) {
        setErr((!json.ok && (json as any).error) || `Failed (${res.status})`);
        return;
      }

      setOkMsg("Saved!");
      setProgramLastEditedAt((json.data.program as any)?.lastEditedAt ?? null);
      setProgramLastEditedBy((json.data.program as any)?.lastEditedBy ?? null);

      setCoachBio(json.data.coach.coachBio ?? clampToWords(coachBio, BIO_WORD_LIMIT));
      setProgramBio(json.data.program.programBio ?? clampToWords(programBio, BIO_WORD_LIMIT));
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setOkMsg(null), 1500);
    }
  }

  async function handleCoachPhotoUpload(file: File | null) {
    if (!file) return;
    try {
      setErr(null);
      setUploadingCoachPhoto(true);
      const url = await uploadImage(file, "coach-photo");
      setPhotoUrl(url);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload coach photo.");
    } finally {
      setUploadingCoachPhoto(false);
    }
  }

  async function handleCollegeLogoUpload(file: File | null) {
    if (!file) return;
    try {
      setErr(null);
      setUploadingCollegeLogo(true);
      const url = await uploadImage(file, "college-logo");
      setLogoUrl(url);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload college logo.");
    } finally {
      setUploadingCollegeLogo(false);
    }
  }

  const effectiveSlug = coachSlug || (email ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") : "");
  const publicCoachUrl = effectiveSlug ? `/coach/${effectiveSlug}` : "";

  // --- Share Profile (MUST be inside component) ---
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const shareUrl =
    typeof window !== "undefined" && publicCoachUrl ? `${window.location.origin}${publicCoachUrl}` : publicCoachUrl || "";

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast("Link copied!");
      window.setTimeout(() => setShareToast(null), 1500);
    } catch {
      setShareToast("Could not copy link.");
      window.setTimeout(() => setShareToast(null), 1500);
    }
  }

  const emailShareHref = shareUrl
    ? `mailto:?subject=${encodeURIComponent("ScoutLine Coach Profile")}&body=${encodeURIComponent(
        `Here is my ScoutLine coach profile:\n\n${shareUrl}`
      )}`
    : "";

  const coachBioWords = wordCount(coachBio);
  const programBioWords = wordCount(programBio);

  return (
    <main style={{ display: "grid", gap: 14, scrollBehavior: "smooth" as any }}>
      {loading && <div style={muted}>Loading profile…</div>}
      {!loading && err && <div style={errorBox}>{err}</div>}

      {!loading && !err && (
        <>
          <div style={grid2}>
            {/* Coach Profile */}
            <div style={card}>
              <div style={cardTitle}>Coach Profile</div>
              <div style={cardSub}>
                This info is shown to players when they search your program and also when you connect with players.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
  <a href="#recruiting-targets" style={btnJump}>
    Jump to Recruiting Targets
  </a>
</div>

              <div style={formGrid}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="First Name">
                  <input value={coachFirstName} onChange={(e) => setCoachFirstName(e.target.value)} style={input} />
                </Field>

                <Field label="Last Name">
                  <input value={coachLastName} onChange={(e) => setCoachLastName(e.target.value)} style={input} />
                </Field>
              </div>

                <Field label="Role">
                  <select value={coachRole} onChange={(e) => setCoachRole(e.target.value as any)} style={input}>
                    {ROLE_PRESETS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Username" hint="This is your login and cannot be edited here.">
                  <input value={email} disabled style={{ ...input, background: "#f8fafc" }} />
                </Field>

                                <Field label="Coach Photo" hint="Paste a URL or upload a file.">
                  <div style={rowGap}>
                    <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} style={input} placeholder="https://..." />

                    <div style={uploadRow}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleCoachPhotoUpload(e.target.files?.[0] ?? null)}
                      />
                      {uploadingCoachPhoto ? (
                        <span style={mutedSmall}>Uploading…</span>
                      ) : photoUrl ? (
                        <span style={{ ...mutedSmall, color: "#047857", fontWeight: 900 }}>Ready</span>
                      ) : (
                        <span style={mutedSmall}>No file uploaded</span>
                      )}
                    </div>

                    {photoUrl ? (
                      <div style={previewBox}>
                        <button type="button" onClick={() => setPhotoUrl("")} style={previewX} aria-label="Remove coach photo">
                          ×
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt="Coach preview" style={previewImg} />
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field
                  label="Contact Email (optional)"
                  hint="If set, this will be the email shown on your public coach profile (instead of your username email)."
                >
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={input}
                    placeholder="coach.recruiting@school.edu"
                    inputMode="email"
                    autoComplete="email"
                  />
                </Field>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <Field label="Phone">
                    <input
                      value={formatPhoneUS(workPhone)}
                      onChange={(e) => setWorkPhone(digitsOnly(e.target.value))}
                      style={input}
                      placeholder="(555) 555-5555"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field label="Ext (optional)">
                    <input
                      value={workPhoneExt}
                      onChange={(e) => setWorkPhoneExt(digitsOnly(e.target.value).slice(0, 6))}
                      style={{ ...input, width: 140 }}
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                    />
                  </Field>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={checkRow}>
                    <input type="checkbox" checked={phonePrivate} onChange={(e) => setPhonePrivate(e.target.checked)} />
                    Hide this number from players
                  </label>
                </div>

                <Field label="Coach X Account (optional)">
                  <input
                    value={coachXUrl}
                    onChange={(e) => setCoachXUrl(e.target.value)}
                    style={input}
                    placeholder="https://x.com/yourhandle"
                  />
                </Field>

                <Field label="Coach Instagram Account (optional)">
                  <input
                    value={coachInstagramUrl}
                    onChange={(e) => setCoachInstagramUrl(e.target.value)}
                    style={input}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </Field>

                <Field label="Coach Bio" hint="Up to 500 words. Shown on your public coach profile.">
                  <div style={{ display: "grid", gap: 6 }}>
                    <textarea
                      value={coachBio}
                      onChange={(e) => setCoachBio(clampToWords(e.target.value, BIO_WORD_LIMIT))}
                      style={textarea}
                      placeholder="Years coaching, background, what you look for, player development focus, etc."
                    />
                    <div style={counterRow}>
                      <span style={mutedSmall}>
                        {coachBioWords}/{BIO_WORD_LIMIT} words
                      </span>
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            {/* Program Profile */}
            <div style={card}>
              <div style={cardTitle}>Program Profile</div>
              <div style={cardSub}>
                This info is shared across your coaching staff and can be edited by all invited coaches.
              </div>

              {programLastEditedAt ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Last edited {formatShortDateTime(programLastEditedAt)}
                  {programLastEditedBy ? ` by ${programLastEditedBy.name || programLastEditedBy.email}` : ""}
                </div>
              ) : (
                <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>No program profile edits yet.</div>
              )}

              <div style={formGrid}>
                <Field label="College / University Name">
                  <input value={collegeName} disabled style={{ ...input, background: "#f8fafc" }} />
                </Field>

                <Field label="College Logo" hint="Paste a URL or upload a file.">
                  <div style={rowGap}>
                    <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} style={input} placeholder="https://..." />

                    <div style={uploadRow}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleCollegeLogoUpload(e.target.files?.[0] ?? null)}
                      />
                      {uploadingCollegeLogo ? (
                        <span style={mutedSmall}>Uploading…</span>
                      ) : logoUrl ? (
                        <span style={{ ...mutedSmall, color: "#047857", fontWeight: 900 }}>Ready</span>
                      ) : (
                        <span style={mutedSmall}>No file uploaded</span>
                      )}
                    </div>

                    {logoUrl ? (
                      <div style={previewBox}>
                        <button type="button" onClick={() => setLogoUrl("")} style={previewX} aria-label="Remove college logo">
                          ×
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt="College logo preview" style={previewImg} />
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field label="Division" hint="Start typing (e.g., NCAA, NAIA, NJCAA) to select a division.">
                  <input
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && !COLLEGE_DIVISION_OPTIONS.includes(v as any)) setDivision("");
                    }}
                    style={input}
                    placeholder="Type or select from the drop-down list"
                    list="college-division-options"
                    autoComplete="off"
                  />
                  <datalist id="college-division-options">
                    {COLLEGE_DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </Field>

                <Field
                  label="Conference"
                  hint={
                    division
                      ? "Start typing to search conferences for the selected division."
                      : "Select a Division first to get conference suggestions (you can still type)."
                  }
                >
                  <input
                    value={conference}
                    onChange={(e) => setConference(e.target.value)}
                    style={input}
                    placeholder="Type or, if Division is set, select from the drop-down list"
                    list={division ? "conference-options" : undefined}
                    autoComplete="off"
                  />
                  {division ? (
                    <datalist id="conference-options">
                      {conferenceOptions.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  ) : null}
                </Field>

                <Field label="College Website">
                  <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} style={input} />
                </Field>

                <Field label="Baseball Program or Athletics Website">
                  <input value={programWebsiteUrl} onChange={(e) => setProgramWebsiteUrl(e.target.value)} style={input} />
                </Field>

                <Field label="Link to Recruiting Questionnaire (optional)">
  <input
    value={recruitingQuestionnaireUrl}
    onChange={(e) => setRecruitingQuestionnaireUrl(e.target.value)}
    style={input}
    placeholder="https://..."
  />
</Field>

<Field label="Program X Account (optional)">
  <input
    value={programXUrl}
    onChange={(e) => setProgramXUrl(e.target.value)}
    style={input}
    placeholder="https://x.com/yourprogram"
  />
</Field>

<Field label="Program Instagram Account (optional)">
  <input
    value={programInstagramUrl}
    onChange={(e) => setProgramInstagramUrl(e.target.value)}
    style={input}
    placeholder="https://instagram.com/yourprogram"
  />
</Field>

                <Field label="Program Bio" hint="Up to 500 words. Shown on your public coach profile.">
                  <div style={{ display: "grid", gap: 6 }}>
                    <textarea
                      value={programBio}
                      onChange={(e) => setProgramBio(clampToWords(e.target.value, BIO_WORD_LIMIT))}
                      style={textarea}
                      placeholder="Accolades, championships, player development approach, facilities, recruiting highlights, etc."
                    />
                    <div style={counterRow}>
                      <span style={mutedSmall}>
                        {programBioWords}/{BIO_WORD_LIMIT} words
                      </span>
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH Recruiting Targets (moved out of Coach Profile card) */}
          <RecruitingTargetsSection
            recruitingTargets={recruitingTargets}
            sortedRecruitingTargets={sortedRecruitingTargets}
            newTargetYear={newTargetYear}
            setNewTargetYear={setNewTargetYear}
            addTargetYear={addTargetYear}
            removeTargetYear={removeTargetYear}
            toggleTargetPosition={toggleTargetPosition}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={save} disabled={saving} style={{ ...btnGold, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Profile"}
            </button>

            {publicCoachUrl ? (
              <a href={publicCoachUrl} target="_blank" rel="noreferrer" style={btnOutline}>
                View Profile
              </a>
            ) : (
              <span style={mutedSmall}>
                Public profile link will appear once your account has a slug. Click Save Profile once, then refresh.
              </span>
            )}

            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              disabled={!publicCoachUrl}
              style={{ ...btnShare, opacity: publicCoachUrl ? 1 : 0.6 }}
              title={!publicCoachUrl ? "Save Profile once to generate your public link." : "Share your coach profile"}
            >
              Share Profile
            </button>

            {okMsg ? <span style={{ ...mutedSmall, color: "#047857", fontWeight: 900 }}>{okMsg}</span> : null}
          </div>

          {shareOpen && publicCoachUrl ? (
            <div style={shareCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Share your Coach Profile</div>
                <button type="button" onClick={() => setShareOpen(false)} style={btnShareClose}>
                  ×
                </button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 220px", gap: 14, alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={mutedSmall}>Share this link with players and families or scan the QR code from a mobile device.</div>

                  <div style={shareLinkBox}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#64748b" }}>Profile Link</div>
                    <div style={{ marginTop: 6, wordBreak: "break-word", fontWeight: 900 }}>{shareUrl}</div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={copyShareLink} style={btnShare}>
                        Copy Link
                      </button>

                      <a href={emailShareHref} style={btnShare} title="Open your email app">
                        Email Link
                      </a>
                    </div>

                    {shareToast ? (
                      <div style={{ marginTop: 8, ...mutedSmall, color: "#047857", fontWeight: 900 }}>{shareToast}</div>
                    ) : null}
                  </div>
                </div>

                <div style={qrWrap}>
                  <QRCodeSVG value={shareUrl} size={180} />
                  <div style={{ marginTop: 8, ...mutedSmall, textAlign: "center" }}>Scan to view</div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

/* -------------------- styles -------------------- */

const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 12,
  minWidth: 0,
};

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  minWidth: 0,
  overflow: "hidden",
};

const cardTitle: CSSProperties = { fontWeight: 900, fontSize: 16 };
const cardSub: CSSProperties = { marginTop: 4, color: "#64748b", fontSize: 13, lineHeight: 1.3 };

const formGrid: CSSProperties = { marginTop: 12, display: "grid", gap: 12 };

const input: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: 140,
  maxHeight: 220,
  overflowY: "auto",
  resize: "vertical",
  fontFamily: "inherit",
  lineHeight: 1.35,
};

const previewBox: CSSProperties = {
  position: "relative",
  width: 64,
  height: 64,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const previewImg: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const previewX: CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "rgba(255,255,255,0.92)",
  color: "#0f172a",
  fontWeight: 900,
  lineHeight: "18px",
  cursor: "pointer",
};

const counterRow: CSSProperties = { display: "flex", justifyContent: "flex-end" };

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnOutline: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
};

const btnOutlineSmall: CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const btnRemoveSmall: CSSProperties = {
  marginLeft: "auto",
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const btnJump: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const labelTiny: CSSProperties = { fontSize: 11, color: "#64748b", fontWeight: 700 };

const targetYearBox: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12 };

const targetsScrollWrap: CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 12,
  maxHeight: 360,
  overflowY: "auto",
  paddingRight: 6,
};

const chipsWrap: CSSProperties = { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" };

const chipOff: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const chipOn: CSSProperties = { ...chipOff, border: "1px solid #caa042", background: "rgba(202,160,66,0.16)" };

const checkRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#0f172a" };

const rowGap: CSSProperties = { display: "grid", gap: 8 };
const uploadRow: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

const muted: CSSProperties = { color: "#64748b", fontSize: 14 };
const mutedSmall: CSSProperties = { color: "#64748b", fontSize: 12, lineHeight: 1.3 };

const errorBox: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 14,
  padding: 14,
};

const btnShare: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const shareCard: CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const btnShareClose: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: "28px",
};

const shareLinkBox: CSSProperties = {
  marginTop: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  padding: 12,
};

const qrWrap: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  display: "grid",
  placeItems: "center",
};

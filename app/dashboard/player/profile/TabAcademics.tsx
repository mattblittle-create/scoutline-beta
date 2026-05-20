// app/dashboard/player/profile/TabAcademics.tsx
"use client";
import React from "react";

/** ---------- Atomic Save Types ---------- */
export type AcademicsPayload = {
  gradYear: string;
  hsName: string;
  hsCity: string;
  hsState: string;
  hsGeneralWebsiteUrl?: string;
  gpa: string;
  gpaScale: "5.0" | "4.0" | "100" | "";
  sat: string;
  act: string;

  // persisted docs
  reportCardUrl?: string | null; // single
  transcriptUrl?: string | null; // optional (we only fill reportCardUrl from the combined slot)

  academicBio: string;
  academicBioPrivate: boolean;

  // Intended majors / areas of study
  areasOfStudy: string[];
};

export type AcademicsHandle = {
  getPayload: () => AcademicsPayload;
};

/** ---------- Props ---------- */
type Props = {
  readOnlyTeamAdmin?: boolean;

  // values
  gradYear: string;
  hsName: string;
  hsCity: string;
  hsState: string;
  hsGeneralWebsiteUrl: string;
  gpa: string;
  gpaScale: "5.0" | "4.0" | "100" | "";
  sat: string;
  act: string;

  // legacy local selection preview (kept for UX)
  academicDocs: File[];
  docUrls: string[];

  // academic bio
  academicBio: string;
  academicBioPrivate: boolean;

  /** Raw text input used to capture multiple majors (comma separated) */
  areasOfStudyInput?: string;

  /** ---------- NEW: persisted doc URLs (wired to public profile) ---------- */
  reportCardUrl: string;
  setReportCardUrl: React.Dispatch<React.SetStateAction<string>>;
  transcriptUrl: string;
  setTranscriptUrl: React.Dispatch<React.SetStateAction<string>>;
  additionalDocs: Array<{ url: string; label?: string | null }>;
  setAdditionalDocs: React.Dispatch<React.SetStateAction<Array<{ url: string; label?: string | null }>>>;

  // errors
  fieldErr: Record<string, string>;
  bioReadOnly?: boolean;
  intendedMajorsReadOnly?: boolean;

  // handlers (legacy)
  setGradYear: (v: string) => void;
  setHsName: (v: string) => void;
  setHsCity: (v: string) => void;
  setHsState: (v: string) => void;
  setHsGeneralWebsiteUrl: (v: string) => void;
  setGpa: (v: string) => void;
  setGpaScale: (v: "5.0" | "4.0" | "100" | "") => void;
  setSat: (v: string) => void;
  setAct: (v: string) => void;
  onPickAcademicDocs: (files: FileList | null) => void; // kept for Selected Documents preview
  removeAcademicDoc: (index: number) => void;
  setAcademicBio: (v: string) => void;
  setAcademicBioPrivate: (v: boolean) => void;

  /** Setter for intended majors input */
  setAreasOfStudyInput?: (v: string) => void; // optional (component falls back to local state)

  // refs
  gradYearRef: React.RefObject<HTMLInputElement | null>;

  // constants/styles from parent (single source of truth)
  US_STATE_ABBRS: readonly string[];
  MAX_BIO_CHARS: number;
  /** Optional limit for majors text; if not provided, defaults to 160 */
  MAX_STUDY_CHARS?: number;
  docAccept: string; // your DOC_ACCEPT

  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  inputStyle: React.CSSProperties;
  textareaStyle: React.CSSProperties;
  hrStyle: React.CSSProperties;
  errText: React.CSSProperties;
  qMark: React.CSSProperties;

  /** ---------- Optional: upload helpers ---------- */
  /**
   * If you already use a userSlug for uploads (like in TabCore), pass it here.
   * We will fall back to ?email=… local-part if not provided.
   */
  userSlug?: string | null;

  /**
   * Legacy: upload endpoint override.
   * NOTE: currently ignored in favor of a hard-coded /api/uploads/local to avoid 404s.
   */
  uploadEndpoint?: string;
};

/** ---------- Component ---------- */
const TabAcademics = React.forwardRef<AcademicsHandle, Props>(function TabAcademics(
  props,
  ref
) {
  const {
    // values
    gradYear,
    hsName,
    hsCity,
    hsState,
    hsGeneralWebsiteUrl,
    gpa,
    gpaScale,
    sat,
    act,
    academicDocs,
    docUrls,
    academicBio,
    academicBioPrivate,
    areasOfStudyInput,

    // persisted doc wiring
    reportCardUrl,
    setReportCardUrl,
    transcriptUrl,
    setTranscriptUrl,
    additionalDocs,
    setAdditionalDocs,

    // errors
    fieldErr,
    bioReadOnly = false,
    intendedMajorsReadOnly = false,

    // handlers
    setGradYear,
    setHsName,
    setHsCity,
    setHsState,
    setHsGeneralWebsiteUrl,
    setGpa,
    setGpaScale,
    setSat,
    setAct,
    onPickAcademicDocs,
    removeAcademicDoc,
    setAcademicBio,
    setAcademicBioPrivate,
    setAreasOfStudyInput,

    // refs
    gradYearRef,

    // constants/styles
    US_STATE_ABBRS,
    MAX_BIO_CHARS,
    MAX_STUDY_CHARS = 160,
    docAccept,
    labelStyle,
    labelText,
    inputStyle,
    textareaStyle,
    hrStyle,
    errText,
    qMark,

    // upload helpers
    userSlug,
    uploadEndpoint,
        readOnlyTeamAdmin = false,
      } = props;

  const academicsLocked = readOnlyTeamAdmin;

  // Use the endpoint passed by the parent; fall back to the cloud/non-local route
  const effectiveEndpoint = uploadEndpoint || "/api/upload/academic";

  // Local label for the single slot so we can show the chosen file name immediately
  const [singleDocLabel, setSingleDocLabel] = React.useState<string>("");

  // Prevent <label> default click-to-input behavior for nested UI (links, buttons)
  const stopLabelActivation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Derive a readable filename from a URL as a fallback (after page reloads)
  function fileNameFromUrl(u?: string | null): string {
    if (!u) return "";
    try {
      const url = new URL(u);
      const last = url.pathname.split("/").pop() || "";
      return decodeURIComponent(last);
    } catch {
      // not a full URL? best-effort parse
      const base = String(u).split(/[?#]/)[0];
      const last = base.split("/").pop() || "";
      try {
        return decodeURIComponent(last);
      } catch {
        return last;
      }
    }
  }

  /** ---------------- Intended Major(s) control ---------------- */
  const [areasText, setAreasText] = React.useState<string>(areasOfStudyInput ?? "");
  React.useEffect(() => {
    if (typeof areasOfStudyInput === "string" && areasOfStudyInput !== areasText) {
      setAreasText(areasOfStudyInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasOfStudyInput]);

  const writeAreas = React.useCallback(
    (v: string) => {
      if (setAreasOfStudyInput) setAreasOfStudyInput(v);
      setAreasText(v);
    },
    [setAreasOfStudyInput]
  );

  const areasInput = areasText;

  // Capitalize first letter of each word (keep internal whitespace collapsed)
  const titleCase = (s: string) =>
    s
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const parseAreas = React.useCallback((raw?: string): string[] => {
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+/g, " ")) // collapse inner whitespace
      .map(titleCase) // Title Case for chips & payload
      .slice(0, 12); // soft cap
  }, []);

  // Expose atomic payload to parent Save Profile button
  React.useImperativeHandle(
    ref,
    () => ({
      getPayload: (): AcademicsPayload => ({
        gradYear,
        hsName,
        hsCity,
        hsState,
        hsGeneralWebsiteUrl,
        gpa,
        gpaScale,
        sat,
        act,
        // docs
        reportCardUrl: reportCardUrl || null,
        transcriptUrl: transcriptUrl || null,
        // bio & majors
        academicBio,
        academicBioPrivate,
        areasOfStudy: parseAreas(areasInput),
      }),
    }),
    [
      gradYear,
      hsName,
      hsCity,
      hsState,
      gpa,
      gpaScale,
      sat,
      act,
      reportCardUrl,
      transcriptUrl,
      academicBio,
      academicBioPrivate,
      areasInput,
      parseAreas,
    ]
  );

  // Derived preview chips for intended majors
  const studyChips = React.useMemo(() => parseAreas(areasInput), [areasInput, parseAreas]);

  // Remove one chip: rebuild the CSV minus that index
  const removeChip = (idx: number) => {
    const arr = parseAreas(areasInput);
    arr.splice(idx, 1);
    writeAreas(arr.join(", "));
  };

  /** ---------------- Upload helpers ---------------- */
  function inferUploadSlug(): string | null {
    if (userSlug && userSlug.trim()) return userSlug.trim();
    // fallback to ?email=local-part
    try {
      const sp = new URLSearchParams(window.location.search);
      const email = (sp.get("email") || "").trim().toLowerCase();
      if (email && email.includes("@")) {
        const local = email.split("@")[0]!;
        return local.replace(/[^a-z0-9]+/g, "-");
      }
    } catch {}
    return null;
  }

  // Upload to the endpoint provided by the parent (production-safe)
  async function uploadFile(file: File): Promise<string> {
    const slug = inferUploadSlug() || "player";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "academic");
    fd.append("userSlug", slug);

    const res = await fetch(effectiveEndpoint, {
      method: "POST",
      body: fd,
    });

    let json: any = {};
    try {
      json = await res.json();
    } catch {}

    if (!res.ok || !json?.ok || !json?.url) {
      console.error("Academic upload failed:", {
        endpoint: effectiveEndpoint,
        status: res.status,
        json,
      });
      throw new Error(json?.error || `Upload failed (HTTP ${res.status})`);
    }

    return String(json.url);
  }

  // Single-slot handler (Report Card / Transcripts)
  async function onPickSingleDoc(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];

    // remember the local filename for display
    setSingleDocLabel(f.name);

    try {
      const url = await uploadFile(f);
      // single slot: per your product spec, we keep one file only
      setReportCardUrl(url);
      // If you eventually want to specifically mark it as transcript instead, also call:
      // setTranscriptUrl?.(url);
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    }
  }

  return (
    <>
      {/* Row 1: Grad Year, High School Name, City, State */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Grad Year</span>
          <input
            ref={gradYearRef}
            disabled={academicsLocked}
            inputMode="numeric"
            pattern="\d*"
            value={gradYear === "0" ? "" : gradYear}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 4);
              setGradYear(next);
            }}
            placeholder={String(new Date().getFullYear())}
            style={inputStyle}
            aria-invalid={!!fieldErr.gradYear}
          />
          {fieldErr.gradYear && <div style={errText}>{fieldErr.gradYear}</div>}
        </label>

        <label style={labelStyle}>
          <span style={labelText}>High School Name</span>
          <input
            value={hsName}
            disabled={academicsLocked}
            onChange={(e) => setHsName(e.target.value)}
            placeholder="Jefferson High School"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>City</span>
          <input
            value={hsCity}
            disabled={academicsLocked}
            onChange={(e) => setHsCity(e.target.value)}
            placeholder="Nashville"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>State</span>
          <input
            list="state-abbrs"
            value={hsState}
            disabled={academicsLocked}
            onChange={(e) => setHsState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="State"
            style={inputStyle}
          />
          <datalist id="state-abbrs">
            {US_STATE_ABBRS.map((abbr) => (
              <option key={abbr} value={abbr} />
            ))}
          </datalist>
        </label>
      </div>

      {/* GPA / Out of… / SAT / ACT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>GPA</span>
          <input
            inputMode="decimal"
            value={gpa}
            disabled={academicsLocked}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="4.0"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Out of…</span>
          <select
            value={gpaScale}
            disabled={academicsLocked}
            onChange={(e) => setGpaScale(e.target.value as any)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            <option value="5.0">5.0</option>
            <option value="4.0">4.0</option>
            <option value="100">100</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>SAT Score</span>
          <input
            inputMode="numeric"
            value={sat}
            disabled={academicsLocked}
            onChange={(e) => setSat(e.target.value)}
            placeholder="1300"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>ACT Score</span>
          <input
            inputMode="numeric"
            value={act}
            disabled={academicsLocked}
            onChange={(e) => setAct(e.target.value)}
            placeholder="28"
            style={inputStyle}
          />
        </label>
      </div>

      {/* Uploads row: single Report Card / Transcripts slot */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 12,
          alignItems: "start",
          marginTop: 12,
        }}
      >
        {/* Single-slot: Report Card / Transcripts */}
        <label style={labelStyle}>
          <span style={labelText}>Upload Report Card / Transcripts</span>

          {/* Row: input + current file on the same line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <input
              type="file"
              disabled={academicsLocked}
              accept={docAccept}
              onChange={(e) => {
                const files = e.currentTarget.files;
                onPickSingleDoc(files);
                // allow selecting the same file again
                e.currentTarget.value = "";
              }}
              style={{
                ...inputStyle,
                width: "auto",
                flexShrink: 0,
              }}
            />

            {/* Current value + clear (× inside; no file dialog on click) */}
            {reportCardUrl ? (
              <div
                // cancel label behavior for any clicks on the chip area
                onMouseDown={stopLabelActivation}
                onClick={stopLabelActivation}
                style={{
                  position: "relative",
                  display: "inline-block",
                  maxWidth: "100%",
                }}
              >
                <a
                  href={reportCardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  // also cancel to be extra safe
                  onMouseDown={stopLabelActivation}
                  onClick={stopLabelActivation}
                  style={{
                    display: "block",
                    textDecoration: "underline",
                    color: "#0f172a",
                    wordBreak: "break-all",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "8px 36px 8px 12px", // room for the ×
                    maxWidth: "100%",
                  }}
                  title={
                    singleDocLabel || fileNameFromUrl(reportCardUrl) || "Open file"
                  }
                >
                  {singleDocLabel ||
                    fileNameFromUrl(reportCardUrl) ||
                    "Open file"}
                </a>

<button
  type="button"
  onMouseDown={stopLabelActivation}
  onClick={(e) => {
    stopLabelActivation(e);
    if (academicsLocked) return;

    setReportCardUrl("");
    setSingleDocLabel("");
    setTranscriptUrl?.("");
  }}
  aria-label="Remove file"
  title={academicsLocked ? "Team Admin cannot remove academic files." : "Remove file"}
  disabled={academicsLocked}
  style={{
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 999,
    border: "1px solid #0ea5e9",
    background: "#ffffff",
    color: "#b91c1c",
    fontWeight: 800,
    lineHeight: "16px",
    cursor: academicsLocked ? "not-allowed" : "pointer",
    opacity: academicsLocked ? 0.6 : 1,
  }}
>
  ×
</button>
              </div>
            ) : (
              <div
                style={{
                  color: "#94a3b8",
                  fontStyle: "italic",
                  marginTop: 2,
                }}
              >
                No file uploaded.
              </div>
            )}
          </div>

          {/* Helper text under the row */}
          <span
            style={{
              color: "#64748b",
              fontSize: 12,
              marginTop: 4,
              display: "block",
            }}
          >
            PDF, Word, or Excel • Only one file allowed here.
          </span>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>High School Website</span>
          <input
            type="url"
            value={hsGeneralWebsiteUrl}
            disabled={academicsLocked}
            onChange={(e) => setHsGeneralWebsiteUrl(e.target.value)}
            placeholder="https://www.yourschool.edu"
            style={inputStyle}
          />
          <span
            style={{
              color: "#64748b",
              fontSize: 12,
              marginTop: 4,
              display: "block",
            }}
          >
            General school website. This will be a clickable link on the public player profile.
          </span>
        </label>
      </div>

      {/* Optional: keep your existing “Selected Documents” chips (local preview only) */}
      {academicDocs.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Selected Documents (local preview)
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {academicDocs.map((f, i) => (
              <span
                key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: "#fff",
                  maxWidth: "100%",
                }}
              >
                <a
                  href={docUrls[i]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 260,
                  }}
                  title={f.name}
                >
                  {f.name}
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => removeAcademicDoc(i)}
                  disabled={academicsLocked}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#64748b",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <hr style={hrStyle} />

{bioReadOnly && (
  <div
    style={{
      marginBottom: 12,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#FF0000",
      fontSize: 13,
      fontWeight: 600,
    }}
  >
    Academic Bio is a player-controlled field and cannot be edited from the parent account.
  </div>
)}

      {/* Academic Bio */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3 style={{ ...labelText, margin: 0 }}>Academic Bio</h3>
        </div>
        <p
          style={{
            color: "#475569",
            marginTop: 4,
            marginBottom: 6,
          }}
        >
          Share academic accolades, interests or prospective majors, study habits,
          community involvement, etc. (max {MAX_BIO_CHARS} characters)
        </p>
        <div>
          <textarea
          disabled={academicsLocked || bioReadOnly}
            value={academicBio}
            onChange={(e) => {
              const v = e.target.value;
              setAcademicBio(v.length <= MAX_BIO_CHARS ? v : v.slice(0, MAX_BIO_CHARS));
            }}
            placeholder="Tell coaches who you are as a student…"
            style={{ ...textareaStyle, width: "100%" }}
            maxLength={MAX_BIO_CHARS}
          />
          <div
            style={{
              marginTop: 4,
              textAlign: "right",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {academicBio.length}/{MAX_BIO_CHARS}
          </div>
        </div>
      </section>

      {/* Intended Major(s) */}
      <section style={{ marginTop: 12 }}>
        
        {intendedMajorsReadOnly ? (
          <div
            style={{
              marginBottom: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#FF0000",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Intended Majors is a player-controlled field and cannot be edited from the parent account.
            </div>
            ) : null}
            
        <h3 style={{ ...labelText, margin: 0 }}>Intended Major(s)</h3>
        <p
          style={{
            color: "#475569",
            marginTop: 4,
            marginBottom: 6,
          }}
        >
          List possible areas of study you’re interested in. Separate with commas (ex.{" "}
          <em>Business, Biology, Sports Medicine, etc.</em>). It's ok if you do not
          know yet. Just leave this area blank. Max {MAX_STUDY_CHARS} characters.
        </p>

        <input
          value={areasInput}
          disabled={academicsLocked || intendedMajorsReadOnly}
          onChange={(e) => {
            if (intendedMajorsReadOnly) return;

            const v = e.target.value;
            const clipped =
              v.length <= MAX_STUDY_CHARS ? v : v.slice(0, MAX_STUDY_CHARS);
            writeAreas(clipped);
          }}
          placeholder="Business, Biology, Sports Medicine, etc."
          style={{
            ...inputStyle,
            width: "100%",
            background: intendedMajorsReadOnly ? "#f8fafc" : inputStyle.background,
            color: intendedMajorsReadOnly ? "#64748b" : inputStyle.color,
            cursor: intendedMajorsReadOnly ? "not-allowed" : "text",
          }}
          maxLength={MAX_STUDY_CHARS}
        />

        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {studyChips.length > 0 ? (
            studyChips.map((chip, idx) => (
              <span
                key={`${chip}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
                title={chip}
              >
                {chip}

                {!intendedMajorsReadOnly ? (
<button
  type="button"
  onClick={() => {
    if (academicsLocked || intendedMajorsReadOnly) return;
    removeChip(idx);
  }}
  disabled={academicsLocked || intendedMajorsReadOnly}
  title={
    academicsLocked || intendedMajorsReadOnly
      ? "Team Admin cannot remove intended majors."
      : `Remove ${chip}`
  }
  aria-label={`Remove ${chip}`}
  style={{
    marginLeft: 4,
    width: 18,
    height: 18,
    lineHeight: "16px",
    borderRadius: 9,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#64748b",
    fontWeight: 800,
    cursor: academicsLocked || intendedMajorsReadOnly ? "not-allowed" : "pointer",
    opacity: academicsLocked || intendedMajorsReadOnly ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  }}
>
  ×
</button>
                ) : null}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: 12,
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              No majors added yet.
            </span>
          )}
        </div>

        <div
          style={{
            marginTop: 4,
            textAlign: "right",
            fontSize: 12,
            color: "#64748b",
          }}
        >
          {areasInput.length}/{MAX_STUDY_CHARS}
        </div>
      </section>
    </>
  );
});

export default TabAcademics;

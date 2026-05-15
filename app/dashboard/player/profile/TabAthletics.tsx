// app/dashboard/player/profile/TabAthletics.tsx
"use client";
import React from "react";

type CollegeOption = { id: string; name: string };
type OtherTeam = {
  id: string;
  name: string;
  city: string;
  state: string;
  scheduleUrl: string;
  websiteUrl: string;
};

/** ---------- Atomic Save Types ---------- */
export type AthleticsPayload = {
  eligibilityRegistered: boolean;
  /** When eligibilityRegistered is true, optionally collect governing body IDs */
  ncaaId: string | null;   // 10-digit numeric ID from NCAA Eligibility Center
  naiaEcid: string | null; // ECID from NAIA Eligibility Center (format varies)

  isCommitted: boolean;
  committedProgram: string;
  committedProgramId: string | null;

  primaryPos: string;
  secondaryPos: string;
  isPitcher: "" | "Yes" | "No";
  pitcherHand: "" | "RHP" | "LHP";
  throwsHand: "" | "R" | "L" | "S";
  batsSide: "" | "R" | "L" | "S";

  hsName: string;
  hsCity: string;
  hsState: string;
  hsScheduleUrl: string;
  hsWebsiteUrl: string;
  hsSchedulePrivate: boolean;

  travelTeamName: string;
  travelTeamCity: string;
  travelTeamState: string;
  travelTeamScheduleUrl: string;
  travelTeamWebsiteUrl: string;
  travelTeamSchedulePrivate: boolean;

  otherTeams: OtherTeam[];

  playerBio: string;
  playerBioPrivate: boolean;
};

export type AthleticsHandle = { getPayload: () => AthleticsPayload };

/** ---------- Props ---------- */
type Props = {
  // values
  eligibilityRegistered: boolean;

  /** Governing body IDs (raw strings for UI; sanitize/normalize here) */
  ncaaId: string;     // numeric string; we constrain to 10 digits
  naiaEcid: string;   // free-form for now

  isCommitted: boolean;
  committedProgram: string;
  committedProgramId: string | null;
  collegeOptions: CollegeOption[];
  collegeSearching: boolean;

  primaryPos: string;
  secondaryPos: string;
  isPitcher: "" | "Yes" | "No";
  pitcherHand: "" | "RHP" | "LHP";
  throwsHand: "" | "R" | "L" | "S";
  batsSide: "" | "R" | "L" | "S";

  hsName: string;
  hsCity: string;
  hsState: string;
  hsScheduleUrl: string;
  hsWebsiteUrl: string;
  hsSchedulePrivate: boolean;

  travelTeamName: string;
  travelTeamCity: string;
  travelTeamState: string;
  travelTeamScheduleUrl: string;
  travelTeamWebsiteUrl: string;
  travelTeamSchedulePrivate: boolean;

  otherTeams: OtherTeam[];

  playerBio: string;
  playerBioPrivate: boolean;

  // UI / validation
  fieldErr: Record<string, string>;
  showPitcherHand: boolean;
  commitmentReadOnly?: boolean;
  playerBioReadOnly?: boolean;

  // handlers
  setEligibilityRegistered: (v: boolean) => void;
  setNcaaId: (v: string) => void;
  setNaiaEcid: (v: string) => void;

  setIsCommitted: (v: boolean) => void;
  setCommittedProgram: (v: string) => void;
  setCommittedProgramId: (v: string | null) => void;
  setCollegeOptions: (v: CollegeOption[]) => void;

  setPrimaryPos: (v: string) => void;
  setSecondaryPos: (v: string) => void;
  setIsPitcher: (v: "" | "Yes" | "No") => void;
  setPitcherHand: (v: "" | "RHP" | "LHP") => void;
  setThrowsHand: (v: "" | "R" | "L" | "S") => void;
  setBatsSide: (v: "" | "R" | "L" | "S") => void;

  setHsName: (v: string) => void;
  setHsCity: (v: string) => void;
  setHsState: (v: string) => void;
  setHsScheduleUrl: (v: string) => void;
  setHsWebsiteUrl: (v: string) => void;
  setHsSchedulePrivate: (v: boolean) => void;

  setTravelTeamName: (v: string) => void;
  setTravelTeamCity: (v: string) => void;
  setTravelTeamState: (v: string) => void;
  setTravelTeamScheduleUrl: (v: string) => void;
  setTravelTeamWebsiteUrl: (v: string) => void;
  setTravelTeamSchedulePrivate: (v: boolean) => void;

  addOtherTeam: () => void;
  updateOtherTeam: (id: string, patch: Partial<OtherTeam>) => void;
  removeOtherTeam: (id: string) => void;

  setPlayerBio: (v: string) => void;
  setPlayerBioPrivate: (v: boolean) => void;

  // helpers/constants from parent (single source of truth)
  isLikelyUrl: (v: string) => boolean;
  US_STATE_ABBRS: readonly string[];
  POS_OPTIONS: readonly string[];
  SECONDARY_OPTIONS: readonly string[];
  THROWS_OPTIONS: readonly string[];
  BATS_OPTIONS: readonly string[];
  YES_NO: readonly string[];
  PITCHER_HAND: readonly string[];

  MAX_BIO_CHARS: number;

  // shared styles
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  inputStyle: React.CSSProperties;
  textareaStyle: React.CSSProperties;
  hrStyle: React.CSSProperties;
  errText: React.CSSProperties;
  qMark: React.CSSProperties;
};

/** Helpers */
const onlyDigits = (v: string) => v.replace(/\D+/g, "");
const isTenDigits = (v: string) => /^\d{10}$/.test(v);

/** ---------- Component ---------- */
const TabAthletics = React.forwardRef<AthleticsHandle, Props>(function TabAthletics(props, ref) {
  const {
    // values
    eligibilityRegistered,
    ncaaId,
    naiaEcid,
    isCommitted,
    committedProgram,
    committedProgramId,
    collegeOptions,
    collegeSearching,

    primaryPos,
    secondaryPos,
    isPitcher,
    pitcherHand,
    throwsHand,
    batsSide,

    hsName,
    hsCity,
    hsState,
    hsScheduleUrl,
    hsWebsiteUrl,
    hsSchedulePrivate,

    travelTeamName,
    travelTeamCity,
    travelTeamState,
    travelTeamScheduleUrl,
    travelTeamWebsiteUrl,
    travelTeamSchedulePrivate,

    otherTeams,

    playerBio,
    playerBioPrivate,

    // UI / validation
    fieldErr,
    showPitcherHand,
    commitmentReadOnly = false,
    playerBioReadOnly = false,

    // handlers
    setEligibilityRegistered,
    setNcaaId,
    setNaiaEcid,
    setIsCommitted,
    setCommittedProgram,
    setCommittedProgramId,
    setCollegeOptions,
    setPrimaryPos,
    setSecondaryPos,
    setIsPitcher,
    setPitcherHand,
    setThrowsHand,
    setBatsSide,
    setHsName,
    setHsCity,
    setHsState,
    setHsScheduleUrl,
    setHsWebsiteUrl,
    setHsSchedulePrivate,
    setTravelTeamName,
    setTravelTeamCity,
    setTravelTeamState,
    setTravelTeamScheduleUrl,
    setTravelTeamWebsiteUrl,
    setTravelTeamSchedulePrivate,
    addOtherTeam,
    updateOtherTeam,
    removeOtherTeam,
    setPlayerBio,
    setPlayerBioPrivate,

    // helpers/constants
    isLikelyUrl,
    US_STATE_ABBRS,
    POS_OPTIONS,
    SECONDARY_OPTIONS,
    THROWS_OPTIONS,
    BATS_OPTIONS,
    YES_NO,
    PITCHER_HAND,
    MAX_BIO_CHARS,

    // styles
    labelStyle,
    labelText,
    inputStyle,
    textareaStyle,
    hrStyle,
    errText,
    qMark,
  } = props;

  // Expose atomic payload to parent Save Profile button
  React.useImperativeHandle(
    ref,
    (): AthleticsHandle => ({
      getPayload: () => {
        const hsWebsiteClean = (hsWebsiteUrl ?? "").trim();
        const hsScheduleClean = (hsScheduleUrl ?? "").trim();
        const travelWebsiteClean = (travelTeamWebsiteUrl ?? "").trim();
        const travelScheduleClean = (travelTeamScheduleUrl ?? "").trim();

        return {
          eligibilityRegistered,
          ncaaId:
            eligibilityRegistered && (ncaaId ?? "").trim()
              ? (ncaaId ?? "").trim()
              : null,
          naiaEcid:
            eligibilityRegistered && (naiaEcid ?? "").trim()
              ? (naiaEcid ?? "").trim()
              : null,

          isCommitted,
          committedProgram,
          committedProgramId,

          primaryPos,
          secondaryPos,
          isPitcher,
          pitcherHand,
          throwsHand,
          batsSide,

          hsName,
          hsCity,
          hsState,
          hsScheduleUrl,
          // 🔁 WEBSITE FALLBACK: if website is blank, mirror the schedule URL
          hsWebsiteUrl: hsWebsiteClean || hsScheduleClean,
          hsSchedulePrivate,

          travelTeamName,
          travelTeamCity,
          travelTeamState,
          travelTeamScheduleUrl,
          // 🔁 WEBSITE FALLBACK: same for travel team
          travelTeamWebsiteUrl: travelWebsiteClean || travelScheduleClean,
          travelTeamSchedulePrivate,

          otherTeams,

          playerBio,
          playerBioPrivate,
        };
      },
    }),
    [
      eligibilityRegistered,
      ncaaId,
      naiaEcid,
      isCommitted,
      committedProgram,
      committedProgramId,
      primaryPos,
      secondaryPos,
      isPitcher,
      pitcherHand,
      throwsHand,
      batsSide,
      hsName,
      hsCity,
      hsState,
      hsScheduleUrl,
      hsWebsiteUrl,
      hsSchedulePrivate,
      travelTeamName,
      travelTeamCity,
      travelTeamState,
      travelTeamScheduleUrl,
      travelTeamWebsiteUrl,
      travelTeamSchedulePrivate,
      otherTeams,
      playerBio,
      playerBioPrivate,
    ]
  );

  // --- NCAA / NAIA UI helpers (null-safe) ---
  const ncaaIdSafe = ncaaId ?? "";
  const naiaEcidSafe = naiaEcid ?? "";

  const ncaaHasValue = ncaaIdSafe.trim().length > 0;
  const ncaaIsValid = !ncaaHasValue || isTenDigits(ncaaIdSafe.trim()); // NCAA = exactly 10 digits

  const hsWebsiteSafe = hsWebsiteUrl ?? "";
  const travelWebsiteSafe = travelTeamWebsiteUrl ?? "";

  return (
    <>
      {/* Eligibility registration + IDs UNDER the line */}
      <section style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={eligibilityRegistered}
            onChange={(e) => setEligibilityRegistered(e.target.checked)}
          />
          <span style={{ color: "#0f172a", fontWeight: 700 }}>
            Have you registered with the{" "}
            <a
              href="https://web3.ncaa.org/ecwr3/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline", color: "#0f172a" }}
            >
              NCAA
            </a>{" "}
            and{" "}
            <a
              href="https://play.mynaia.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline", color: "#0f172a" }}
            >
              NAIA
            </a>{" "}
            eligibility centers?
          </span>
        </label>

        {eligibilityRegistered && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {/* NCAA ID (10 digits) */}
              <label style={labelStyle}>
                <span style={labelText}>NCAA ID#</span>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  value={ncaaIdSafe}
                  onChange={(e) => {
                    const digits = onlyDigits(e.target.value).slice(0, 10);
                    setNcaaId(digits);
                  }}
                  placeholder="Input NCAA ID"
                  style={{
                    ...inputStyle,
                    borderColor: ncaaIsValid ? "#e5e7eb" : "#ef4444",
                  }}
                  aria-invalid={!ncaaIsValid}
                />
                {!ncaaIsValid && (
                  <div style={{ ...errText, marginTop: 4 }}>
                    NCAA ID must be exactly 10 digits.
                  </div>
                )}
              </label>

              {/* NAIA ECID (free-form for now) */}
              <label style={labelStyle}>
                <span style={labelText}>NAIA ECID#</span>
                <input
                  value={naiaEcidSafe}
                  onChange={(e) => setNaiaEcid(e.target.value)}
                  placeholder="Input NAIA Eligibility Center ID"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <div></div>

      {/* College commitment */}
      {commitmentReadOnly && (
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
          Commitment status is a player-controlled field and cannot be edited from the parent account.
        </div>
      )}
      <section style={{ margin: "8px 0 0 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={isCommitted}
            disabled={commitmentReadOnly}
            onChange={(e) => {
              if (commitmentReadOnly) return;

              const checked = e.target.checked;
              setIsCommitted(checked);

              if (!checked) {
                setCommittedProgram("");
                setCommittedProgramId(null);
                setCollegeOptions([]);
              }
            }}
          />
          <span style={{ color: "#0f172a", fontWeight: 700 }}>
            Are you committed to play college athletics?
          </span>
        </label>

        {isCommitted && (
          <div style={{ marginTop: 8 }}>
            <label style={labelStyle}>
              <span style={labelText}>Committed Program</span>

              {/* Free-text input + optional suggestion menu */}
              <div style={{ position: "relative" }}>
                <input
                  disabled={commitmentReadOnly}
                  value={committedProgram}
                  onChange={(e) => {
                    if (commitmentReadOnly) return;
                    setCommittedProgram(e.target.value);
                    setCommittedProgramId(null);
                  }}
                  placeholder="Start typing a college name…"
                  style={inputStyle}
                  aria-invalid={!!fieldErr.committedProgram}
                  aria-autocomplete="list"
                  aria-expanded={!!collegeOptions?.length}
                />

                {(collegeSearching || (collegeOptions && collegeOptions.length > 0)) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 8,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                    role="listbox"
                  >
                    {collegeSearching && (
                      <div style={{ padding: 10, fontSize: 12, color: "#64748b" }}>
                        Searching…
                      </div>
                    )}

                      {!collegeSearching &&
                        (collegeOptions || []).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            disabled={commitmentReadOnly}
                            onClick={() => {
                              if (commitmentReadOnly) return;

                              setCommittedProgram(opt.name);
                              setCommittedProgramId(opt.id);
                            }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 10px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {opt.name}
                        </button>
                      ))}
                  </div>
                )}

                {!collegeSearching &&
                  (!collegeOptions || collegeOptions.length === 0) &&
                  committedProgram.trim() && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                      No matches — we’ll save exactly what you typed.
                    </div>
                  )}
              </div>

              {fieldErr.committedProgram && <div style={errText}>{fieldErr.committedProgram}</div>}
            </label>
          </div>
        )}
      </section>

      <hr style={hrStyle} />

      {/* Positions / Pitcher? */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Primary Position</span>
          <select
            value={primaryPos}
            onChange={(e) => setPrimaryPos(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {POS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Secondary Position</span>
          <select
            value={secondaryPos}
            onChange={(e) => setSecondaryPos(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {SECONDARY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Pitcher?</span>
          <select
            value={isPitcher}
            onChange={(e) => setIsPitcher(e.target.value as "" | "Yes" | "No")}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {YES_NO.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {showPitcherHand && (
          <label style={labelStyle}>
            <span style={labelText}>Pitcher Handedness</span>
            <select
              value={pitcherHand}
              onChange={(e) => setPitcherHand(e.target.value as "" | "RHP" | "LHP")}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {PITCHER_HAND.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <hr style={hrStyle} />

      {/* Throws / Bats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Throws</span>
          <select
            value={throwsHand}
            onChange={(e) => setThrowsHand(e.target.value as "" | "R" | "L" | "S")}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {THROWS_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Bats</span>
          <select
            value={batsSide}
            onChange={(e) => setBatsSide(e.target.value as "" | "R" | "L" | "S")}
            style={inputStyle}
          >
            <option value="">Select…</option>
            {BATS_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr style={hrStyle} />

      {/* High School Team */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>High School Team Name</span>
          <input
            value={hsName}
            onChange={(e) => setHsName(e.target.value)}
            placeholder="Jefferson High School"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>City</span>
          <input
            value={hsCity}
            onChange={(e) => setHsCity(e.target.value)}
            placeholder="Nashville"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>State</span>
          <input
            list="state-abbrs-ath-hs"
            value={hsState}
            onChange={(e) => setHsState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="State"
            style={inputStyle}
          />
          <datalist id="state-abbrs-ath-hs">
            {US_STATE_ABBRS.map((abbr) => (
              <option key={abbr} value={abbr} />
            ))}
          </datalist>
        </label>
      </div>

      {/* HS Game Schedule Link */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>
          <span style={labelText}>HS Game Schedule Link</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="url"
              value={hsScheduleUrl}
              onChange={(e) => setHsScheduleUrl(e.target.value)}
              placeholder="https://example.com/your-team/schedule"
              style={{ ...inputStyle, flex: "1 1 auto" }}
              aria-invalid={!!fieldErr.hsScheduleUrl}
            />
          </div>

          {!isLikelyUrl(hsScheduleUrl ?? "") &&
            (hsScheduleUrl ?? "").trim() && (
              <div style={errText}>Enter a valid URL starting with http:// or https://</div>
            )}

          {isLikelyUrl(hsScheduleUrl ?? "") && (
            <div style={{ marginTop: 8 }}>
              <span
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
                  href={hsScheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 360,
                  }}
                  title={hsScheduleUrl}
                >
                  {hsScheduleUrl}
                </a>
                <button
                  type="button"
                  aria-label="Remove schedule link"
                  onClick={() => setHsScheduleUrl("")}
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
            </div>
          )}
        </label>
      </div>

      {/* HS Team Website */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>
          <span style={labelText}>HS Team Website</span>
          <input
            type="url"
            value={hsWebsiteSafe}
            onChange={(e) => setHsWebsiteUrl(e.target.value)}
            placeholder="https://example.com/your-team"
            style={inputStyle}
          />

          {!isLikelyUrl(hsWebsiteSafe) && hsWebsiteSafe.trim() && (
            <div style={errText}>Enter a valid URL starting with http:// or https://</div>
          )}

          {isLikelyUrl(hsWebsiteSafe) && (
            <div style={{ marginTop: 8 }}>
              <span
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
                  href={hsWebsiteSafe}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 360,
                  }}
                  title={hsWebsiteSafe}
                >
                  {hsWebsiteSafe}
                </a>
                <button
                  type="button"
                  aria-label="Remove HS website link"
                  onClick={() => setHsWebsiteUrl("")}
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
            </div>
          )}
        </label>
      </div>

      <hr style={hrStyle} />

      {/* Travel Team */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Travel Team Name</span>
          <input
            value={travelTeamName}
            onChange={(e) => setTravelTeamName(e.target.value)}
            placeholder="Example Baseball Club 17U"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>City</span>
          <input
            value={travelTeamCity}
            onChange={(e) => setTravelTeamCity(e.target.value)}
            placeholder="Nashville"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>State</span>
          <input
            list="state-abbrs-ath"
            value={travelTeamState}
            onChange={(e) => setTravelTeamState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="State"
            style={inputStyle}
          />
          <datalist id="state-abbrs-ath">
            {US_STATE_ABBRS.map((abbr) => (
              <option key={abbr} value={abbr} />
            ))}
          </datalist>
        </label>
      </div>

      {/* Travel Team schedule link + Private */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>
          <span style={labelText}>Travel Team Game Schedule Link</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="url"
              value={travelTeamScheduleUrl}
              onChange={(e) => setTravelTeamScheduleUrl(e.target.value)}
              placeholder="https://example.com/travel-team/schedule"
              style={{ ...inputStyle, flex: "1 1 auto" }}
              aria-invalid={!!fieldErr.travelTeamScheduleUrl}
            />
          </div>

          {!isLikelyUrl(travelTeamScheduleUrl ?? "") &&
            (travelTeamScheduleUrl ?? "").trim() && (
              <div style={errText}>Enter a valid URL starting with http:// or https://</div>
            )}

          {isLikelyUrl(travelTeamScheduleUrl ?? "") && (
            <div style={{ marginTop: 8 }}>
              <span
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
                  href={travelTeamScheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 360,
                  }}
                  title={travelTeamScheduleUrl}
                >
                  {travelTeamScheduleUrl}
                </a>
                <button
                  type="button"
                  aria-label="Remove travel team schedule link"
                  onClick={() => setTravelTeamScheduleUrl("")}
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
            </div>
          )}
        </label>
      </div>

      {/* Travel Team Website */}
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>
          <span style={labelText}>Travel Team Website</span>
          <input
            type="url"
            value={travelWebsiteSafe}
            onChange={(e) => setTravelTeamWebsiteUrl(e.target.value)}
            placeholder="https://example.com/travel-team"
            style={inputStyle}
          />

          {!isLikelyUrl(travelWebsiteSafe) && travelWebsiteSafe.trim() && (
            <div style={errText}>Enter a valid URL starting with http:// or https://</div>
          )}

          {isLikelyUrl(travelWebsiteSafe) && (
            <div style={{ marginTop: 8 }}>
              <span
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
                  href={travelWebsiteSafe}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "underline",
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 360,
                  }}
                  title={travelWebsiteSafe}
                >
                  {travelWebsiteSafe}
                </a>
                <button
                  type="button"
                  aria-label="Remove travel team website link"
                  onClick={() => setTravelTeamWebsiteUrl("")}
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
            </div>
          )}
        </label>
      </div>

      <hr style={hrStyle} />

      {/* Add Another Team */}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={addOtherTeam}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #0ea5e9",
            background: "#e0f2fe",
            color: "#0f172a",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Add Another Team
        </button>
      </div>

      {/* Render Other Teams */}
      {otherTeams.length > 0 && (
        <section style={{ marginTop: 16 }}>
          {otherTeams.map((team, idx) => {
            const websiteSafe = team.websiteUrl ?? "";
            return (
              <div
                key={team.id}
                style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #e5e7eb" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ ...labelText }}>Other Team #{idx + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeOtherTeam(team.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #0ea5e9",
                      background: "#ffffff",
                      color: "#b91c1c",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Remove This Team
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                    gap: 12,
                  }}
                >
                  <label style={labelStyle}>
                    <span style={labelText}>Other Team Name</span>
                    <input
                      value={team.name}
                      onChange={(e) => updateOtherTeam(team.id, { name: e.target.value })}
                      placeholder="Another Organization 17U"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelText}>City</span>
                    <input
                      value={team.city}
                      onChange={(e) => updateOtherTeam(team.id, { city: e.target.value })}
                      placeholder="Memphis"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelText}>State</span>
                    <input
                      list="state-abbrs-ath-other"
                      value={team.state}
                      onChange={(e) =>
                        updateOtherTeam(team.id, {
                          state: e.target.value.toUpperCase().slice(0, 2),
                        })
                      }
                      placeholder="State"
                      style={inputStyle}
                    />
                    <datalist id="state-abbrs-ath-other">
                      {US_STATE_ABBRS.map((abbr) => (
                        <option key={abbr} value={abbr} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>
                    <span style={labelText}>Other Team Game Schedule Link</span>
                    <input
                      type="url"
                      value={team.scheduleUrl}
                      onChange={(e) => updateOtherTeam(team.id, { scheduleUrl: e.target.value })}
                      placeholder="https://example.com/other-team/schedule"
                      style={inputStyle}
                    />

                    {!isLikelyUrl(team.scheduleUrl ?? "") &&
                      (team.scheduleUrl ?? "").trim() && (
                        <div style={errText}>
                          Enter a valid URL starting with http:// or https://
                        </div>
                      )}

                    {isLikelyUrl(team.scheduleUrl ?? "") && (
                      <div style={{ marginTop: 8 }}>
                        <span
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
                            href={team.scheduleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: "underline",
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 360,
                            }}
                            title={team.scheduleUrl}
                          >
                            {team.scheduleUrl}
                          </a>
                          <button
                            type="button"
                            aria-label="Remove other team schedule link"
                            onClick={() => updateOtherTeam(team.id, { scheduleUrl: "" })}
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
                      </div>
                    )}
                  </label>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>
                    <span style={labelText}>Other Team Website</span>
                    <input
                      type="url"
                      value={websiteSafe}
                      onChange={(e) =>
                        updateOtherTeam(team.id, { websiteUrl: e.target.value })
                      }
                      placeholder="https://example.com/other-team"
                      style={inputStyle}
                    />

                    {!isLikelyUrl(websiteSafe) && websiteSafe.trim() && (
                      <div style={errText}>
                        Enter a valid URL starting with http:// or https://
                      </div>
                    )}

                    {isLikelyUrl(websiteSafe) && (
                      <div style={{ marginTop: 8 }}>
                        <span
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
                            href={websiteSafe}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: "underline",
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 360,
                            }}
                            title={websiteSafe}
                          >
                            {websiteSafe}
                          </a>
                          <button
                            type="button"
                            aria-label="Remove other team website link"
                            onClick={() => updateOtherTeam(team.id, { websiteUrl: "" })}
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
                      </div>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Player Bio */}
      <hr style={hrStyle} />

      {playerBioReadOnly && (
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
          Player Bio is a player-controlled field and cannot be edited from the parent account.
        </div>
      )}

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3 style={{ ...labelText, margin: 0 }}>Player Bio</h3>
        </div>

        <p style={{ color: "#475569", marginTop: 4, marginBottom: 6 }}>
          Share athletic accolades, training/workout habits, nutrition, leadership, and
          anything else that helps coaches get to know you. (max {MAX_BIO_CHARS}{" "}
          characters)
        </p>

        <div>
          <textarea
            disabled={playerBioReadOnly}
            value={playerBio}
            onChange={(e) => {
              const v = e.target.value;
              setPlayerBio(
                v.length <= MAX_BIO_CHARS
                  ? v
                  : v.slice(0, MAX_BIO_CHARS)
              );
            }}
            placeholder="Tell coaches about your athletic journey…"
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
            {playerBio.length}/{MAX_BIO_CHARS}
          </div>
        </div>
      </section>
    </>
  );
});

export default TabAthletics;

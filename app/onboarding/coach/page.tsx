// app/onboarding/coach/page.tsx

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type CollegeOption = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  division?: string | null;
  conference?: string | null;
  baseballProgramId?: string | null;
  activeCoachCount?: number;
};

type MatchedCoach = {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  bioUrl?: string | null;
  headshotUrl?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  isHeadCoach?: boolean;
  claimed?: boolean;
  dataSource?: string | null;
  manuallyVerifiedAt?: string | null;
};

function norm(value: unknown) {
  return String(value ?? "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D+/g, "");
}

function formatPhoneUS(input: unknown) {
  const digits = digitsOnly(input).slice(0, 10);

  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function splitName(fullName: string) {
  const parts = norm(fullName)
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function isStaffTitle(value: unknown): value is StaffTitle {
  return ROLE_PRESETS.includes(value as StaffTitle);
}

function collegeLocation(college: CollegeOption) {
  return [college.city, college.state]
    .filter(Boolean)
    .join(", ");
}

function collegeProgramDetails(college: CollegeOption) {
  return [college.division, college.conference]
    .filter(Boolean)
    .join(" • ");
}

function CoachOnboardingPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const emailFromQuery = norm(search.get("email"));

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");

  const [role, setRole] = React.useState<StaffTitle | "">("");

  const [collegeQuery, setCollegeQuery] = React.useState("");
  const [collegeResults, setCollegeResults] = React.useState<
    CollegeOption[]
  >([]);
  const [selectedCollege, setSelectedCollege] =
    React.useState<CollegeOption | null>(null);

  const [collegeSearchLoading, setCollegeSearchLoading] =
    React.useState(false);
  const [collegeSearchOpen, setCollegeSearchOpen] =
    React.useState(false);

  const [matchedCoach, setMatchedCoach] =
    React.useState<MatchedCoach | null>(null);
  const [coachMatchType, setCoachMatchType] =
    React.useState<"EMAIL" | "NAME" | null>(null);
  const [coachResolveLoading, setCoachResolveLoading] =
    React.useState(false);
  const [coachResolveCompleted, setCoachResolveCompleted] =
    React.useState(false);

  const [workEmail, setWorkEmail] =
    React.useState(emailFromQuery);
  const [workPhone, setWorkPhone] = React.useState("");
  const [workPhoneExt, setWorkPhoneExt] =
    React.useState("");
  const [phonePrivate, setPhonePrivate] =
    React.useState(true);

  const [submitting, setSubmitting] =
    React.useState(false);
  const [error, setError] =
    React.useState<string | null>(null);
  const [okMsg, setOkMsg] =
    React.useState<string | null>(null);
  const [needsSetPassword, setNeedsSetPassword] =
    React.useState(false);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  React.useEffect(() => {
    if (emailFromQuery) {
      setWorkEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  React.useEffect(() => {
    if (selectedCollege) {
      setCollegeResults([]);
      setCollegeSearchOpen(false);
      return;
    }

    const query = collegeQuery.trim();

    if (query.length < 2) {
      setCollegeResults([]);
      setCollegeSearchOpen(false);
      setCollegeSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setCollegeSearchLoading(true);

        const res = await fetch(
          `/api/onboarding/coach/resolve?q=${encodeURIComponent(
            query
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error || "Could not search colleges."
          );
        }

        const colleges = Array.isArray(
          json?.data?.colleges
        )
          ? json.data.colleges
          : [];

        setCollegeResults(colleges);
        setCollegeSearchOpen(true);
      } catch (err: any) {
        if (cancelled) return;

        setCollegeResults([]);
        setCollegeSearchOpen(false);
        setError(
          err?.message || "Could not search colleges."
        );
      } finally {
        if (!cancelled) {
          setCollegeSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [collegeQuery, selectedCollege]);

  React.useEffect(() => {
    if (!selectedCollege?.id) {
      setMatchedCoach(null);
      setCoachMatchType(null);
      setCoachResolveCompleted(false);
      return;
    }

    const email = workEmail.trim().toLowerCase();
    const name = fullName;

    if (!email && !name) {
      setMatchedCoach(null);
      setCoachMatchType(null);
      setCoachResolveCompleted(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setCoachResolveLoading(true);
        setCoachResolveCompleted(false);

        const res = await fetch(
          "/api/onboarding/coach/resolve",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              collegeId: selectedCollege.id,
              email,
              name,
            }),
          }
        );

        const json = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error ||
              "Could not check existing coach records."
          );
        }

        const nextMatch =
          json?.data?.matchedCoach || null;
        const nextMatchType =
          json?.data?.matchType || null;

        setMatchedCoach(nextMatch);
        setCoachMatchType(nextMatchType);
        setCoachResolveCompleted(true);

        if (nextMatch) {
          const split = splitName(nextMatch.name);

          if (split.firstName) {
            setFirstName(split.firstName);
          }

          if (split.lastName) {
            setLastName(split.lastName);
          }

          if (
            nextMatch.title &&
            isStaffTitle(nextMatch.title)
          ) {
            setRole(nextMatch.title);
          }

          if (nextMatch.email) {
            setWorkEmail(
              String(nextMatch.email)
                .trim()
                .toLowerCase()
            );
          }

          const matchedPhone = digitsOnly(
            nextMatch.phone
          ).slice(0, 10);

          if (matchedPhone.length === 10) {
            setWorkPhone(matchedPhone);
          }
        }
      } catch (err: any) {
        if (cancelled) return;

        setMatchedCoach(null);
        setCoachMatchType(null);
        setCoachResolveCompleted(true);
        setError(
          err?.message ||
            "Could not check existing coach records."
        );
      } finally {
        if (!cancelled) {
          setCoachResolveLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    selectedCollege?.id,
    workEmail,
    fullName,
  ]);

  const firstOk = Boolean(firstName.trim());
  const lastOk = Boolean(lastName.trim());
  const roleOk = Boolean(role);
  const collegeOk = Boolean(selectedCollege?.id);

  const emailOk = (() => {
    const email = workEmail.trim().toLowerCase();
    return Boolean(email) && isEmail(email);
  })();

const phoneDigits = digitsOnly(workPhone).slice(0, 10);

const phoneOk =
  phoneDigits.length === 0 ||
  phoneDigits.length === 10;

  const canSubmit =
    firstOk &&
    lastOk &&
    roleOk &&
    collegeOk &&
    emailOk &&
    phoneOk &&
    !submitting;

  function clearSelectedCollege() {
    setSelectedCollege(null);
    setCollegeQuery("");
    setCollegeResults([]);
    setCollegeSearchOpen(false);
    setMatchedCoach(null);
    setCoachMatchType(null);
    setCoachResolveCompleted(false);
    setError(null);
  }

  function selectCollege(college: CollegeOption) {
    setSelectedCollege(college);
    setCollegeQuery(college.name);
    setCollegeResults([]);
    setCollegeSearchOpen(false);
    setMatchedCoach(null);
    setCoachMatchType(null);
    setCoachResolveCompleted(false);
    setError(null);
  }

  async function onSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError(null);
    setOkMsg(null);
    setNeedsSetPassword(false);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const name = `${fn} ${ln}`.trim();
    const selectedRole = String(role || "").trim();
    const email = workEmail.trim().toLowerCase();
    const phone = digitsOnly(workPhone).slice(0, 10);
    const extension = digitsOnly(
      workPhoneExt
    ).slice(0, 6);

    if (!fn) {
      return setError("First name is required.");
    }

    if (!ln) {
      return setError("Last name is required.");
    }

    if (!selectedRole) {
      return setError("Role is required.");
    }

    if (!selectedCollege?.id) {
      return setError(
        "Please select a college from the search results."
      );
    }

    if (!email) {
      return setError("Email is required.");
    }

    if (!isEmail(email)) {
      return setError(
        "Email must be a valid email address."
      );
    }

if (phone.length > 0 && phone.length !== 10) {
  return setError(
    "Phone must be 10 digits when provided."
  );
}

    if (matchedCoach?.claimed) {
      return setError(
        "This coach record has already been claimed by another ScoutLine account."
      );
    }

    try {
      setSubmitting(true);

      const res = await fetch(
        "/api/onboarding/coach",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            name,
            role: selectedRole,
            collegeId: selectedCollege.id,
            coachRecordId:
              matchedCoach?.id || null,
            workEmail: email,
            workPhone: phone,
            workPhoneExt: extension,
            phonePrivate,
          }),
        }
      );

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || `Failed (${res.status})`
        );
      }

      const needs = Boolean(
        json?.data?.needsSetPassword
      );

      if (needs) {
        setNeedsSetPassword(true);
        setOkMsg(
          `You’re almost done — set your password using the link we sent to ${email}. Once set, come back and log in.`
        );
        return;
      }

      setOkMsg("Saved! Redirecting…");

      window.setTimeout(() => {
        router.push("/dashboard/coach/profile");
      }, 600);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to save coach onboarding."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={title}>Coach Onboarding</div>

        <div style={sub}>
          Select your college program and confirm your
          existing ScoutLine staff information. You can
          correct anything that is outdated before saving.
        </div>

        {error ? (
          <div style={errorBox}>{error}</div>
        ) : null}

        {okMsg ? (
          <div style={okBox}>{okMsg}</div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{
            marginTop: 14,
            display: "grid",
            gap: 14,
          }}
        >
          <Field label="College / University">
            <div style={collegeSearchWrap}>
              <input
                style={input}
                value={collegeQuery}
                onChange={(event) => {
                  if (selectedCollege) {
                    clearSelectedCollege();
                  }

                  setCollegeQuery(event.target.value);
                  setError(null);
                }}
                onFocus={() => {
                  if (
                    !selectedCollege &&
                    collegeResults.length
                  ) {
                    setCollegeSearchOpen(true);
                  }
                }}
                placeholder="Type at least 2 characters to search"
                autoComplete="off"
              />

              {collegeSearchLoading ? (
                <div style={searchStatus}>
                  Searching programs…
                </div>
              ) : null}

              {!selectedCollege &&
              collegeSearchOpen ? (
                <div style={suggestionBox}>
                  {collegeResults.length ? (
                    collegeResults.map((college) => (
                      <button
                        key={college.id}
                        type="button"
                        style={suggestionButton}
                        onClick={() =>
                          selectCollege(college)
                        }
                      >
                        <span style={suggestionName}>
                          {college.name}
                        </span>

                        <span style={suggestionMeta}>
                          {collegeLocation(college) ||
                            "Location not listed"}
                        </span>

                        <span style={suggestionMeta}>
                          {collegeProgramDetails(
                            college
                          ) ||
                            "Program details not listed"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div style={emptySuggestion}>
                      No matching baseball programs found.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div style={hint}>
              Select the official program record. This
              prevents duplicate college entries.
            </div>
          </Field>

          {selectedCollege ? (
            <section style={selectedCollegeCard}>
              {selectedCollege.logoUrl ? (
                <img
                  src={selectedCollege.logoUrl}
                  alt=""
                  width={58}
                  height={58}
                  style={collegeLogo}
                />
              ) : (
                <div style={collegeLogoPlaceholder}>
                  {selectedCollege.name
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div style={selectedCollegeName}>
                  {selectedCollege.name}
                </div>

                <div style={selectedCollegeMeta}>
                  {collegeLocation(selectedCollege) ||
                    "Location not listed"}
                </div>

                <div style={selectedCollegeMeta}>
                  {collegeProgramDetails(
                    selectedCollege
                  ) || "Program details not listed"}
                </div>

                <div style={selectedCollegeMeta}>
                  {selectedCollege.activeCoachCount ?? 0}{" "}
                  active coach record
                  {(selectedCollege.activeCoachCount ??
                    0) === 1
                    ? ""
                    : "s"}
                </div>
              </div>

              <button
                type="button"
                onClick={clearSelectedCollege}
                style={changeCollegeButton}
              >
                Change
              </button>
            </section>
          ) : null}

          <div style={twoCol}>
            <Field label="First Name">
              <input
                style={input}
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                placeholder="First name"
                autoComplete="given-name"
              />
            </Field>

            <Field label="Last Name">
              <input
                style={input}
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                placeholder="Last name"
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field label="Role">
            <select
              style={input}
              value={role}
              onChange={(event) =>
                setRole(
                  event.target.value as
                    | StaffTitle
                    | ""
                )
              }
            >
              <option value="">Select Role</option>

              {ROLE_PRESETS.map((roleOption) => (
                <option
                  key={roleOption}
                  value={roleOption}
                >
                  {roleOption}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Email — This will be your username">
            <input
              style={input}
              value={workEmail}
              onChange={(event) =>
                setWorkEmail(event.target.value)
              }
              placeholder="coach@school.edu"
              inputMode="email"
              autoComplete="email"
            />

            <div style={hint}>
              Once logged in, you can set a different
              public contact email.
            </div>
          </Field>

          {selectedCollege &&
          coachResolveLoading ? (
            <div style={lookupBox}>
              Checking existing staff records…
            </div>
          ) : null}

          {selectedCollege &&
          coachResolveCompleted &&
          matchedCoach ? (
            <section
              style={{
                ...coachMatchCard,
                borderColor: matchedCoach.claimed
                  ? "#fecaca"
                  : "#bbf7d0",
                background: matchedCoach.claimed
                  ? "#fff1f2"
                  : "#f0fdf4",
              }}
            >
              <div style={coachMatchHeader}>
                <div>
                  <div style={coachMatchEyebrow}>
                    Existing ScoutLine Staff Record
                  </div>

                  <div style={coachMatchName}>
                    {matchedCoach.name}
                  </div>
                </div>

                <span
                  style={{
                    ...matchPill,
                    background: matchedCoach.claimed
                      ? "#fee2e2"
                      : "#dcfce7",
                    color: matchedCoach.claimed
                      ? "#991b1b"
                      : "#166534",
                  }}
                >
                  {matchedCoach.claimed
                    ? "Already claimed"
                    : coachMatchType === "EMAIL"
                    ? "Email match"
                    : "Name match"}
                </span>
              </div>

              <div style={coachMatchGrid}>
                <MatchValue
                  label="Title"
                  value={matchedCoach.title}
                />

                <MatchValue
                  label="Email"
                  value={matchedCoach.email}
                />

                <MatchValue
                  label="Phone"
                  value={
                    matchedCoach.phone
                      ? formatPhoneUS(
                          matchedCoach.phone
                        )
                      : null
                  }
                />

                <MatchValue
                  label="Source"
                  value={matchedCoach.dataSource}
                />
              </div>

              {matchedCoach.claimed ? (
                <div style={claimedWarning}>
                  This record is already connected to
                  another ScoutLine account. Contact
                  ScoutLine support if this appears
                  incorrect.
                </div>
              ) : (
                <div style={matchHelp}>
                  We prefilled the form using this
                  existing staff record. Review and edit
                  anything that needs updating before
                  saving.
                </div>
              )}
            </section>
          ) : null}

          {selectedCollege &&
          coachResolveCompleted &&
          !matchedCoach ? (
            <div style={noMatchBox}>
              We did not find an existing coach record
              matching your name or email. ScoutLine will
              create a coach-verified staff record when
              you save.
            </div>
          ) : null}

          <div style={phoneRow}>
            <Field label="Phone (optional)">
              <input
                style={input}
                value={formatPhoneUS(workPhone)}
                onChange={(event) =>
                  setWorkPhone(
                    digitsOnly(event.target.value)
                  )
                }
                placeholder="(555) 555-5555"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>

            <Field label="Ext (optional)">
              <input
                style={{
                  ...input,
                  width: 140,
                }}
                value={workPhoneExt}
                onChange={(event) =>
                  setWorkPhoneExt(
                    digitsOnly(
                      event.target.value
                    ).slice(0, 6)
                  )
                }
                placeholder="123456"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
          </div>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={phonePrivate}
              onChange={(event) =>
                setPhonePrivate(
                  event.target.checked
                )
              }
            />

            This number is hidden from players by default.
            Uncheck the box to make it available as a
            player-facing contact number.
          </label>

          <div style={buttonRow}>
            <button
              type="submit"
              disabled={
                !canSubmit ||
                Boolean(matchedCoach?.claimed)
              }
              style={{
                ...btnGold,
                opacity:
                  !canSubmit ||
                  matchedCoach?.claimed
                    ? 0.6
                    : 1,
                cursor:
                  !canSubmit ||
                  matchedCoach?.claimed
                    ? "not-allowed"
                    : "pointer",
              }}
              title={
                matchedCoach?.claimed
                  ? "This coach record has already been claimed"
                  : !canSubmit
                  ? "Complete all required fields and select a college"
                  : undefined
              }
            >
              {submitting
                ? "Saving…"
                : "Confirm and Continue"}
            </button>
          </div>

          {needsSetPassword ? (
            <div style={hint}>
              Check your email for the password setup
              link.
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}

export default function CoachOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <CoachOnboardingPageInner />
    </Suspense>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div style={label}>{props.label}</div>
      {props.children}
    </div>
  );
}

function MatchValue(props: {
  label: string;
  value?: string | null;
}) {
  return (
    <div style={matchValueCard}>
      <div style={matchValueLabel}>
        {props.label}
      </div>

      <div style={matchValueText}>
        {props.value || "Not listed"}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 18,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const title: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 20,
};

const sub: React.CSSProperties = {
  marginTop: 6,
  color: "#64748b",
  lineHeight: 1.4,
};

const label: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#64748b",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  minWidth: 0,
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const phoneRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  lineHeight: 1.4,
};

const checkRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 12,
  color: "#0f172a",
  lineHeight: 1.4,
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  flexWrap: "wrap",
};

const btnGold: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
};

const okBox: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  borderRadius: 12,
  fontWeight: 900,
};

const collegeSearchWrap: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gap: 6,
};

const searchStatus: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const suggestionBox: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 30,
  maxHeight: 320,
  overflowY: "auto",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  padding: 6,
  boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
  display: "grid",
  gap: 5,
};

const suggestionButton: React.CSSProperties = {
  display: "grid",
  gap: 3,
  width: "100%",
  textAlign: "left",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fff",
  padding: "10px 11px",
  color: "#0f172a",
  cursor: "pointer",
};

const suggestionName: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
};

const suggestionMeta: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const emptySuggestion: React.CSSProperties = {
  padding: 10,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const selectedCollegeCard: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "58px minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
};

const collegeLogo: React.CSSProperties = {
  width: 58,
  height: 58,
  objectFit: "contain",
  borderRadius: 12,
  border: "1px solid #dbeafe",
  background: "#fff",
};

const collegeLogoPlaceholder: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 12,
  border: "1px solid #dbeafe",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 22,
  color: "#1e3a8a",
};

const selectedCollegeName: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 15,
};

const selectedCollegeMeta: React.CSSProperties = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
  marginTop: 2,
};

const changeCollegeButton: React.CSSProperties = {
  border: "1px solid #93c5fd",
  background: "#fff",
  color: "#1e3a8a",
  borderRadius: 9,
  padding: "7px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const lookupBox: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  borderRadius: 12,
  padding: 11,
  fontSize: 13,
  fontWeight: 800,
};

const coachMatchCard: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 14,
  padding: 13,
  display: "grid",
  gap: 12,
};

const coachMatchHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const coachMatchEyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const coachMatchName: React.CSSProperties = {
  marginTop: 3,
  fontWeight: 900,
  fontSize: 17,
};

const matchPill: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 900,
};

const coachMatchGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
};

const matchValueCard: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.35)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.72)",
  padding: 9,
  minWidth: 0,
};

const matchValueLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 900,
};

const matchValueText: React.CSSProperties = {
  marginTop: 3,
  fontSize: 13,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const matchHelp: React.CSSProperties = {
  fontSize: 12,
  color: "#166534",
  fontWeight: 700,
  lineHeight: 1.4,
};

const claimedWarning: React.CSSProperties = {
  fontSize: 12,
  color: "#991b1b",
  fontWeight: 800,
  lineHeight: 1.4,
};

const noMatchBox: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#854d0e",
  borderRadius: 12,
  padding: 11,
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.4,
};
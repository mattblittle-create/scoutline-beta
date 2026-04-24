// app/onboarding/teams/page.tsx

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function norm(v: any) {
  return String(v ?? "").trim();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

type StateAbbr = (typeof US_STATES)[number];

function normalizeLogoUrl(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;
  return s;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function TeamsOnboardingPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const emailFromQuery = norm(search.get("email") || "");

  const [adminFirstName, setAdminFirstName] = React.useState("");
  const [adminLastName, setAdminLastName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState(emailFromQuery);

  const [adminPhone, setAdminPhone] = React.useState("");
  const [adminPhoneExt, setAdminPhoneExt] = React.useState("");
  const [phonePrivate, setPhonePrivate] = React.useState(true);

  const [teamName, setTeamName] = React.useState("");
  const [city, setCity] = React.useState("");

  const [stateQuery, setStateQuery] = React.useState("");
  const [stateValue, setStateValue] = React.useState<StateAbbr | "">("");
  const [showStateSuggs, setShowStateSuggs] = React.useState(false);

  const [website, setWebsite] = React.useState("");

  const [logoFileDataUrl, setLogoFileDataUrl] = React.useState<string>("");
  const [logoUrlInput, setLogoUrlInput] = React.useState<string>("");
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [needsSetPassword, setNeedsSetPassword] = React.useState(false);

  React.useEffect(() => {
    if (emailFromQuery) setAdminEmail(emailFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery]);

  const firstOk = Boolean(adminFirstName.trim());
  const lastOk = Boolean(adminLastName.trim());

  const emailOk = (() => {
    const em = adminEmail.trim().toLowerCase();
    return Boolean(em) && isEmail(em);
  })();

  const phoneOk = digitsOnly(adminPhone).slice(0, 10).length === 10;

  const teamOk = Boolean(teamName.trim());
  const cityOk = Boolean(city.trim());
  const stateOk = Boolean(String(stateValue || "").trim());

  const canSubmit = firstOk && lastOk && emailOk && phoneOk && teamOk && cityOk && stateOk;

  const stateSuggestions = React.useMemo(() => {
    const q = stateQuery.trim().toUpperCase();
    if (!q) return US_STATES.slice(0, 12);
    return US_STATES.filter((s) => s.startsWith(q)).slice(0, 12);
  }, [stateQuery]);

  function chooseState(abbr: StateAbbr) {
    setStateValue(abbr);
    setStateQuery(abbr);
    setShowStateSuggs(false);
  }

  async function postOnboarding(payload: any) {
    const res = await fetch("/api/onboarding/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  function effectiveLogoUrl() {
    if (logoFileDataUrl) return logoFileDataUrl;
    const u = normalizeLogoUrl(logoUrlInput);
    return u || "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setNeedsSetPassword(false);

    const fn = adminFirstName.trim();
    const ln = adminLastName.trim();
    const em = adminEmail.trim().toLowerCase();
    const ph = digitsOnly(adminPhone).slice(0, 10);
    const ext = digitsOnly(adminPhoneExt).slice(0, 6);

    const tn = teamName.trim();
    const c = city.trim();
    const st = String(stateValue || "").trim().toUpperCase() as StateAbbr;

    const web = website.trim();

    if (!fn) return setError("Admin first name is required.");
    if (!ln) return setError("Admin last name is required.");
    if (!em) return setError("Admin email is required.");
    if (!isEmail(em)) return setError("Admin email must be a valid email address.");
    if (ph.length !== 10) return setError("Admin phone must be 10 digits.");
    if (!tn) return setError("Team name is required.");
    if (!c) return setError("City is required.");
    if (!st) return setError("State is required.");

    try {
      setSubmitting(true);

      const payload = {
        adminFirstName: fn,
        adminLastName: ln,
        adminEmail: em,
        adminPhone: ph,
        adminPhoneExt: ext,
        phonePrivate,
        teamName: tn,
        city: c,
        state: st,
        website: web || null,
        logoUrl: effectiveLogoUrl() || null,
      };

      const { res, json } = await postOnboarding(payload);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      const needs = Boolean(json?.data?.needsSetPassword);

        setOkMsg(
          `You’re almost done — set your password using the link we sent to ${em}. Once set, come back and log in.`
        );
        return;
      }

      setOkMsg("Saved! Redirecting…");
      window.setTimeout(() => {
        router.push("/dashboard/team");
      }, 600);
    } catch (e: any) {
      setError(e?.message || "Failed to save onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={title}>Team Onboarding</div>
        <div style={sub}>
          Set up your team account. Once you log in you can complete your team profile, manage your roster, invite players on your team, and manage billing.
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}
        {okMsg ? <div style={okBox}>{okMsg}</div> : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={twoCol}>
            <Field label="Admin First Name">
              <input
                style={input}
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
              />
            </Field>

            <Field label="Admin Last Name">
              <input
                style={input}
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field label="Email - This will be your username">
            <input
              style={input}
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@yourteam.org"
              inputMode="email"
              autoComplete="email"
            />
            <div style={hint}>Once logged in, you can set a different email for contact.</div>
          </Field>

          <div style={phoneRow}>
            <Field label="Admin Phone">
              <input
                style={input}
                value={formatPhoneUS(adminPhone)}
                onChange={(e) => setAdminPhone(digitsOnly(e.target.value))}
                placeholder="(555) 555-5555"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>

            <Field label="Ext (optional)">
              <input
                style={{ ...input, width: 140 }}
                value={adminPhoneExt}
                onChange={(e) => setAdminPhoneExt(digitsOnly(e.target.value).slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
          </div>

          <label style={checkRow}>
            <input type="checkbox" checked={phonePrivate} onChange={(e) => setPhonePrivate(e.target.checked)} />
            This number is hidden from players by default. If you want players to have this number, uncheck the box.
          </label>

          <Field label="Team Name">
            <input
              style={input}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team / Organization Name"
              autoComplete="organization"
            />
          </Field>

          <div style={twoCol}>
            <Field label="City">
              <input
                style={input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                autoComplete="address-level2"
              />
            </Field>

            <div style={{ position: "relative" }}>
              <Field label="State">
                <input
                  style={input}
                  value={stateQuery}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setStateQuery(v);
                    setStateValue((US_STATES.includes(v as any) ? (v as any) : "") as any);
                    setShowStateSuggs(true);
                  }}
                  onFocus={() => setShowStateSuggs(true)}
                  onBlur={() => setTimeout(() => setShowStateSuggs(false), 120)}
                  placeholder="Type state (e.g. NC)"
                  inputMode="text"
                  autoComplete="address-level1"
                />
              </Field>

              {showStateSuggs && stateSuggestions.length > 0 ? (
                <div style={suggBox}>
                  {stateSuggestions.map((abbr) => (
                    <button
                      type="button"
                      key={abbr}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chooseState(abbr as StateAbbr)}
                      style={suggBtn}
                    >
                      {abbr}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <Field label="Website (optional)">
            <input
              style={input}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourteam.com"
              inputMode="url"
              autoComplete="url"
            />
            <div style={hint}>Optional now; you can add/edit later in your team profile.</div>
          </Field>

          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Logo Upload (optional)">
              <input
                style={input}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setLogoPreviewUrl(null);
                    setLogoFileDataUrl("");
                    return;
                  }

                  try {
                    const dataUrl = await fileToDataUrl(file);
                    setLogoFileDataUrl(dataUrl);
                    setLogoUrlInput("");
                    const blobUrl = URL.createObjectURL(file);
                    setLogoPreviewUrl(blobUrl);
                  } catch (err: any) {
                    setError(err?.message || "Failed to read logo file.");
                    setLogoPreviewUrl(null);
                    setLogoFileDataUrl("");
                  }
                }}
              />
              <div style={hint}>Upload a PNG/JPG/SVG. This will carry into your Team Profile + header.</div>
            </Field>

            <Field label="Or paste Logo URL (optional)">
              <input
                style={input}
                value={logoUrlInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setLogoUrlInput(v);
                  if (v.trim()) {
                    setLogoFileDataUrl("");
                    setLogoPreviewUrl(normalizeLogoUrl(v.trim()));
                  } else {
                    setLogoPreviewUrl(null);
                  }
                }}
                placeholder="https://example.com/logo.png"
                inputMode="url"
                autoComplete="off"
              />
              <div style={hint}>If you paste a URL, we’ll store it as your team logo.</div>
            </Field>

            {logoPreviewUrl ? (
              <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>Preview:</div>
                <img
                  src={logoPreviewUrl}
                  alt="Team logo preview"
                  style={{
                    height: 44,
                    width: 44,
                    objectFit: "contain",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: 6,
                  }}
                />
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => {
                    setLogoPreviewUrl(null);
                    setLogoFileDataUrl("");
                    setLogoUrlInput("");
                  }}
                  title="Clear logo"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              style={{
                ...btnGold,
                opacity: submitting || !canSubmit ? 0.6 : 1,
                cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
              }}
              title={!canSubmit ? "Please complete all required fields to continue" : undefined}
            >
              {submitting ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function TeamsOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <TeamsOnboardingPageInner />
    </Suspense>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <div style={label}>{props.label}</div>
      {props.children}
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const title: React.CSSProperties = { fontWeight: 900, fontSize: 18 };
const sub: React.CSSProperties = { marginTop: 6, color: "#64748b", lineHeight: 1.35 };

const label: React.CSSProperties = { fontWeight: 900, fontSize: 12, color: "#64748b" };

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
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const phoneRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const hint: React.CSSProperties = { fontSize: 11, color: "#94a3b8" };

const checkRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
  color: "#0f172a",
};

const btnGold: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const btnGhostSolid: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
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

const setPwBox: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 12px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 12,
};

const suggBox: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 66,
  zIndex: 30,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
  padding: 6,
  display: "grid",
  gap: 6,
};

const suggBtn: React.CSSProperties = {
  textAlign: "left",
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 900,
  color: "#0f172a",
};
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

function CoachOnboardingPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const emailFromQuery = norm(search.get("email") || "");

  // ✅ match Teams: First Name + Last Name
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");

  const [role, setRole] = React.useState<StaffTitle | "">("");
  const [collegeProgram, setCollegeProgram] = React.useState("");
  const [workEmail, setWorkEmail] = React.useState(emailFromQuery);
  const [workPhone, setWorkPhone] = React.useState("");
  const [workPhoneExt, setWorkPhoneExt] = React.useState("");
  const [phonePrivate, setPhonePrivate] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Success / set-password UX
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [needsSetPassword, setNeedsSetPassword] = React.useState(false);

  const [setPasswordUrl, setSetPasswordUrl] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (emailFromQuery) setWorkEmail(emailFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery]);

  // ✅ Disable submit until required fields are valid
  const firstOk = Boolean(firstName.trim());
  const lastOk = Boolean(lastName.trim());
  const roleOk = Boolean(String(role || "").trim());
  const collegeOk = Boolean(collegeProgram.trim());

  const emailOk = (() => {
    const em = workEmail.trim().toLowerCase();
    return Boolean(em) && isEmail(em);
  })();

  const phoneOk = digitsOnly(workPhone).slice(0, 10).length === 10;

  const canSubmit = firstOk && lastOk && roleOk && collegeOk && emailOk && phoneOk;

  async function copyLink() {
    if (!setPasswordUrl) return;
    try {
      await navigator.clipboard.writeText(setPasswordUrl);
      setToast("Link copied!");
      window.setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Could not copy link.");
      window.setTimeout(() => setToast(null), 1500);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setNeedsSetPassword(false);
    setSetPasswordUrl(null);
    setToast(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const n = `${fn} ${ln}`.trim();

    const r = String(role || "").trim();
    const p = collegeProgram.trim();
    const em = workEmail.trim().toLowerCase();
    const ph = digitsOnly(workPhone).slice(0, 10);
    const ext = digitsOnly(workPhoneExt).slice(0, 6);

    if (!fn) return setError("First name is required.");
    if (!ln) return setError("Last name is required.");
    if (!r) return setError("Role is required.");
    if (!p) return setError("College / University is required.");
    if (!em) return setError("Email is required.");
    if (!isEmail(em)) return setError("Email must be a valid email address.");
    if (ph.length !== 10) return setError("Phone must be 10 digits.");

    try {
      setSubmitting(true);

      const res = await fetch("/api/onboarding/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: n, // ✅ backend expects "name" string
          role: r,
          collegeProgram: p,
          workEmail: em,
          workPhone: ph,
          workPhoneExt: ext,
          phonePrivate,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      const needs = Boolean(json?.data?.needsSetPassword);
      const linkFromApi = String(json?.data?.setPasswordLink || "").trim();
      const tokenFromApi = String(
        json?.data?.setPasswordToken ||
          json?.data?.setPasswordJwt ||
          json?.data?.token ||
          ""
      ).trim();

      if (needs) {
        setNeedsSetPassword(true);

        let url: string | null = null;

if (linkFromApi) {
  url = linkFromApi
    .replace("/auth/set-passwrod", "/set-password")
    .replace("/auth/set-password", "/set-password")
    .replace("toekn=", "token=");
} else if (tokenFromApi) {
  url = `${window.location.origin}/set-password?token=${encodeURIComponent(tokenFromApi)}`;
} else {
  url = null;
}

        setSetPasswordUrl(url);

        setOkMsg(
          "You’re almost done — set your password using the link we sent to your email. Once set, come back and log in."
        );
        return;
      }

      setOkMsg("Saved! Redirecting…");
      window.setTimeout(() => {
        router.push("/dashboard/coach/profile");
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
        <div style={title}>Coach Onboarding</div>
        <div style={sub}>
          Set up your account. Once you log in you can build your profile, set recruiting targets, invite staff, and manage your recruiting board.
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}
        {okMsg ? <div style={okBox}>{okMsg}</div> : null}

        {needsSetPassword ? (
          <div style={setPwBox}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Set your password</div>
            <div style={hint}>
              We sent a password setup link to <b>{workEmail.trim().toLowerCase()}</b>.
              {setPasswordUrl ? " In dev, use the buttons below:" : ""}
            </div>

            {setPasswordUrl ? (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <button type="button" onClick={copyLink} style={btnGhost}>
                    Copy Link
                  </button>

                  <a href={setPasswordUrl} style={btnGhostSolid}>
                    Open Link
                  </a>

                  <button
                    type="button"
                    style={btnGold}
                    onClick={() => router.push("/login?role=coach")}
                    title="After setting your password, log in here."
                  >
                    Go to Login
                  </button>
                </div>

                {toast ? (
                  <div style={{ marginTop: 8, ...hint, color: "#047857", fontWeight: 900 }}>
                    {toast}
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ marginTop: 10, ...hint }}>
                If you don’t see the email, check spam/junk. In dev, the set-password token/link may not be available yet.
              </div>
            )}
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {/* ✅ Name matches Teams format */}
          <div style={twoCol}>
            <Field label="First Name">
              <input
                style={input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
              />
            </Field>

            <Field label="Last Name">
              <input
                style={input}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
              />
            </Field>
          </div>

          <Field label="Role">
            <select style={input} value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="">Select Role</option>
              {ROLE_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label="College / University">
            <input
              style={input}
              value={collegeProgram}
              onChange={(e) => setCollegeProgram(e.target.value)}
              placeholder="Your college / university name"
            />
            <div style={hint}>This is used during onboarding and links staff together.</div>
          </Field>

          <Field label="Email - This will be your username">
            <input
              style={input}
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              placeholder="coach@school.edu"
              inputMode="email"
              autoComplete="email"
            />
            <div style={hint}>Once logged in, you can set a different email for contact.</div>
          </Field>

          <div style={phoneRow}>
            <Field label="Phone">
              <input
                style={input}
                value={formatPhoneUS(workPhone)}
                onChange={(e) => setWorkPhone(digitsOnly(e.target.value))}
                placeholder="(555) 555-5555"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>

            <Field label="Ext (optional)">
              <input
                style={{ ...input, width: 140 }}
                value={workPhoneExt}
                onChange={(e) => setWorkPhoneExt(digitsOnly(e.target.value).slice(0, 6))}
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

export default function CoachOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <CoachOnboardingPageInner />
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

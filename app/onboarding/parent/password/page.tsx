// app/onboarding/parent/password/page.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

function planLabel(plan: string) {
  const p = String(plan || "").trim().toLowerCase();
  if (p === "redshirt") return "Redshirt";
  if (p === "walk-on") return "Walk-On";
  if (p === "all-american") return "All-American";
  if (p === "team") return "Team";
  return "ScoutLine";
}

function planPrice(plan: string, billing: string) {
  const p = String(plan || "").trim().toLowerCase();
  const b = String(billing || "").trim().toLowerCase();

  if (p === "redshirt") return "FREE";
  if (p === "walk-on" && b === "annual") return "$265 / year";
  if (p === "walk-on") return "$24.95 / month";
  if (p === "all-american" && b === "annual") return "$510 / year";
  if (p === "all-american") return "$49.95 / month";
  if (p === "team") return "Covered by team plan";

  return "";
}

export default function ParentPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const token = String(search.get("token") || "").trim();
  const emailFromQuery = String(search.get("email") || "").trim().toLowerCase();
  const playerEmail = String(search.get("playerEmail") || "").trim().toLowerCase();
  const playerFirstName = String(search.get("playerFirstName") || "").trim();
  const playerLastName = String(search.get("playerLastName") || "").trim();
  const plan = String(search.get("plan") || "").trim().toLowerCase();
  const billing = String(search.get("billing") || "monthly").trim().toLowerCase();

  const [resolvedEmail, setResolvedEmail] = React.useState(emailFromQuery);
  const [checkingToken, setCheckingToken] = React.useState(Boolean(token));
  const [tokenValid, setTokenValid] = React.useState(!token);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const playerName = [playerFirstName, playerLastName].filter(Boolean).join(" ").trim();
  const priceText = planPrice(plan, billing);

  React.useEffect(() => {
    let active = true;

    async function run() {
      if (!token) {
        setCheckingToken(false);
        setTokenValid(Boolean(emailFromQuery));
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/validate-token?purpose=SET_PASSWORD&token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok || !json?.valid) {
          setTokenValid(false);
          setError("This parent setup link is invalid or has expired.");
        } else {
          setResolvedEmail(String(json.email || "").trim().toLowerCase());
          setTokenValid(true);
          setError(null);
        }
      } catch (err: any) {
        if (!active) return;
        setTokenValid(false);
        setError(err?.message || "Failed to validate parent setup link.");
      } finally {
        if (active) setCheckingToken(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [token, emailFromQuery]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    if (!resolvedEmail) {
      setError("Missing parent email. Please use the link from the email invite.");
      return;
    }

    if (!playerEmail) {
      setError("Missing player email. Please use the link from the email invite.");
      return;
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/parent/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || null,
          email: resolvedEmail,
          password,
          playerEmail,
          playerFirstName,
          playerLastName,
          plan,
          billing,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to save parent password.");
      }

      setSuccess("Password set successfully. Redirecting to login...");
      window.setTimeout(() => {
        router.push(
          `/login?role=parent&email=${encodeURIComponent(resolvedEmail)}`
        );
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const ready = !checkingToken && tokenValid;

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#0f172a",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
        Set Parent Password
      </h1>

      <p style={{ marginTop: 6, color: "#475569" }}>
        Create your parent login for ScoutLine.
      </p>

      {checkingToken ? (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
            maxWidth: 560,
            color: "#475569",
            fontWeight: 700,
          }}
        >
          Checking your setup link…
        </div>
      ) : !ready ? (
        <>
          {error ? <div className="error">{error}</div> : null}
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <Link href="/login" className="sl-link-btn">
              Back to Login
            </Link>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              marginTop: 16,
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              maxWidth: 560,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <strong>Parent Email:</strong> {resolvedEmail || "—"}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Player Name:</strong> {playerName || "—"}
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>Player Email:</strong> {playerEmail || "—"}
            </div>
            <div>
              <strong>Plan:</strong>{" "}
              {planLabel(plan)}
              {priceText ? `, ${priceText}` : ""}
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
              <div>
                <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
                  Password
                </label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.35 }}>
                Requirements: 10+ characters, 1 capital letter, 1 number, 1 symbol.
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}
            {success ? <div className="success">{success}</div> : null}

            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Set Password"}
              </button>

              <Link
                href={resolvedEmail ? `/login?role=parent&email=${encodeURIComponent(resolvedEmail)}` : "/login"}
                className="sl-link-btn"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          background: #fff;
        }

        .input:focus {
          border-color: #caa042;
          box-shadow: 0 0 0 3px rgba(202,160,66,0.2);
        }

        .primary-btn {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid #caa042;
          background: #caa042;
          color: #0f172a;
          font-weight: 800;
          cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        }

        .primary-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .sl-link-btn {
          display: inline-block;
          padding: 10px 14px;
          border-radius: 10px;
          background: #fff;
          color: #0f172a;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          font-weight: 800;
        }

        .sl-link-btn:hover {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .error {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #7f1d1d;
          border-radius: 10px;
          font-weight: 700;
          max-width: 560px;
        }

        .success {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
          border-radius: 10px;
          font-weight: 700;
          max-width: 560px;
        }
      `}</style>
    </main>
  );
}
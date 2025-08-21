"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type CoachForm = {
  name: string;
  role: string;
  collegeProgram: string; // display string user picked
  collegeProgramId?: string; // optional id from your DB
  workEmail: string;
  workPhone?: string;
  hidePhoneFromPlayers: boolean;
  additionalCoachEmails: string[]; // invitations
};

type CollegeOption = {
  id: string;
  name: string; // e.g., "University of Florida (Baseball)"
  // add any other fields you return from your API
};

export default function OnboardingPlanPage() {
  const router = useRouter();
  const params = useParams<{ plan: string }>();
  const plan = (params?.plan || "").toLowerCase();

  // --- Coach form state ---
  const [form, setForm] = useState<CoachForm>({
    name: "",
    role: "",
    collegeProgram: "",
    collegeProgramId: undefined,
    workEmail: "",
    workPhone: "",
    hidePhoneFromPlayers: true,
    additionalCoachEmails: [],
  });

  // --- Typeahead state for colleges/programs ---
  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeOptions, setCollegeOptions] = useState<CollegeOption[]>([]);
  const [collegeOpen, setCollegeOpen] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Debounced fetch for college options
  useEffect(() => {
    if (plan !== "coach") return; // only used on coach page
    const q = collegeQuery.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q) {
      setCollegeOptions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoadingColleges(true);
        const res = await fetch(`/api/colleges?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as CollegeOption[];
          setCollegeOptions(data || []);
        } else {
          setCollegeOptions([]);
        }
      } catch {
        setCollegeOptions([]);
      } finally {
        setLoadingColleges(false);
      }
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeQuery, plan]);

  // Simple validators
  const emailRegex = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    []
  );

  const isEmail = (v: string) => emailRegex.test(v);

  const requiredErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.role.trim()) errs.role = "Required";
    if (!form.collegeProgram.trim()) errs.collegeProgram = "Required";
    if (!form.workEmail.trim()) errs.workEmail = "Required";
    else if (!isEmail(form.workEmail.trim())) errs.workEmail = "Invalid email";
    // optional phone; if present you could add a simple check
    return errs;
  }, [form, isEmail]);

  const canSubmit = Object.keys(requiredErrors).length === 0;

  // Add/remove additional coach emails
  const [inviteEntry, setInviteEntry] = useState("");
  const addInvite = () => {
    const v = inviteEntry.trim();
    if (!v) return;
    if (!isEmail(v)) return;
    if (form.additionalCoachEmails.includes(v)) return;
    setForm((f) => ({ ...f, additionalCoachEmails: [...f.additionalCoachEmails, v] }));
    setInviteEntry("");
  };
  const removeInvite = (email: string) => {
    setForm((f) => ({ ...f, additionalCoachEmails: f.additionalCoachEmails.filter((e) => e !== email) }));
  };

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Send to your onboarding endpoint. You can trigger invite emails on the server from here.
      const res = await fetch("/api/onboarding/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to save");
      }
      // Route to next step (e.g., dashboard or profile editor)
      router.push("/coach/welcome");
    } catch (err: any) {
      setSubmitError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------
  // Non-coach plans unchanged
  // --------------------------
  if (plan !== "coach") {
    return (
      <main style={{ color: "#0f172a" }}>
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 36px)" }}>
            Get Started: {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </h1>
          <p style={{ marginTop: 8, color: "#475569" }}>
            This plan’s onboarding will go here. For now, head back to{" "}
            <Link className="sl-link" href="/pricing">Pricing</Link>.
          </p>
        </section>
        <style>{`
          .sl-link { color:#0f172a; text-decoration: underline; text-underline-offset: 3px; }
        `}</style>
      </main>
    );
  }

  // --------------------------
  // Coach / Recruiter form
  // --------------------------
  return (
    <main style={{ color: "#0f172a" }}>
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 36px)" }}>
          College Coaches & Recruiters — Profile Setup
        </h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Tell us about your program. Required fields are marked.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
          {/* Name (required) */}
          <div className="field">
            <label className="label">
              Name <span className="req">*</span>
            </label>
            <input
              className={`input ${requiredErrors.name ? "error" : ""}`}
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            {requiredErrors.name && <div className="error-text">{requiredErrors.name}</div>}
          </div>

          {/* Role (required) */}
          <div className="field">
            <label className="label">
              Role/Title <span className="req">*</span>
            </label>
            <input
              className={`input ${requiredErrors.role ? "error" : ""}`}
              type="text"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Head Coach, Assistant Coach, Recruiting Coordinator, etc."
              required
            />
            {requiredErrors.role && <div className="error-text">{requiredErrors.role}</div>}
          </div>

          {/* College/Program (required with typeahead) */}
          <div className="field" style={{ position: "relative" }}>
            <label className="label">
              College / Program <span className="req">*</span>
            </label>
            <input
              className={`input ${requiredErrors.collegeProgram ? "error" : ""}`}
              type="text"
              value={form.collegeProgram}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, collegeProgram: v, collegeProgramId: undefined }));
                setCollegeQuery(v);
                setCollegeOpen(true);
              }}
              placeholder="Start typing your school/program…"
              onFocus={() => setCollegeOpen(!!form.collegeProgram || !!collegeQuery)}
              autoComplete="off"
              required
            />
            {requiredErrors.collegeProgram && <div className="error-text">{requiredErrors.collegeProgram}</div>}

            {collegeOpen && (collegeOptions.length > 0 || loadingColleges) && (
              <div className="typeahead">
                {loadingColleges && <div className="type-row muted">Searching…</div>}
                {!loadingColleges &&
                  collegeOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      className="type-row"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          collegeProgram: opt.name,
                          collegeProgramId: opt.id,
                        }));
                        setCollegeOpen(false);
                      }}
                    >
                      {opt.name}
                    </button>
                  ))}
                {!loadingColleges && collegeOptions.length === 0 && (
                  <div className="type-row muted">No results</div>
                )}
              </div>
            )}
          </div>

          {/* Work Email (required) */}
          <div className="field">
            <label className="label">
              Work Email <span className="req">*</span>
            </label>
            <input
              className={`input ${requiredErrors.workEmail ? "error" : ""}`}
              type="email"
              value={form.workEmail}
              onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
              placeholder="name@school.edu"
              required
            />
            {requiredErrors.workEmail && <div className="error-text">{requiredErrors.workEmail}</div>}
          </div>

          {/* Work Phone (optional) + privacy toggle */}
          <div className="field">
            <label className="label">Work Phone (optional)</label>
            <input
              className="input"
              type="tel"
              value={form.workPhone}
              onChange={(e) => setForm((f) => ({ ...f, workPhone: e.target.value }))}
              placeholder="(555) 555-5555"
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.hidePhoneFromPlayers}
                onChange={(e) => setForm((f) => ({ ...f, hidePhoneFromPlayers: e.target.checked }))}
              />
              <span>Hide this phone number from players</span>
            </label>
          </div>

          {/* Additional Coach Emails (invites) */}
          <div className="field">
            <label className="label">Invite Other Coaches (emails)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                type="email"
                value={inviteEntry}
                onChange={(e) => setInviteEntry(e.target.value)}
                placeholder="assistant@school.edu"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInvite();
                  }
                }}
              />
              <button type="button" className="btn" onClick={addInvite} disabled={!inviteEntry.trim() || !isEmail(inviteEntry.trim())}>
                Add
              </button>
            </div>
            {!!form.additionalCoachEmails.length && (
              <div className="chips">
                {form.additionalCoachEmails.map((em) => (
                  <span key={em} className="chip">
                    {em}
                    <button type="button" className="chip-x" onClick={() => removeInvite(em)} aria-label={`Remove ${em}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="help">
              We’ll email them an invite and link their accounts to your program for shared watchlists and staff access.
            </p>
          </div>

          {/* Submit */}
          {submitError && <div className="error-banner">{submitError}</div>}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <button type="submit" className="btn gold" disabled={!canSubmit || submitting}>
              {submitting ? "Saving…" : "Save & Continue"}
            </button>
            <Link href="/pricing" className="btn ghost">Cancel</Link>
          </div>
        </form>
      </section>

      {/* Local styles */}
      <style>{`
        .label { display:block; font-weight:800; margin-bottom:6px; }
        .req { color:#b91c1c; margin-left:4px; }
        .field { margin-bottom:16px; }
        .input {
          width:100%;
          padding:10px 12px;
          border:1px solid #e5e7eb;
          border-radius:10px;
          font-size:15px;
          outline:none;
          transition:border-color .15s ease, box-shadow .15s ease;
          background:#fff;
        }
        .input:focus { border-color:#caa042; box-shadow:0 0 0 3px rgba(202,160,66,0.18); }
        .input.error { border-color:#ef4444; }
        .error-text { margin-top:6px; color:#b91c1c; font-size:13px; }
        .help { margin:6px 0 0; color:#64748b; font-size:13px; }

        .btn {
          padding:10px 14px;
          border-radius:10px;
          border:1px solid #e5e7eb;
          background:#fff;
          color:#0f172a;
          font-weight:800;
          cursor:pointer;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.18); background:#f3f4f6; }
        .btn.gold { background:#caa042; border-color:#caa042; color:#0f172a; }
        .btn.gold:hover { background:#d7b25e; border-color:#d7b25e; }
        .btn.ghost { background:transparent; }

        .toggle { display:flex; align-items:center; gap:8px; margin-top:8px; color:#334155; font-size:14px; }

        .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .chip {
          background:#f1f5f9;
          color:#0f172a;
          border:1px solid #e5e7eb;
          border-radius:999px;
          padding:6px 10px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          font-size:13px;
        }
        .chip-x {
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:16px;
          line-height:1;
          color:#334155;
        }

        .typeahead {
          position:absolute;
          top:100%;
          left:0;
          right:0;
          margin-top:6px;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:10px;
          box-shadow:0 12px 28px rgba(15,23,42,0.12);
          z-index:20;
          max-height:260px;
          overflow:auto;
        }
        .type-row {
          width:100%;
          text-align:left;
          padding:10px 12px;
          background:#fff;
          border:none;
          border-bottom:1px solid #f1f5f9;
          cursor:pointer;
        }
        .type-row:hover { background:#f8fafc; }
        .type-row.muted { color:#94a3b8; cursor:default; }

        .error-banner {
          background:#fef2f2;
          color:#991b1b;
          border:1px solid #fecaca;
          border-radius:10px;
          padding:10px 12px;
          margin-bottom:10px;
          font-weight:700;
        }
      `}</style>
    </main>
  );
}

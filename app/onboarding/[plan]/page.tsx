"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: { plan: string };
};

type CoachForm = {
  name: string;
  role: string;
  collegeProgram: string;
  workEmail: string;
  workPhone: string;
  phonePrivate: boolean;
  inviteEmails: string[];
};

type Suggestion = { id: string; name: string; city?: string; state?: string };

export default function OnboardingPlanPage({ params }: PageProps) {
  const plan = (params?.plan || "").toLowerCase();
  if (plan === "coach") {
    return <CoachOnboarding />;
  }

  // Simple placeholders for other plans so we don't break navigation.
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
        {plan === "team" ? "Team Admin Onboarding" : "Player Onboarding"}
      </h1>
      <p style={{ marginTop: 8, color: "#475569" }}>
        This onboarding flow is coming soon. In the meantime, head back to{" "}
        <Link href="/pricing" className="sl-link">Pricing</Link>.
      </p>
      <style>{`.sl-link{ text-decoration:underline; }`}</style>
    </main>
  );
}

function CoachOnboarding() {
  const router = useRouter();
  const [form, setForm] = React.useState<CoachForm>({
    name: "",
    role: "",
    collegeProgram: "",
    workEmail: "",
    workPhone: "",
    phonePrivate: true,
    inviteEmails: [],
  });

  const [inviteInput, setInviteInput] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [collegeQuery, setCollegeQuery] = React.useState("");
  const [showSuggs, setShowSuggs] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // --- Autocomplete (College / Program) ---
  React.useEffect(() => {
    if (collegeQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/colleges/suggest?q=${encodeURIComponent(collegeQuery)}`);
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        setSuggestions(data || []);
      } catch {
        // ignore network errors silently for now
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [collegeQuery]);

  const selectSuggestion = (s: Suggestion) => {
    const display = s.state ? `${s.name} (${s.state})` : s.name;
    setForm((f) => ({ ...f, collegeProgram: display }));
    setCollegeQuery(display);
    setShowSuggs(false);
  };

  // --- Invite chips ---
  const addInvite = () => {
    const value = inviteInput.trim();
    if (!value) return;
    // naive email validation
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) {
      setError("Please enter a valid email address for invites.");
      return;
    }
    setForm((f) =>
      f.inviteEmails.includes(value) ? f : { ...f, inviteEmails: [...f.inviteEmails, value] }
    );
    setInviteInput("");
    setError(null);
  };

  const removeInvite = (email: string) => {
    setForm((f) => ({ ...f, inviteEmails: f.inviteEmails.filter((e) => e !== email) }));
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Required checks
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.role.trim()) return setError("Role is required.");
    if (!form.collegeProgram.trim()) return setError("College / Program is required.");
    if (!form.workEmail.trim()) return setError("Work email is required.");

    setSubmitting(true);
    try {
      // 1) Save onboarding payload (adjust API route as needed)
      await fetch("/api/onboarding/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      // 2) Send verification email (YOUR request from earlier)
      await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.workEmail }),
      });

      // 3) (Optional) Send invites server-side based on form.inviteEmails
      // await fetch("/api/onboarding/coach/invite", { ... });

      // 4) Route to a "Check your email" page
      router.push(`/check-email?email=${encodeURIComponent(form.workEmail)}&plan=coach`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>College Coaches & Recruiters</h1>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Create your program account. You’ll verify your email next, then set your password.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <div className="grid">
          {/* Name (required) */}
          <div className="field">
            <label className="label">Full Name<span className="req">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="input"
              placeholder="Jane Doe"
            />
          </div>

          {/* Role (required) */}
          <div className="field">
            <label className="label">Role<span className="req">*</span></label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              required
              className="input"
            >
              <option value="">Select role…</option>
              <option value="Head Coach">Head Coach</option>
              <option value="Assistant Coach">Assistant Coach</option>
              <option value="Recruiting Coordinator">Recruiting Coordinator</option>
              <option value="Analyst/Operations">Analyst / Operations</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* College / Program (required, autocomplete) */}
          <div className="field" style={{ position: "relative" }}>
            <label className="label">College / Program<span className="req">*</span></label>
            <input
              type="text"
              value={collegeQuery}
              onChange={(e) => {
                const v = e.target.value;
                setCollegeQuery(v);
                setForm((f) => ({ ...f, collegeProgram: v }));
                setShowSuggs(true);
              }}
              onFocus={() => setShowSuggs(true)}
              onBlur={() => setTimeout(() => setShowSuggs(false), 120)}
              required
              className="input"
              placeholder="Start typing your school…"
              autoComplete="off"
            />
            {showSuggs && suggestions.length > 0 && (
              <ul className="suggestions">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="sugg-btn" onClick={() => selectSuggestion(s)}>
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                      {s.state ? <span style={{ color: "#64748b" }}> — {s.state}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Work Email (required) */}
          <div className="field">
            <label className="label">Work Email<span className="req">*</span></label>
            <input
              type="email"
              value={form.workEmail}
              onChange={(e) => setForm((f) => ({ ...f, workEmail: e.target.value }))}
              required
              className="input"
              placeholder="coach@university.edu"
            />
          </div>

          {/* Work Phone + Privacy toggle */}
          <div className="field">
            <label className="label">Work Phone (optional)</label>
            <input
              type="tel"
              value={form.workPhone}
              onChange={(e) => setForm((f) => ({ ...f, workPhone: e.target.value }))}
              className="input"
              placeholder="(555) 555-5555"
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.phonePrivate}
                onChange={(e) => setForm((f) => ({ ...f, phonePrivate: e.target.checked }))}
              />
              <span>Hide this number from players</span>
            </label>
          </div>

          {/* Invite other coaches (chips, one at a time) */}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="label">Invite Other Coaches (optional)</label>
            <div className="chip-row">
              {form.inviteEmails.map((email) => (
                <span key={email} className="chip">
                  {email}
                  <button type="button" className="chip-x" onClick={() => removeInvite(email)} aria-label={`Remove ${email}`}>
                    ×
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInvite();
                  }
                }}
                placeholder="coach2@university.edu"
                className="chip-input"
              />
              <button type="button" className="sl-link-btn" onClick={addInvite} style={{ marginLeft: 8 }}>
                Add
              </button>
            </div>
            <p className="hint">Each invite is linked to your program for sharing features.</p>
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Save & Continue"}
          </button>
          <Link href="/pricing" className="sl-link-btn">Back to Pricing</Link>
        </div>
      </form>

      <style>{`
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 720px) {
          .grid { grid-template-columns: 1fr; }
        }
        .field {}
        .label {
          display:block;
          font-weight:800;
          margin-bottom:6px;
        }
        .req { color:#b91c1c; margin-left:4px; }
        .input {
          width:100%;
          padding:10px 12px;
          border:1px solid #e5e7eb;
          border-radius:10px;
          outline:none;
          background:#fff;
        }
        .input:focus {
          border-color:#caa042;
          box-shadow:0 0 0 3px rgba(202,160,66,0.2);
        }
        .toggle {
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:6px;
          font-size:0.95rem;
          color:#475569;
        }
        .chip-row {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          align-items:center;
          border:1px solid #e5e7eb;
          border-radius:10px;
          padding:8px;
          background:#fff;
        }
        .chip {
          background:#f1f5f9;
          border:1px solid #e2e8f0;
          border-radius:999px;
          padding:6px 10px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          font-weight:700;
        }
        .chip-x {
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:16px;
          line-height:1;
          padding:0 2px;
          color:#0f172a;
        }
        .chip-input {
          flex:1;
          min-width:220px;
          border:none;
          outline:none;
          padding:6px 8px;
        }
        .hint { margin:6px 0 0; font-size:0.9rem; color:#64748b; }

        .primary-btn {
          padding:10px 16px;
          border-radius:10px;
          border:1px solid #caa042;
          background:#caa042;
          color:#0f172a;
          font-weight:800;
          cursor:pointer;
          transition:transform .15s ease, box-shadow .15s ease, background-color .15s ease;
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.18); }
        .primary-btn:disabled { opacity:.6; cursor:not-allowed; }

        .sl-link-btn {
          display:inline-block;
          padding:10px 14px;
          border-radius:10px;
          background:#fff;
          color:#0f172a;
          text-decoration:none;
          border:1px solid #e5e7eb;
          font-weight:800;
          transition:transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
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
        }

        /* Suggestions dropdown */
        .suggestions {
          list-style: none;
          margin: 6px 0 0;
          padding: 6px;
          position: absolute;
          left: 0;
          right: 0;
          top: 74px;
          z-index: 20;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(15,23,42,0.12);
          max-height: 260px;
          overflow: auto;
        }
        .sugg-btn {
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 8px;
        }
        .sugg-btn:hover {
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}

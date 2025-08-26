// app/account/page.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type UserProfile = {
  email: string;
  slug?: string | null;
  name?: string | null;
  role?: string | null;
  program?: string | null;
  workPhone?: string | null;
  phonePrivate?: boolean;
  photoUrl?: string | null;

  sport?: string | null;
  division?: string | null;
  conference?: string | null;
  bio?: string | null;
  preferredContact?: string | null;

  programWebsiteUrl?: string | null;
  campsUrl?: string | null;
  recruitingUrl?: string | null;
  questionnaireUrl?: string | null;

  coachSocial?: any;     // shown as JSON
  programSocial?: any;   // shown as JSON
  positionNeeds?: any;   // shown as JSON
  schoolMeta?: any;      // shown as JSON
};

export default function AccountPage() {
  const search = useSearchParams();
  const emailParam = (search.get("email") || "").trim().toLowerCase();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const [data, setData] = React.useState<UserProfile | null>(null);

  const [slugInput, setSlugInput] = React.useState("");
  const [slugStatus, setSlugStatus] = React.useState<null | { available: boolean; checking: boolean }>(null);

  // JSON editors (stringified)
  const [coachSocialText, setCoachSocialText] = React.useState("");
  const [programSocialText, setProgramSocialText] = React.useState("");
  const [positionNeedsText, setPositionNeedsText] = React.useState("");
  const [schoolMetaText, setSchoolMetaText] = React.useState("");

  React.useEffect(() => {
    let cancel = false;

    async function load() {
      if (!emailParam) {
        setLoading(false);
        setMessage("Add ?email=you@example.com to the URL to edit.");
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/account/profile?email=${encodeURIComponent(emailParam)}`);
        const j = await res.json();
        if (!cancel) {
          if (j.ok) {
            const u: UserProfile = j.user;
            setData(u);
            setSlugInput((u.slug || "") as string);
            setCoachSocialText(formatJson(u.coachSocial ?? []));
            setProgramSocialText(formatJson(u.programSocial ?? []));
            setPositionNeedsText(formatJson(u.positionNeeds ?? []));
            setSchoolMetaText(formatJson(u.schoolMeta ?? {}));
          } else {
            setMessage(j.error || "Failed to load profile.");
          }
        }
      } catch (e: any) {
        if (!cancel) setMessage(e?.message || "Failed to load profile.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => { cancel = true; };
  }, [emailParam]);

  function update<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    if (!data) return;
    setData({ ...data, [k]: v } as UserProfile);
  }

  function parseJsonOr<T>(text: string, fallback: T): T {
    try {
      const v = JSON.parse(text);
      return v;
    } catch {
      return fallback;
    }
  }
  function formatJson(v: any) {
    try { return JSON.stringify(v, null, 2); } catch { return ""; }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...data,
        // re-parse JSON textareas
        coachSocial: parseJsonOr(coachSocialText, []),
        programSocial: parseJsonOr(programSocialText, []),
        positionNeeds: parseJsonOr(positionNeedsText, []),
        schoolMeta: parseJsonOr(schoolMetaText, {}),
      };
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.ok) {
        setData(j.user);
        setMessage("✅ Saved!");
      } else {
        setMessage(`❌ ${j.error || "Save failed"}`);
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function checkSlugAvailability(s: string) {
    setSlugStatus({ available: false, checking: true });
    try {
      const res = await fetch(`/api/coach/slug?slug=${encodeURIComponent(s)}`);
      const j = await res.json();
      setSlugStatus({ available: !!j.available, checking: false });
    } catch {
      setSlugStatus(null);
    }
  }

  async function claimSlug() {
    if (!data || !slugInput.trim()) return;
    setMessage(null);
    try {
      const res = await fetch("/api/coach/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, slug: slugInput }),
      });
      const j = await res.json();
      if (j.ok) {
        setData({ ...data, slug: j.slug });
        setMessage("✅ Slug saved!");
      } else {
        setMessage(`❌ ${j.error || "Could not save slug"}`);
      }
    } catch (e: any) {
      setMessage(`❌ ${e?.message || "Could not save slug"}`);
    }
  }

  if (loading) {
    return <main style={{ padding: 16 }}>Loading…</main>;
  }

  if (!data) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ marginTop: 0 }}>Account</h1>
        <p>{message || "No data."}</p>
      </main>
    );
  }

  const publicUrl = data.slug ? `/coach/${data.slug}` : null;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginTop: 0 }}>Account & Profile</h1>

      <div style={{ margin: "8px 0 16px", color: "#475569" }}>
        <div><strong>Email:</strong> {data.email}</div>
        {publicUrl && (
          <div style={{ marginTop: 6 }}>
            <Link href={publicUrl} className="sl-link">View Public Page</Link>
          </div>
        )}
      </div>

      {/* Slug claim */}
      <section className="card">
        <h2>Public URL (Slug)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>https://beta.myscoutline.com/coach/</div>
          <input
            value={slugInput}
            onChange={(e) => {
              const v = e.target.value;
              setSlugInput(v);
              if (v.trim()) checkSlugAvailability(v);
              else setSlugStatus(null);
            }}
            placeholder="your-handle"
            className="input"
            style={{ maxWidth: 260 }}
          />
          <button type="button" onClick={claimSlug} className="primary-btn">
            Save slug
          </button>
          {slugStatus?.checking && <span>Checking…</span>}
          {slugStatus && !slugStatus.checking && (
            <span style={{ fontWeight: 800, color: slugStatus.available ? "#15803d" : "#b91c1c" }}>
              {slugStatus.available ? "Available" : "Taken"}
            </span>
          )}
        </div>
      </section>

      {/* Basic info */}
      <form onSubmit={saveProfile}>
        <section className="card">
          <h2>Basic</h2>
          <div className="grid2">
            <label className="field">
              <span className="label">Name</span>
              <input className="input" value={data.name || ""} onChange={(e) => update("name", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Role</span>
              <input className="input" value={data.role || ""} onChange={(e) => update("role", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Program</span>
              <input className="input" value={data.program || ""} onChange={(e) => update("program", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Preferred Contact</span>
              <input className="input" value={data.preferredContact || ""} onChange={(e) => update("preferredContact", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Phone</span>
              <input className="input" value={data.workPhone || ""} onChange={(e) => update("workPhone", e.target.value)} />
              <label className="toggle">
                <input type="checkbox" checked={!!data.phonePrivate} onChange={(e) => update("phonePrivate", e.target.checked)} />
                <span>Hide phone on public page</span>
              </label>
            </label>
            <label className="field">
              <span className="label">Photo URL</span>
              <input className="input" value={data.photoUrl || ""} onChange={(e) => update("photoUrl", e.target.value)} placeholder="https://..." />
            </label>
          </div>
        </section>

        {/* Program meta */}
        <section className="card">
          <h2>Program Meta</h2>
          <div className="grid3">
            <label className="field">
              <span className="label">Sport</span>
              <input className="input" value={data.sport || ""} onChange={(e) => update("sport", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Division</span>
              <input className="input" value={data.division || ""} onChange={(e) => update("division", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Conference</span>
              <input className="input" value={data.conference || ""} onChange={(e) => update("conference", e.target.value)} />
            </label>
          </div>

          <label className="field" style={{ marginTop: 10 }}>
            <span className="label">Bio</span>
            <textarea className="textarea" rows={5} value={data.bio || ""} onChange={(e) => update("bio", e.target.value)} />
          </label>
        </section>

        {/* Links */}
        <section className="card">
          <h2>Links</h2>
          <div className="grid2">
            <label className="field">
              <span className="label">Program Website</span>
              <input className="input" value={data.programWebsiteUrl || ""} onChange={(e) => update("programWebsiteUrl", e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span className="label">Camps</span>
              <input className="input" value={data.campsUrl || ""} onChange={(e) => update("campsUrl", e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span className="label">Recruiting Page</span>
              <input className="input" value={data.recruitingUrl || ""} onChange={(e) => update("recruitingUrl", e.target.value)} placeholder="https://..." />
            </label>
            <label className="field">
              <span className="label">Recruit Questionnaire</span>
              <input className="input" value={data.questionnaireUrl || ""} onChange={(e) => update("questionnaireUrl", e.target.value)} placeholder="https://..." />
            </label>
          </div>
        </section>

        {/* JSON sections */}
        <section className="card">
          <h2>Social (JSON)</h2>
          <div className="grid2">
            <label className="field">
              <span className="label">Coach Social (array)</span>
              <textarea className="textarea" rows={6} value={coachSocialText} onChange={(e) => setCoachSocialText(e.target.value)} />
              <small className="hint">e.g. [{`{ "label":"X", "url":"https://x.com/coach" }`}]</small>
            </label>
            <label className="field">
              <span className="label">Program Social (array)</span>
              <textarea className="textarea" rows={6} value={programSocialText} onChange={(e) => setProgramSocialText(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Position Needs (JSON)</h2>
          <label className="field">
            <span className="label">Array of classes</span>
            <textarea className="textarea" rows={6} value={positionNeedsText} onChange={(e) => setPositionNeedsText(e.target.value)} />
            <small className="hint">e.g. [{`{ "year": 2026, "needs": ["RHP","SS"] }`}]</small>
          </label>
        </section>

        <section className="card">
          <h2>School Info (JSON)</h2>
          <label className="field">
            <span className="label">Object</span>
            <textarea className="textarea" rows={6} value={schoolMetaText} onChange={(e) => setSchoolMetaText(e.target.value)} />
            <small className="hint">e.g. {`{ "schoolType":"Public", "enrollment":"22,000", "campusType":"Urban" }`}</small>
          </label>
        </section>

        {message && <div className="msg">{message}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {publicUrl && (
            <Link href={publicUrl} className="sl-link-btn">View Public Page</Link>
          )}
        </div>
      </form>

      <style>{`
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 16px;
          margin-bottom: 16px;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .grid3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 840px) {
          .grid2, .grid3 { grid-template-columns: 1fr; }
        }
        .field { display: block; }
        .label { display:block; font-weight:800; margin-bottom:6px; }
        .input, .textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          background: #fff;
        }
        .input:focus, .textarea:focus {
          border-color: #caa042;
          box-shadow: 0 0 0 3px rgba(202,160,66,0.2);
        }
        .toggle { display:flex; align-items:center; gap:8px; margin-top:6px; color:#475569; }
        .primary-btn {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid #caa042;
          background: #caa042;
          color: #0f172a;
          font-weight: 800;
          cursor: pointer;
        }
        .sl-link-btn {
          display:inline-block; padding:10px 14px; border-radius:10px;
          background:#fff; color:#0f172a; text-decoration:none; border:1px solid #e5e7eb; font-weight:800;
        }
        .sl-link { text-decoration: underline; text-underline-offset: 2px; }
        .hint { color:#64748b; font-size: 12px; }
        .msg { margin-top: 10px; font-weight: 800; }
      `}</style>
    </main>
  );
}

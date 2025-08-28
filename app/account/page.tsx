// app/account/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AccountPage() {
  const searchParams = useSearchParams();

  // Prefill from URL if present
  const slugFromUrl = searchParams.get("slug") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [slug, setSlug] = useState(slugFromUrl);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (slugFromUrl) setSlug(slugFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [slugFromUrl, emailFromUrl]);

  // Derived public URL preview
  const publicUrl = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    if (!slug) return "";
    return `${base || ""}/coach/${slug}`;
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email) {
      setMsg("Please enter your account email.");
      return;
    }
    if (!slug) {
      setMsg("Please enter a profile slug.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug }),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error || "Slug already taken. Try another.");
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save profile.");
      }

      const data = await res.json();
      if (data?.ok) {
        setMsg("Saved! Your public profile link is updated.");
      } else {
        throw new Error(data?.error || "Failed to save profile.");
      }
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setMsg("Copied profile link to clipboard.");
    });
  }

  function shareViaEmail() {
    if (!publicUrl) return;
    const subject = encodeURIComponent("My ScoutLine profile");
    const body = encodeURIComponent(`Here is my profile on ScoutLine:\n\n${publicUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "28px 16px",
        color: "#0f172a",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 12 }}>
        Coach Account
      </h1>
      <p style={{ color: "#475569", marginTop: 0 }}>
        Set your public profile slug and share your page. The slug will be what appears in your profile URL (https://myscoutline.com/coach/[slug]). Suggested slug is firstname-lastname.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Email (until auth is wired up) */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Account Email</span>
          <input
            type="email"
            value={email}
            placeholder="you@university.edu"
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: "1rem",
            }}
          />
        </label>

        {/* Slug */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Profile Slug</span>
          <input
            type="text"
            value={slug}
            placeholder="coach-first-last"
            onChange={(e) => setSlug(e.target.value)}
            required
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: "1rem",
            }}
          />
          <span style={{ color: "#64748b", fontSize: ".9rem" }}>
            Your public link will be <code>/coach/{slug || "your-slug"}</code>
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#caa042",
              color: "#0f172a",
              fontWeight: 800,
              border: "1px solid #caa042",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>

          {publicUrl && (
            <>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                View Public Page
              </a>
              <button
                type="button"
                onClick={copyLink}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={shareViaEmail}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Share via Email
              </button>
            </>
          )}
        </div>

        {msg && (
          <div
            style={{
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        )}
      </form>
    </main>
  );
}

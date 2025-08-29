// app/account/ClientAccountPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PhotoGetResponse =
  | { ok: true; email: string; photoUrl: string | null }
  | { ok: false; error: string };

export default function ClientAccountPage() {
  const searchParams = useSearchParams();

  // Prefill from URL if present
  const slugFromUrl = searchParams.get("slug") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [slug, setSlug] = useState(slugFromUrl);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Photo state ---
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);   // uploaded URL to be saved
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // local object URL for preview
  const [uploading, setUploading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (slugFromUrl) setSlug(slugFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [slugFromUrl, emailFromUrl]);

  // When email changes, fetch existing photo so the card reflects current DB state
  useEffect(() => {
    let abort = false;
    async function loadPhoto() {
      setPhotoMsg(null);
      setPreviewUrl(null);

      const e = (email || "").trim().toLowerCase();
      if (!e) {
        setPhotoUrl(null);
        return;
      }
      try {
        const res = await fetch(`/api/account/photo?email=${encodeURIComponent(e)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as PhotoGetResponse;
        if (abort) return;
        if (res.ok && data.ok) {
          setPhotoUrl(data.photoUrl ?? null);
        } else {
          setPhotoUrl(null);
        }
      } catch {
        if (!abort) setPhotoUrl(null);
      }
    }
    loadPhoto();
    return () => {
      abort = true;
    };
  }, [email]);

  // Derived public URL preview
  const publicUrl = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    if (!slug) return "";
    return `${base || ""}/coach/${slug}`;
  }, [slug]);

  // ---------- Profile (email + slug) ----------
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

  // ---------- Photo helpers ----------
  async function uploadToServer(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/account/photo/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.ok || !data?.url) {
      throw new Error(data?.error || "Upload failed");
    }
    return data.url as string;
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional client-side type/size check
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      setPhotoMsg("❌ Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg("❌ File too large (max 5MB).");
      return;
    }

    // Local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setPhotoMsg(null);
    setUploading(true);

    try {
      const url = await uploadToServer(file);
      setPhotoUrl(url); // hold uploaded URL locally until "Save" is clicked
      setPhotoMsg("✅ Photo uploaded. Click Save to update your profile.");
    } catch (err: any) {
      setPhotoMsg(`❌ ${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  }

  async function onSavePhoto() {
    setPhotoMsg(null);
    if (!email) {
      setPhotoMsg("❌ Missing account email.");
      return;
    }
    setSavingPhoto(true);
    try {
      const res = await fetch("/api/account/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          photoUrl: photoUrl || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed");
      setPhotoMsg("✅ Profile photo saved!");
    } catch (err: any) {
      setPhotoMsg(`❌ ${err.message || "Save failed"}`);
    } finally {
      setSavingPhoto(false);
    }
  }

  function onRemoveLocal() {
    setPreviewUrl(null);
    setPhotoUrl(null);
    setPhotoMsg("Photo removed locally. Click Save to update your profile.");
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
        Set your public profile slug and share your page. The slug will be what appears in your
        profile URL (https://myscoutline.com/coach/[slug]). Suggested slug is firstname-lastname.
      </p>

      {/* Profile (email + slug) */}
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
          marginBottom: 16,
        }}
      >
        {/* Email */}
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

      {/* Profile Photo card */}
      <section
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 800 }}>Profile Photo</h2>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* Square preview box */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#94a3b8",
            }}
          >
            {previewUrl || photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl || photoUrl!}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "No Photo"
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onPickFile}
              disabled={uploading}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onSavePhoto}
                disabled={uploading || savingPhoto || !email}
                style={{
                  background: "#caa042",
                  color: "#0f172a",
                  fontWeight: 800,
                  border: "1px solid #caa042",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  opacity: uploading || savingPhoto ? 0.7 : 1,
                }}
              >
                {savingPhoto ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={onRemoveLocal}
                disabled={uploading}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 12px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
            {uploading && <p>Uploading…</p>}
            {photoMsg && <p>{photoMsg}</p>}
          </div>
        </div>
        <p style={{ color: "#64748b", marginTop: 10 }}>
          Tip: After saving, refresh your public page to see the new photo.
        </p>
      </section>
    </main>
  );
}

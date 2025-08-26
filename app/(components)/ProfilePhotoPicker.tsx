"use client";

import * as React from "react";

type Props = {
  email: string;          // who we’re updating
  initialUrl?: string | null; // optional current photo
};

export default function ProfilePhotoPicker({ email, initialUrl }: Props) {
  const [preview, setPreview] = React.useState<string | null>(initialUrl || null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // local preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // upload
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("file", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Upload failed");
      }
      setMsg("✅ Photo updated");
      // Use the blob URL returned (more stable than local preview)
      setPreview(data.url as string);
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontWeight: 800 }}>Profile / Logo (optional)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Profile preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#64748b", fontSize: 12 }}>No image</span>
          )}
        </div>

        <div>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={busy}
          />
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>
            JPEG/PNG, up to 5MB. Square images look best.
          </p>
        </div>
      </div>

      {msg && <p style={{ margin: 0, color: msg.startsWith("✅") ? "#166534" : "#7f1d1d" }}>{msg}</p>}
    </div>
  );
}

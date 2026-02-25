// app/coach/[slug]/ShareProfileWidget.tsx
"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ShareProfileWidget({ shareUrl }: { shareUrl: string }) {
  const [open, setOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied!");
      window.setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Could not copy link.");
      window.setTimeout(() => setToast(null), 1500);
    }
  }

  const emailHref = `mailto:?subject=${encodeURIComponent("ScoutLine Coach Profile")}&body=${encodeURIComponent(
    `Here is my ScoutLine coach profile:\n\n${shareUrl}`
  )}`;

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={btnShare}>
        Share Profile
      </button>

      {open ? (
        <div style={shareCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Share your Coach Profile</div>
            <button type="button" onClick={() => setOpen(false)} style={btnClose} aria-label="Close share">
              ×
            </button>
          </div>

          <div style={shareGrid}>
            <div style={{ minWidth: 0 }}>
              <div style={mutedSmall}>Share this link or scan the QR code.</div>

              <div style={linkBox}>
                <div style={{ fontWeight: 900, fontSize: 12, color: "#64748b" }}>Profile Link</div>
                <div style={{ marginTop: 6, wordBreak: "break-word", fontWeight: 900 }}>{shareUrl}</div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={copy} style={btnShare}>
                    Copy Link
                  </button>
                  <a href={emailHref} style={btnShare}>
                    Email Link
                  </a>
                </div>

                {toast ? <div style={{ marginTop: 8, ...mutedSmall, color: "#047857", fontWeight: 900 }}>{toast}</div> : null}
              </div>
            </div>

            <div style={qrWrap}>
              <QRCodeSVG value={shareUrl} size={180} />
              <div style={{ marginTop: 8, ...mutedSmall, textAlign: "center" }}>Scan to view</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const btnShare: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const shareCard: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const btnClose: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: "28px",
};

const shareGrid: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "1fr 220px",
  gap: 14,
  alignItems: "start",
};

const linkBox: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  padding: 12,
};

const qrWrap: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  display: "grid",
  placeItems: "center",
};

const mutedSmall: React.CSSProperties = { color: "#64748b", fontSize: 12, lineHeight: 1.3 };

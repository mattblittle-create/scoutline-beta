// app/team/[slug]/ShareProfileWidget.tsx
"use client";

import * as React from "react";

type Props = {
  shareUrl: string;
};

export default function ShareProfileWidget({ shareUrl }: Props) {
  const [toast, setToast] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Tailwind-ish breakpoint: sm = 640px
    const mq = window.matchMedia("(max-width: 639px)");

    const apply = () => setIsMobile(mq.matches);
    apply();

    // Safari < 14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      // @ts-ignore
      mq.addListener(apply);
      // @ts-ignore
      return () => mq.removeListener(apply);
    }
  }, []);

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("Link copied. Paste into text or email.");
    } catch {
      setToast("Could not copy link.");
    } finally {
      window.setTimeout(() => setToast(null), 3000); // ✅ 3.0s
    }
  }

  const mailHref = shareUrl
    ? `mailto:?subject=${encodeURIComponent("ScoutLine Team Profile")}&body=${encodeURIComponent(
        `Here is our ScoutLine team profile:\n\n${shareUrl}`
      )}`
    : "";

  return (
    <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button type="button" style={primaryBtn} onClick={copy} disabled={!shareUrl}>
          Share Profile
        </button>

        {/* ✅ Desktop-only secondary button */}
        {!isMobile ? (
          shareUrl ? (
            <a href={mailHref} style={ghostBtn} title="Open email to share link">
              Email
            </a>
          ) : (
            <span style={{ ...ghostBtn, opacity: 0.55, cursor: "not-allowed" }} title="Share link not available">
              Email
            </span>
          )
        ) : null}
      </div>

      {toast ? <div style={toastText}>{toast}</div> : null}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const toastText: React.CSSProperties = {
  fontSize: 11,
  color: "#047857",
  fontWeight: 900,
  textAlign: "right",
  maxWidth: 260,
};

"use client";

import * as React from "react";

export default function CopyButton({
  value,
  label = "Copy",
  title,
}: {
  value: string;
  label?: string;
  title?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    const v = String(value ?? "");
    if (!v) return;

    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // fallback for older browsers / permissions
      try {
        const ta = document.createElement("textarea");
        ta.value = v;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
      } catch {
        // ignore
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={title || `Copy: ${value}`}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.14)",
        background: copied ? "rgba(34,197,94,0.14)" : "#fff",
        cursor: "pointer",
        fontWeight: 900,
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

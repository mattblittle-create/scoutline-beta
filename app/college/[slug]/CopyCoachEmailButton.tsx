// app/college/[slug]/CopyCoachEmailButton.tsx

"use client";

import * as React from "react";

export default function CopyCoachEmailButton({
  email,
  style,
}: {
  email: string;
  style?: React.CSSProperties;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      alert("Email copied to clipboard");
    } catch {
      alert("Unable to copy email");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        ...style,
        cursor: "pointer",
      }}
    >
      Copy Email
    </button>
  );
}
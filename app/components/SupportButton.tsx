// app/components/SupportButton.tsx

"use client";

import React from "react";

export default function SupportButton({
  subjectPrefix = "Account Support Request",
  playerName,
  targetId,
}: {
  subjectPrefix?: string;
  playerName?: string | null;
  targetId?: string | null;
}) {
  function handleClick() {
    const pieces = [
      subjectPrefix,
      playerName || "",
      targetId || "",
    ].filter(Boolean);

    const subject = pieces.join(" - ");

    window.location.href =
      `mailto:support@myscoutline.com?subject=${encodeURIComponent(subject)}`;

    window.setTimeout(() => {
      const goFaq = window.confirm(
        "Thank you for reaching out to ScoutLine Support. Expect a response within 48 hours.\n\nYou can also check out the FAQ here. Open FAQ now?"
      );

      if (goFaq) {
        window.location.href = "https://www.myscoutline.com/faq";
      }
    }, 5000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        color: "#0f172a",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      Account Support
    </button>
  );
}
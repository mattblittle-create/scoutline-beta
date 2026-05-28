// app/college/[slug]/SendPlayerCardButton.tsx

"use client";

import * as React from "react";

export default function SendPlayerCardButton(props: {
  collegeSlug: string;
  coachId: string;
  coachName: string;
  coachEmail?: string | null;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      style={{
  ...props.style,
  cursor: "pointer",
}}
      onClick={async () => {
        const res = await fetch("/api/player/current-card-route", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok || !json?.data?.cardUrl) {
          window.location.href = `/login?next=${encodeURIComponent(
            `/college/${props.collegeSlug}`
          )}`;
          return;
        }

        const url = new URL(json.data.cardUrl, window.location.origin);

        url.searchParams.set("shareMode", "intro");
        url.searchParams.set("college", props.collegeSlug);
        url.searchParams.set("coachId", props.coachId);
        url.searchParams.set("coachName", props.coachName || "");

        if (props.coachEmail) {
          url.searchParams.set("coachEmail", props.coachEmail);
        }

        window.location.href = url.toString();
      }}
    >
      Send Player Card
    </button>
  );
}
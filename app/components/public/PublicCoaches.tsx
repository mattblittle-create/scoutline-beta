// app/components/public/PublicCoaches.tsx
"use client";

import * as React from "react";

export type CoachEntry = {
  firstName?: string | null;
  lastName?: string | null;

  teamOrOrg?: string | null;   // preferred display field
  organization?: string | null; // fallback from saved profile payload
  team?: string | null;         // legacy fallback
  org?: string | null;          // legacy fallback

  focus?: string | null;       // Coaching Focus
  email?: string | null;       // mailto link
  phone?: string | null;       // tel link (free-form; we normalize for href)
};

export type CoachesData = {
  coaches?: CoachEntry[] | null;
};

type Props = {
  data: CoachesData;
  title?: string;

  // Optional shared styles to match the rest of your public page
  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
};

/** Utilities */
function fullName(first?: string | null, last?: string | null): string {
  let f = (first ?? "").trim();
  const l = (last ?? "").trim();

  if (f && l) {
    const suffix = new RegExp(`\\s+${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (suffix.test(f)) {
      f = f.replace(suffix, "").trim() || f;
    }
  }

  return (f || l) ? [f, l].filter(Boolean).join(" ") : "—";
}

function toTelHref(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export default function PublicCoaches({
  data,
  title = "References",
  cardStyle,
  h2Style,
}: Props) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const coaches = Array.isArray(data?.coaches) ? data!.coaches!.filter(Boolean) : [];

const safeCard: React.CSSProperties = {
  marginTop: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: isMobile ? 12 : 16,
  overflow: "hidden",
  ...(cardStyle || {}),
};

  const safeH2: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    ...(h2Style || {}),
  };

const grid: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
  gap: isMobile ? 10 : 12,
  minWidth: 0,
  maxWidth: "100%",
};

const coachCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#ffffff",
  padding: isMobile ? 10 : 12,
  display: "grid",
  gap: isMobile ? 5 : 6,
  color: "#0f172a",
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

  const rowLabel: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#334155" };
  const rowValue: React.CSSProperties = {
  fontSize: isMobile ? 13 : 14,
  fontWeight: 700,
  color: "#0ea5e9",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  minWidth: 0,
};

  const Line = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div style={rowLabel}>{label}</div>
      <div style={rowValue}>{children}</div>
    </div>
  );

  const Mail = ({ email }: { email?: string | null }) => {
    const e = (email ?? "").trim();
    return e ? (
      <a
        href={`mailto:${e}`}
        style={{ color: "#0ea5e9", textDecoration: "none", fontWeight: 800, wordBreak: "break-all" }}
      >
        {e}
      </a>
    ) : (
      <>—</>
    );
  };

  const Tel = ({ phone }: { phone?: string | null }) => {
    const p = (phone ?? "").trim();
    const href = toTelHref(p);
    return href ? (
      <a href={href} style={{ color: "#0ea5e9", textDecoration: "none", fontWeight: 800 }}>
        {p}
      </a>
    ) : p ? (
      <>{p}</>
    ) : (
      <>—</>
    );
  };

  return (
    <section style={safeCard} aria-labelledby="coaches-title">
      <h2 id="coaches-title" style={safeH2}>{title}</h2>

      {coaches.length === 0 ? (
        <p style={{ marginTop: 8, color: "#94a3b8", fontStyle: "italic" }}>
          No Coaches or References available.
        </p>
      ) : (
        <div style={grid}>
          {coaches.map((c, i) => {
            const name = fullName(c?.firstName, c?.lastName);
            const team =
              (c?.teamOrOrg ??
              c?.organization ??
              c?.team ??
              c?.org ??
   "").trim();
            const focus = (c?.focus ?? "").trim();
            const email = (c?.email ?? "").trim() || null;
            const phone = (c?.phone ?? "").trim() || null;

            return (
              <div key={`${name}-${i}`} style={coachCard} role="group" aria-label={`Coach card ${i + 1}`}>
                <Line label="Coach Name">{name}</Line>
                <Line label="Team / Organization">{team || "—"}</Line>
                <Line label="Coaching Focus">{focus || "—"}</Line>
                <Line label="Coach Email">
                  <Mail email={email} />
                </Line>
                <Line label="Coach Phone">
                  <Tel phone={phone} />
                </Line>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

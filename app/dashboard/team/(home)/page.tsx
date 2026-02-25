// app/dashboard/team/page.tsx
import Link from "next/link";
import type { CSSProperties } from "react";

export default function TeamDashboardPage() {
  return (
    <main style={{ display: "grid", gap: 14 }}>
      {/* Dashboard grid */}
      <section style={grid}>
        <Card
          title="Profile"
          subtitle="Admin, team / org name, contact info, location, website, branding"
          body={
            <>
              <p style={p}>Update the info players and coaches will see.</p>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/team/org" style={btnGold}>
                  Go to Profile
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Roster"
          subtitle="Manage players, edit and share profiles"
          body={
            <>
              <p style={p}>Help players refine their profile and get recruited.</p>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/team/roster" style={btnGold}>
                  Go to Roster
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Invites"
          subtitle="Send and manage invites"
          body={
            <>
              <p style={p}>Invite players, track status, and send reminders.</p>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/team/invites" style={btnGold}>
                  Go to Invites
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Billing"
          subtitle="Billing info"
          body={
            <>
              <p style={p}>Update billing info and apply available discounts.</p>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/team/billing" style={btnGold}>
                  Go to Billing
                </Link>
              </div>
            </>
          }
        />
      </section>
    </main>
  );
}

function Card({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: React.ReactNode;
}) {
  return (
    <div style={card}>
      <div style={cardHead}>
        <div>
          <div style={cardTitle}>{title}</div>
          <div style={cardSub}>{subtitle}</div>
        </div>
      </div>

      <div style={cardBody}>{body}</div>
    </div>
  );
}

/* ---------------- Styles ---------------- */

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: 12,
};

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const cardHead: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const cardTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
};

const cardSub: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.3,
};

const cardBody: CSSProperties = {
  marginTop: 12,
};

const p: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  lineHeight: 1.4,
};

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  textDecoration: "none",
};

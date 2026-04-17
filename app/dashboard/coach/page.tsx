// app/dashboard/coach/page.tsx

import Link from "next/link";
import type { CSSProperties } from "react";

export default function CoachDashboardHome() {
  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={grid}>
        <Card
          title="Profile"
          subtitle="Coach profile + program profile + recruiting focus"
          body={
            <>
              <p style={p}>
                Manage your contact preferences, program branding, and general targets by grad class and position.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/coach/profile" style={btnGold}>
                  Go to Profile
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Recruiting Board"
          subtitle="Search active players, create lists, share with staff"
          body={
            <>
              <p style={p}>
                Find players by grad year, position, academics, location, metrics, and more. Save them to named lists. Share lists across your staff.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/coach/recruiting-board" style={btnGold}>
                  Go to Recruiting Board
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Invites"
          subtitle="Invite your program staff to ScoutLine"
          body={
            <>
              <p style={p}>
                Add other coaches on your staff so you can share recruiting lists and notes on players across the program.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/coach/invites" style={btnGold}>
                  Go to Invites
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="Directory"
          subtitle="Active staff in your program"
          body={
            <>
              <p style={p}>
                View active staff members linked to your program. Set admin(s) and edit access. Program admin(s) can remove staff access.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/coach/directory" style={btnGold}>
                  Go to Directory
                </Link>
              </div>
            </>
          }
        />

        <Card
          title="ScoutLine Chat"
          subtitle="Coach-initiated conversations with players"
          body={
            <>
              <p style={p}>
                Manage your ScoutLine Chat conversations with players. Coaches open the first thread, and players can reply after the conversation starts.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/dashboard/coach/chat" style={btnGold}>
                  Open Chat
                </Link>
              </div>
            </>
          }
        />
      </section>
    </main>
  );
}

function Card({ title, subtitle, body }: { title: string; subtitle: string; body: React.ReactNode }) {
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

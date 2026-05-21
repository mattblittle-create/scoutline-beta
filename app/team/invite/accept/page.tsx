// app/team/invite/accept/page.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AcceptData = {
  invite: {
    id: string;
    invitedEmail: string;
    parentEmail?: string | null;
    status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
    createdAt?: string | null;
    updatedAt?: string | null;
    acceptedAt?: string | null;
    expiresAt?: string | null;
    expired?: boolean;
  };

  team: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    state?: string | null;
    logoUrl?: string | null;
  };

  createdBy?: {
    name?: string | null;
    email?: string | null;
  } | null;

  viewer: {
    isLoggedIn: boolean;
    email?: string | null;
    matchesInvitedPlayer: boolean;
    matchesParent: boolean;
    invitedPlayerAccountExists: boolean;
  };

  currentPrimaryTeam?: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    state?: string | null;
    logoUrl?: string | null;
  } | null;

  requiresTeamChoice?: boolean;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function TeamInviteAcceptPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = String(search.get("token") || "").trim();
  const code = String(search.get("code") || "").trim();
  const isJoinLinkMode = !!code && !token;

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [data, setData] = React.useState<AcceptData | null>(null);

  const [joinPlayerEmail, setJoinPlayerEmail] = React.useState("");
  const [joinParentEmail, setJoinParentEmail] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function load() {
if (!token && !code) {
  setError("Missing invite token or team join code.");
  setLoading(false);
  return;
}

      try {
const res = await fetch(
  isJoinLinkMode
    ? `/api/team/invites/accept?code=${encodeURIComponent(code)}`
    : `/api/team/invites/accept?token=${encodeURIComponent(token)}`,
  { cache: "no-store" }
);

        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load invite.");
        }

        setData(json.data || null);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load invite.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token, code, isJoinLinkMode]);

async function submitJoinLink() {
  if (!code || submitting) return;

  setSubmitting(true);
  setError(null);
  setSuccess(null);

  try {
    const res = await fetch("/api/team/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        playerEmail: joinPlayerEmail,
        parentEmail: joinParentEmail,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to start team invite.");
    }

    const redirectTo = String(json?.data?.redirectTo || "");

    if (!redirectTo) {
      throw new Error("Missing invite redirect.");
    }

    router.push(redirectTo);
  } catch (err: any) {
    setError(err?.message || "Failed to start team invite.");
  } finally {
    setSubmitting(false);
  }
}

async function acceptInvite(
  teamChoice?: "SWITCH_TO_INVITED_TEAM" | "KEEP_CURRENT_TEAM"
) {
  if (!token || submitting) return;

  setSubmitting(true);
  setError(null);
  setSuccess(null);

  try {
    const res = await fetch("/api/team/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        ...(teamChoice ? { teamChoice } : {}),
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to accept invite.");
    }

    if (json?.data?.requiresTeamChoice) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              requiresTeamChoice: true,
              currentPrimaryTeam: json.data.currentTeam || null,
            }
          : prev
      );

      setSubmitting(false);
      return;
    }

    if (json?.data?.keptCurrentTeam) {
      setSuccess(
        `You kept your current team relationship with ${json?.data?.currentTeam?.name || "your existing team"}.`
      );

      window.setTimeout(() => {
        router.push(
          String(json?.data?.redirectTo || "/dashboard/player/profile")
        );
      }, 1200);

      return;
    }

    if (json?.data?.switchedFromTeam?.name) {
      setSuccess(
        `Team relationship switched from ${json.data.switchedFromTeam.name} to ${json.data.team?.name || "new team"}. Redirecting...`
      );
    } else {
      setSuccess("Invite accepted. Redirecting to your player profile...");
    }

    window.setTimeout(() => {
      router.push(
        String(json?.data?.redirectTo || "/dashboard/player/profile")
      );
    }, 1200);
  } catch (err: any) {
    setError(err?.message || "Failed to accept invite.");
  } finally {
    setSubmitting(false);
  }
}

  const loginHref = token
    ? `/login?role=player&next=${encodeURIComponent(`/team/invite/accept?token=${token}`)}`
    : "/login?role=player";

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#0f172a",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900 }}>
        Team Invite
      </h1>

      <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.45 }}>
        Accept your team invite to connect your player account to the team roster.
      </p>

      {loading ? (
        <div style={boxMuted}>Loading invite…</div>
      ) : error ? (
        <>
          <div style={boxError}>{error}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <Link href="/login" style={btnGhost}>
              Back to Login
            </Link>
          </div>
        </>
) : data && isJoinLinkMode ? (
  <>
    <section style={card}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={sectionTitle}>Join {data.team.name}</div>

        <p style={muted}>
          Enter the player and parent email to create a ScoutLine team invite and connect this player to the team roster.
        </p>

        <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <span style={{ fontWeight: 900 }}>Player Email (required)</span>
          <input
            value={joinPlayerEmail}
            onChange={(e) => setJoinPlayerEmail(e.target.value)}
            placeholder="player@example.com"
            type="email"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <span style={{ fontWeight: 900 }}>Parent Email (required)</span>
          <input
            value={joinParentEmail}
            onChange={(e) => setJoinParentEmail(e.target.value)}
            placeholder="parent@example.com"
            type="email"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            onClick={submitJoinLink}
            disabled={
  submitting ||
  !joinPlayerEmail.trim() ||
  !joinParentEmail.trim()
}
            style={{
              ...btnGoldButton,
              opacity:
  submitting ||
  !joinPlayerEmail.trim() ||
  !joinParentEmail.trim()
    ? 0.6
    : 1,
              cursor:
                submitting ||
!joinPlayerEmail.trim() ||
!joinParentEmail.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting ? "Creating Invite…" : "Continue"}
          </button>

          <Link href="/login?role=player" style={btnGhost}>
            Already have an account?
          </Link>
        </div>
      </div>
    </section>

    {error ? <div style={boxError}>{error}</div> : null}
  </>
) : data ? (
        <>
          <section style={card}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={sectionTitle}>{data.team.name}</div>

              <div style={muted}>
                {data.team.city || "—"}
                {data.team.state ? `, ${data.team.state}` : ""}
              </div>

              <div style={row}>
                <strong>Invited Player Email:</strong> {data.invite.invitedEmail}
              </div>

              {data.invite.parentEmail ? (
                <div style={row}>
                  <strong>Parent Email:</strong> {data.invite.parentEmail}
                </div>
              ) : null}

              <div style={row}>
                <strong>Status:</strong> {data.invite.status}
              </div>

              <div style={row}>
                <strong>Expires:</strong> {fmtDate(data.invite.expiresAt)}
              </div>

              {data.createdBy?.name || data.createdBy?.email ? (
                <div style={row}>
                  <strong>Sent By:</strong>{" "}
                  {data.createdBy?.name || data.createdBy?.email}
                </div>
              ) : null}
            </div>
          </section>

          {success ? <div style={boxSuccess}>{success}</div> : null}
          {error ? <div style={boxError}>{error}</div> : null}

{!data.viewer.isLoggedIn ? (
  <section style={card}>
    <div style={sectionTitle}>
      {data.viewer.invitedPlayerAccountExists
        ? "Log in to accept"
        : "Create your player login"}
    </div>

    <p style={muted}>
      {data.viewer.invitedPlayerAccountExists ? (
        <>
          You already have a ScoutLine account. Log in as{" "}
          <strong>{data.invite.invitedEmail}</strong> to accept this team invite.
        </>
      ) : (
        <>
          This invite is for <strong>{data.invite.invitedEmail}</strong>. Finish
          setting up your ScoutLine login, then you’ll be brought back here to
          accept the team invite.
        </>
      )}
    </p>

    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
      {data.viewer.invitedPlayerAccountExists ? (
        <Link href={loginHref} style={btnGold}>
          Log In as Player
        </Link>
      ) : (
        <Link
          href={`/set-password?next=${encodeURIComponent(
            `/team/invite/accept?token=${token}`
          )}`}
          style={btnGold}
        >
          Set Up Password
        </Link>
      )}
    </div>
  </section>
) : !data.viewer.matchesInvitedPlayer ? (
            <section style={card}>
              <div style={sectionTitle}>Wrong account signed in</div>
              <p style={muted}>
                You are signed in as <strong>{data.viewer.email || "—"}</strong>, but this invite must be accepted by <strong>{data.invite.invitedEmail}</strong>.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <Link href={loginHref} style={btnGold}>
                  Log In with Invited Player Email
                </Link>
              </div>
            </section>
          ) : data.invite.status === "ACCEPTED" ? (
            <section style={card}>
              <div style={sectionTitle}>Invite already accepted</div>
              <p style={muted}>
                This team invite has already been accepted.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <Link href="/dashboard/player/profile" style={btnGold}>
                  Go to Player Profile
                </Link>
              </div>
            </section>
          ) : data.invite.expired || data.invite.status === "EXPIRED" ? (
            <section style={card}>
              <div style={sectionTitle}>Invite expired</div>
              <p style={muted}>
                This invite is no longer active. Please contact the team admin for a new invite.
              </p>
            </section>
          ) : data.invite.status === "CANCELLED" ? (
            <section style={card}>
              <div style={sectionTitle}>Invite cancelled</div>
              <p style={muted}>
                This invite has been cancelled by the team admin.
              </p>
            </section>
          ) : (
<section style={card}>
  <div style={sectionTitle}>
    {data.requiresTeamChoice
      ? "Choose Your Active Team"
      : "Accept team invite"}
  </div>

  {!data.requiresTeamChoice ? (
    <>
      <p style={muted}>
        Signed in as <strong>{data.viewer.email || "—"}</strong>.
        Accepting will connect your player account to{" "}
        <strong>{data.team.name}</strong>.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <button
          type="button"
          onClick={() => acceptInvite()}
          disabled={submitting}
          style={{
            ...btnGoldButton,
            opacity: submitting ? 0.6 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Accepting…" : "Accept Invite"}
        </button>

        <Link href="/dashboard/player/profile" style={btnGhost}>
          Not Now
        </Link>
      </div>
    </>
  ) : (
    <>
      <p style={muted}>
        You are already connected to{" "}
        <strong>{data.currentPrimaryTeam?.name || "another team"}</strong>.
      </p>

      <p style={{ ...muted, marginTop: 10 }}>
        ScoutLine only allows one active billing/team relationship at a
        time.
      </p>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          Current Active Team
        </div>

        <div style={muted}>
          {data.currentPrimaryTeam?.name}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #caa042",
          borderRadius: 12,
          background: "#fffaf0",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          Inviting Team
        </div>

        <div style={muted}>
          {data.team.name}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 18,
        }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            acceptInvite("KEEP_CURRENT_TEAM")
          }
          style={{
            ...btnGhostButton,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          Keep Current Team
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            acceptInvite("SWITCH_TO_INVITED_TEAM")
          }
          style={{
            ...btnGoldButton,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          Switch to {data.team.name}
        </button>
      </div>
    </>
  )}
</section>
          )}
        </>
      ) : (
        <div style={boxError}>Invite not found.</div>
      )}
    </main>
  );
}

const card: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#0f172a",
};

const muted: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.45,
};

const row: React.CSSProperties = {
  color: "#0f172a",
  lineHeight: 1.45,
};

const boxMuted: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
};

const boxError: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid #fecaca",
  borderRadius: 12,
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 800,
};

const boxSuccess: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid #bbf7d0",
  borderRadius: 12,
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: 800,
};

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnGoldButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
};

const btnGhostButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "0 12px",
  fontWeight: 800,
  color: "#0f172a",
  background: "#ffffff",
};

export default function TeamInviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "24px 16px",
            color: "#0f172a",
          }}
        >
          <div style={boxMuted}>Loading invite…</div>
        </main>
      }
    >
      <TeamInviteAcceptPageInner />
    </Suspense>
  );
}
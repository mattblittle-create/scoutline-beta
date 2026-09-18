// app/coach/join/page.tsx

"use client";

import React, { useEffect, useState } from "react";

type ResolveState =
  | { status: "loading"; message: string }
  | {
      status: "ready";
      code: string;
      college: {
        id: string;
        name: string;
        city?: string | null;
        state?: string | null;
        logoUrl?: string | null;
        division?: string | null;
        conference?: string | null;
      };
    }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function CoachJoinPage() {
  const [state, setState] = useState<ResolveState>({
    status: "loading",
    message: "Loading coach join link…",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const url = new URL(window.location.href);
      const code = String(url.searchParams.get("code") || "").trim();

      if (!code) {
        setState({ status: "error", message: "Missing coach join code." });
        return;
      }

      try {
        const res = await fetch(`/api/coach/join-link/resolve?code=${encodeURIComponent(code)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setState({ status: "error", message: json?.error || "This coach join link could not be found." });
          return;
        }

        setState({
          status: "ready",
          code,
          college: json.data.college,
        });
      } catch (e: any) {
        if (!cancelled) {
          setState({ status: "error", message: e?.message || "Something went wrong loading this coach join link." });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function requestAccess() {
    if (state.status !== "ready") return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/coach/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          collegeId: state.college.id,
          requestedRole: "ASSISTANT",
          notes: `Requested access through coach join link code ${state.code}.`,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        const next = `/coach/join?code=${encodeURIComponent(state.code)}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Could not submit join request.");
      }

      setState({
        status: "success",
        message:
          json?.data?.request?.message ||
          "Your request has been submitted. A program admin can approve your access from ScoutLine.",
      });
    } catch (e: any) {
      setState({ status: "error", message: e?.message || "Something went wrong submitting your request." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={wrap}>
      <section style={card}>
        <div style={eyebrow}>ScoutLine Coach Access</div>

        {state.status === "loading" ? (
          <>
            <div style={title}>Loading Join Link</div>
            <div style={sub}>{state.message}</div>
          </>
        ) : null}

        {state.status === "error" ? (
          <>
            <div style={title}>Coach Join Link</div>
            <div style={errorBox}>{state.message}</div>
            <div style={hint}>Ask your program admin to regenerate a fresh coach join link.</div>
          </>
        ) : null}

        {state.status === "success" ? (
          <>
            <div style={title}>Request Submitted</div>
            <div style={successBox}>{state.message}</div>
          </>
        ) : null}

        {state.status === "ready" ? (
          <>
            <div style={title}>Join {state.college.name}</div>
            <div style={sub}>
              Request access to this program’s ScoutLine coach workspace.
            </div>

            <div style={programBox}>
              {state.college.logoUrl ? (
                <img src={state.college.logoUrl} alt="" width={54} height={54} style={logo} />
              ) : null}

              <div>
                <div style={{ fontWeight: 900 }}>{state.college.name}</div>
                <div style={mini}>
                  {[state.college.city, state.college.state].filter(Boolean).join(", ") || "Program location not listed"}
                </div>
                <div style={mini}>
                  {[state.college.division, state.college.conference].filter(Boolean).join(" • ") || "Program details not listed"}
                </div>
              </div>
            </div>

            <button type="button" style={btnGold} onClick={requestAccess} disabled={submitting}>
              {submitting ? "Submitting…" : "Request Coach Access"}
            </button>

            <div style={hint}>
              You may be asked to log in first. Once submitted, a program admin can approve your request.
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "28px 16px",
  color: "#0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
  display: "grid",
  gap: 12,
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const title: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 24,
  letterSpacing: "-0.03em",
};

const sub: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.4,
};

const mini: React.CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const hint: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.4,
};

const programBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
  display: "flex",
  gap: 12,
  alignItems: "center",
};

const logo: React.CSSProperties = {
  borderRadius: 12,
  objectFit: "contain",
  background: "#fff",
  border: "1px solid #e5e7eb",
};

const btnGold: React.CSSProperties = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  width: "fit-content",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  padding: 12,
  fontWeight: 800,
};

const successBox: React.CSSProperties = {
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  borderRadius: 12,
  padding: 12,
  fontWeight: 800,
};
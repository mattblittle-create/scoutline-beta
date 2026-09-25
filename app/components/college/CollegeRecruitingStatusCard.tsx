// app/components/college/CollegeRecruitingStatusCard.tsx

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

type Props = {
  collegeId: string;
  collegeName: string;
};

const STATUS_OPTIONS = [
  ["SAVED", "Saved"],
  ["INTERESTED", "Interested"],
  ["CONTACTED", "Contacted"],
  ["VISITED", "Visited"],
  ["OFFERED", "Offered"],
  ["COMMITTED", "Committed"],
  ["SIGNED", "Signed"],
  ["APPLIED", "Applied"],
  ["ACCEPTED", "Accepted"],
  ["NOT_PURSUING", "Not Pursuing"],
] as const;

const PRIORITY_OPTIONS = [
  ["", "No Priority"],
  ["HIGH", "High Priority"],
  ["MEDIUM", "Medium Priority"],
  ["LOW", "Low Priority"],
] as const;

export default function CollegeRecruitingStatusCard({
  collegeId,
  collegeName,
}: Props) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [status, setStatus] = useState("SAVED");
  const [priority, setPriority] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json().catch(() => null);

        const email =
          meData?.email ||
          meData?.user?.email ||
          meData?.data?.email ||
          "";

        const loggedIn = meRes.ok && !!email;

        if (!cancelled) {
          setIsLoggedIn(loggedIn);
          setAuthChecked(true);
        }

        if (!loggedIn) return;

        const savedRes = await fetch("/api/player/target-programs", {
          cache: "no-store",
        });

        const savedData = await savedRes.json().catch(() => null);

        if (!cancelled && savedRes.ok && savedData?.ok) {
          const match = (savedData.saved || []).find(
            (item: any) => item?.collegeId === collegeId
          );

          if (match) {
            setIsSaved(true);
            setStatus(match.status || "SAVED");
            setPriority(match.priority || "");
            setNotes(match.notes || "");
          }
        }
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false);
          setAuthChecked(true);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  async function addTargetProgram() {
    if (!isLoggedIn || saving) return;

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/player/target-programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collegeId,
          priority: priority || "MEDIUM",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not save target program.");
      }

      setIsSaved(true);
      setStatus("SAVED");
      setPriority(data.saved?.priority || priority || "MEDIUM");
      setMessage("Added to Target Programs.");
    } catch (err) {
      console.error("COLLEGE_RECRUITING_STATUS_ADD_ERROR", err);
      setMessage("Could not add this school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTargetProgram(next: {
    status?: string;
    priority?: string;
    notes?: string;
  }) {
    if (!isLoggedIn || !isSaved || saving) return;

    const previous = { status, priority, notes };

    if (typeof next.status !== "undefined") setStatus(next.status);
    if (typeof next.priority !== "undefined") setPriority(next.priority);
    if (typeof next.notes !== "undefined") setNotes(next.notes);

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/player/target-programs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collegeId,
          ...next,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not update target program.");
      }

      setMessage("Recruiting status updated.");
    } catch (err) {
      console.error("COLLEGE_RECRUITING_STATUS_UPDATE_ERROR", err);
      setStatus(previous.status);
      setPriority(previous.priority);
      setNotes(previous.notes);
      setMessage("Could not update this school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeTargetProgram() {
    if (!isLoggedIn || !isSaved || saving) return;

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/player/target-programs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collegeId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not remove target program.");
      }

      setIsSaved(false);
      setStatus("SAVED");
      setPriority("");
      setNotes("");
      setMessage("Removed from Target Programs.");
    } catch (err) {
      console.error("COLLEGE_RECRUITING_STATUS_REMOVE_ERROR", err);
      setMessage("Could not remove this school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) return null;

  if (!isLoggedIn) {
    return (
      <section style={cardStyle}>
        <h2 style={titleStyle}>Recruiting Status</h2>
        <p style={textStyle}>
          Log in as a player to save {collegeName} and track your recruiting progress.
        </p>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={titleStyle}>Recruiting Status</h2>
          <p style={textStyle}>
            Track where this school stands in your personal recruiting plan.
          </p>
        </div>

        <span style={isSaved ? savedBadgeStyle : unsavedBadgeStyle}>
          {isSaved ? "In Target Programs" : "Not Saved Yet"}
        </span>
      </div>

      {isSaved ? (
        <>
          <div style={gridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Status</span>
              <select
                value={status}
                disabled={saving}
                onChange={(e) => updateTargetProgram({ status: e.target.value })}
                style={selectStyle}
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Priority</span>
              <select
                value={priority}
                disabled={saving}
                onChange={(e) => updateTargetProgram({ priority: e.target.value })}
                style={selectStyle}
              >
                {PRIORITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ ...fieldStyle, marginTop: 10 }}>
            <span style={labelStyle}>Private Notes</span>
            <textarea
              value={notes}
              disabled={saving}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => updateTargetProgram({ notes })}
              placeholder="Example: Email coach after showcase, follow admissions deadline, review roster needs..."
              style={textareaStyle}
            />
          </label>

          <div style={buttonRowStyle}>
            <Link href="/dashboard/player/target-programs" style={secondaryButtonStyle}>
              Manage Target Programs
            </Link>

            <button
              type="button"
              onClick={removeTargetProgram}
              disabled={saving}
              style={dangerButtonStyle}
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={addTargetProgram}
            disabled={saving}
            style={primaryButtonStyle}
          >
            Add to Target Programs
          </button>

          <Link href="/dashboard/player/target-programs" style={secondaryButtonStyle}>
            View Target Programs
          </Link>
        </div>
      )}

      {message ? <div style={messageStyle}>{message}</div> : null}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "1.25rem",
  fontWeight: 900,
};

const textStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontWeight: 800,
  lineHeight: 1.45,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const fieldStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
  display: "grid",
  gap: 5,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 900,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 9px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 92,
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 10px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  lineHeight: 1.45,
  resize: "vertical",
  outline: "none",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #cbd5e1",
};

const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  color: "#991b1b",
  border: "1px solid #fecaca",
  cursor: "pointer",
};

const savedBadgeStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  borderRadius: 999,
  padding: "6px 10px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: 12,
  fontWeight: 900,
};

const unsavedBadgeStyle: React.CSSProperties = {
  ...savedBadgeStyle,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#475569",
};

const messageStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};
// app/dashboard/player/profile/TabCoachesReferences.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CoachRef as PlayerCoachRef } from "@/app/lib/types/player";

/**
 * Tab 7: Coaches / References
 * - Plan gating (Redshirt disabled; Walk-On/All-American/Teams enabled)
 * - Add multiple coaches via “Add Coach / Reference”
 * - Fields per coach: First, Last, Team/Organization (choose or type), Email, Phone, Focus
 * - Team + Focus have datalist suggestions; still allow free typing
 * - localStorage persistence keyed by user email (with anon→email migration)
 * - Atomic save: forwardRef exposes getPayload() for parent Save Profile
 */

// ---------- Types ----------
export type PlanTier = "Redshirt" | "Walk-On" | "All-American" | "Teams";

/**
 * UI/local-storage shape (what this component edits)
 * This is intentionally NOT the same as the canonical payload shape.
 */
export type CoachRef = {
  id: string;
  firstName: string;
  lastName: string;
  team: string;
  email: string;
  phone: string;
  focus: string;
  addedAt: number;
};

type CoachesState = {
  coaches: CoachRef[];
};

/**
 * Payload handle exposed to parent.
 * IMPORTANT: This returns the canonical CoachRef type used by PlayerProfilePayload.
 */
export type CoachesHandle = {
  getPayload: () => { coaches: PlayerCoachRef[] };
};

type Props = {
  email?: string | null;
  planTier?: PlanTier;
  knownTeams?: string[];
};

// ---------- Helpers ----------
const KEY_PREFIX = "scoutlineCoaches";
const storageKey = (email?: string | null) => `${KEY_PREFIX}:${(email ?? "anon").toLowerCase().trim()}`;

const FOCUS_SUGGESTIONS = [
  "Head Coach",
  "Assistant Coach",
  "Pitching Coach",
  "Hitting Coach",
  "Catching Coach",
  "Fielding Coach",
  "Infield Coach",
  "Outfield Coach",
  "Strength Coach",
  "Speed/Agility Coach",
  "Trainer",
  "Mental Coach",
  "Recruiting Coach",
  "Club Director",
  "Academic Reference",
  "Guidance Counselor",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadState(email?: string | null): CoachesState {
  if (typeof window === "undefined") return { coaches: [] };
  const raw = localStorage.getItem(storageKey(email));
  if (!raw) return { coaches: [] };
  try {
    const parsed = JSON.parse(raw) as CoachesState;
    return { coaches: parsed.coaches ?? [] };
  } catch {
    return { coaches: [] };
  }
}

function saveState(email?: string | null, state?: CoachesState) {
  if (typeof window === "undefined" || !state) return;
  localStorage.setItem(storageKey(email), JSON.stringify(state));
}

function normalizePhone(v: string) {
  const digits = v.replace(/\D+/g, "").slice(0, 15);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Map the UI shape -> canonical payload CoachRef.
 * Canonical type requires at least `name`, and may allow additional optional fields.
 */
function toPayloadCoach(c: CoachRef): PlayerCoachRef {
  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();

  // We keep it conservative + compatible:
  // - name is required
  // - pass through what we can reasonably map
  // - use `as any` so we don't have to perfectly match optional fields in the canonical type
  return {
    name,
    email: c.email?.trim() ? c.email.trim() : null,
    phone: c.phone?.trim() ? c.phone.trim() : null,
    role: c.focus?.trim() ? c.focus.trim() : null,
    organization: c.team?.trim() ? c.team.trim() : null,
  } as any;
}

// ---------- Plan rules ----------
const PLAN_RULES: Record<PlanTier, { enabled: boolean }> = {
  Redshirt: { enabled: false },
  "Walk-On": { enabled: true },
  "All-American": { enabled: true },
  Teams: { enabled: true },
};

// ---------- Component ----------
const TabCoachesReferences = React.forwardRef<CoachesHandle, Props>(function TabCoachesReferences(
  { email: emailProp, planTier = "All-American", knownTeams = [] },
  ref
) {
  const PLAN = PLAN_RULES[planTier];

  // ---- Stable storage key + hydration guard + anon→email migration ----
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const prevKeyRef = React.useRef<string | null>(null);

  // decide which email key to use (prop → LS → anon)
  useEffect(() => {
    const fromProp = (emailProp ?? "").trim() || null;
    const fromLS =
      typeof window !== "undefined" ? (localStorage.getItem("scoutlineEmail") || "").trim() || null : null;
    const key = fromProp ?? fromLS ?? "anon";
    setResolvedEmail(key);
  }, [emailProp]);

  // migrate anon → email (if new key is empty)
  useEffect(() => {
    if (!resolvedEmail) return;
    const prevKey = prevKeyRef.current;
    if (prevKey && prevKey !== resolvedEmail) {
      const prevState = loadState(prevKey);
      const newState = loadState(resolvedEmail);
      const newIsEmpty = newState.coaches.length === 0;

      if (newIsEmpty && prevState.coaches.length > 0) {
        saveState(resolvedEmail, prevState);
      }
    }
    prevKeyRef.current = resolvedEmail;
  }, [resolvedEmail]);

  // actual local state
  const [state, setState] = useState<CoachesState>({ coaches: [] });

  // load once we know the key
useEffect(() => {
  if (!resolvedEmail) return;

  async function hydrate() {
    const local = loadState(resolvedEmail);

    // ✅ If localStorage already has data → use it
    if (local.coaches.length > 0) {
      setState(local);
      setHydrated(true);
      return;
    }

    // 🚨 Otherwise → pull from DB
    try {
      const res = await fetch(`/api/player/profile?email=${encodeURIComponent(resolvedEmail)}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (res.ok && json?.ok) {
        const dbCoaches = json?.normalized?.coaches || [];

        if (Array.isArray(dbCoaches) && dbCoaches.length > 0) {
          const mapped = dbCoaches.map((c: any) => {
            const parts = String(c.name || "").split(" ");
            return {
              id: uid(),
              firstName: parts[0] || "",
              lastName: parts.slice(1).join(" ") || "",
              team: c.organization || "",
              email: c.email || "",
              phone: c.phone || "",
              focus: c.role || "",
              addedAt: Date.now(),
            };
          });

          const newState = { coaches: mapped };

          setState(newState);
          saveState(resolvedEmail, newState); // ✅ backfill localStorage
        } else {
          setState({ coaches: [] });
        }
      } else {
        setState({ coaches: [] });
      }
    } catch {
      setState({ coaches: [] });
    }

    setHydrated(true);
  }

  hydrate();
}, [resolvedEmail]);

  // save after hydration (avoid blowing away storage on first mount)
  useEffect(() => {
    if (!hydrated || !resolvedEmail) return;
    saveState(resolvedEmail, state);
  }, [state, hydrated, resolvedEmail]);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  React.useImperativeHandle(ref, () => ({
    getPayload: () => ({
      // Only include entries that have a name (prevents empty rows from polluting payload)
      coaches: (state.coaches || [])
        .map(toPayloadCoach)
        .filter((c: any) => typeof c?.name === "string" && c.name.trim().length > 0),
    }),
  }));

  function flashMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1600);
  }

  function addCoach() {
    if (!PLAN.enabled) {
      setErr(`${planTier} plan cannot add coaches.`);
      return;
    }
    setErr(null);
    const id = uid();
    const draft: CoachRef = {
      id,
      firstName: "",
      lastName: "",
      team: "",
      email: "",
      phone: "",
      focus: "",
      addedAt: Date.now(),
    };
    setState((s) => ({ ...s, coaches: [draft, ...s.coaches] }));
    flashMsg("Added a coach/reference.");
  }

  function removeCoach(id: string) {
    setState((s) => ({ ...s, coaches: s.coaches.filter((c) => c.id !== id) }));
    flashMsg("Removed coach/reference.");
  }

  function updateCoach<T extends keyof CoachRef>(id: string, field: T, value: CoachRef[T]) {
    setState((s) => ({
      ...s,
      coaches: s.coaches.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  }

  const allTeams = useMemo(() => {
    const set = new Set(knownTeams.filter(Boolean).map((t) => t.trim()).filter((t) => t.length > 0));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [knownTeams]);

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "8px 0 32px" }}>
      {/* Info header */}
      <div
        style={{
          padding: "10px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f8fafc",
          color: "#334155",
          marginBottom: 12,
          lineHeight: 1.35,
        }}
      >
        <div>
          <strong>Who can edit?</strong> Player, Parent, and Team Admin can add / edit coaches and references.
        </div>
        <div style={{ marginTop: 6 }}>
          <strong>Plan Features:</strong> Available with Walk-On, All-American, and Teams plans. Not available with
          Redshirt plan.
        </div>
        <div style={{ marginTop: 6 }}>
          <strong>Public Visibility:</strong> References are visible to anyone viewing your ScoutLine profile.
        </div>
      </div>

      {!PLAN.enabled ? (
        <div style={{ ...cardStyle, background: "#f9fafb" }}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>References Unavailable</span>
            <span style={pillStyle}>Redshirt</span>
          </div>
          <p style={{ margin: 0, color: "#4b5563" }}>
            The Redshirt plan doesn’t include References. Upgrade to Walk-On, All-American, or Teams to enable these
            features.
          </p>
        </div>
      ) : (
        <>
          {/* Add button */}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button type="button" onClick={addCoach} style={buttonStyle}>
              Add Coach / Reference
            </button>
          </div>

          {/* List */}
          {state.coaches.length > 0 ? (
            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              {state.coaches.map((c) => {
                const teamListId = `teamOptions-${c.id}`;
                const focusListId = `focusOptions-${c.id}`;
                const titleId = `coach-title-${c.id}`;
                const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "New Coach / Reference";
                const emailValid = !c.email || looksLikeEmail(c.email);
                const phoneFormatted = c.phone;

                return (
                  <div key={c.id} style={tileStyle} role="group" aria-labelledby={titleId}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div id={titleId} style={{ fontWeight: 900, fontSize: "1.05rem" }}>
                        {name}
                      </div>
                      <button type="button" onClick={() => removeCoach(c.id)} style={removeButtonStyle}>
                        Remove Coach
                      </button>
                    </div>

                    {/* Fields grid */}
                    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      {/* Name */}
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr 1fr" }}>
                        <label style={labelStyle}>Coach Name</label>
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                          <input
                            placeholder="First name"
                            value={c.firstName}
                            onChange={(e) => updateCoach(c.id, "firstName", e.target.value)}
                            style={inputStyle}
                          />
                          <input
                            placeholder="Last name"
                            value={c.lastName}
                            onChange={(e) => updateCoach(c.id, "lastName", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Team / Organization */}
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                        <label style={labelStyle}>Team / Organization</label>
                        <div>
                          <input
                            list={teamListId}
                            placeholder="Choose or type a team"
                            value={c.team}
                            onChange={(e) => updateCoach(c.id, "team", e.target.value)}
                            style={inputStyle}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            name={`coachTeam-${c.id}`}
                            inputMode="text"
                          />
                          <datalist id={teamListId}>
                            {allTeams.map((t) => (
                              <option key={t} value={t} />
                            ))}
                          </datalist>
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                            Options come from Athletics tab (HS/Travel/Other Teams). You can also type a custom team or
                            organization.
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                        <label style={labelStyle}>Coach Email</label>
                        <input
                          type="email"
                          placeholder="coach@team.org"
                          value={c.email}
                          onChange={(e) => updateCoach(c.id, "email", e.target.value)}
                          style={{
                            ...inputStyle,
                            borderColor: emailValid ? "#e5e7eb" : "#ef4444",
                          }}
                          autoComplete="email"
                        />
                      </div>

                      {/* Phone */}
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                        <label style={labelStyle}>Coach Phone</label>
                        <input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={phoneFormatted}
                          onChange={(e) => updateCoach(c.id, "phone", normalizePhone(e.target.value))}
                          style={inputStyle}
                          autoComplete="tel"
                        />
                      </div>

                      {/* Focus */}
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "180px 1fr" }}>
                        <label style={labelStyle}>Coaching Focus</label>
                        <div>
                          <input
                            list={focusListId}
                            placeholder="e.g., Head Coach, Pitching Coach"
                            value={c.focus}
                            onChange={(e) => updateCoach(c.id, "focus", e.target.value)}
                            style={inputStyle}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            name={`coachFocus-${c.id}`}
                          />
                          <datalist id={focusListId}>
                            {FOCUS_SUGGESTIONS.map((f) => (
                              <option key={f} value={f} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...cardStyle, borderStyle: "dashed", color: "#6b7280" }}>
              <div style={{ marginBottom: 8, fontWeight: 800 }}>No coaches yet.</div>
              <div>Use “Add Coach / Reference” to start your list.</div>
            </div>
          )}

          {(msg || err) && (
            <div style={{ marginTop: 12, minHeight: 24 }}>
              {msg && <span style={{ color: "#15803d", fontWeight: 700 }}>{msg}</span>}
              {err && <span style={{ color: "#b91c1c", fontWeight: 700 }}>{err}</span>}
            </div>
          )}
        </>
      )}
    </section>
  );
});

export default TabCoachesReferences;

/* ---------- Styles ---------- */
const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  marginTop: 16,
  background: "#fff",
};
const tileStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  borderRadius: 16,
  padding: 12,
  background: "#fff",
};
const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};
const cardTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.05rem",
};
const pillStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
};
const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#111827",
  paddingTop: 8,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
};
const buttonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#e0f2fe",
  color: "#0f172a",
  fontWeight: 800,
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
};
const removeButtonStyle: React.CSSProperties = {
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 800,
  borderRadius: 12,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};
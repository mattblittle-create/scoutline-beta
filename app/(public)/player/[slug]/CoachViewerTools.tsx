// app/(public)/player/[slug]/CoachViewerTools.tsx

"use client";

import * as React from "react";

export default function CoachViewerTools(props: {
  isCoachViewer: boolean;
  playerProfileId: string | null;
  sectionScrollMargin?: number;
}) {
  const SECTION_SCROLL_MARGIN = props.sectionScrollMargin ?? 235;

  // ✅ HARD GATE: render nothing unless BOTH are true.
  if (!props.isCoachViewer || !props.playerProfileId) return null;

  const playerProfileId = props.playerProfileId;

  const [coachRatingLoading, setCoachRatingLoading] = React.useState(false);
  const [coachRatingSaving, setCoachRatingSaving] = React.useState(false);
  const [coachRatingError, setCoachRatingError] = React.useState<string | null>(null);
  const [coachRating, setCoachRating] = React.useState<number>(0);

  const [coachNotes, setCoachNotes] = React.useState<any[]>([]);
  const [coachNotesLoading, setCoachNotesLoading] = React.useState(false);
  const [coachNotesError, setCoachNotesError] = React.useState<string | null>(null);
  const [newCoachNoteText, setNewCoachNoteText] = React.useState("");
  const [addingCoachNote, setAddingCoachNote] = React.useState(false);

  const [coachListsLoading, setCoachListsLoading] = React.useState(false);
  const [coachListsError, setCoachListsError] = React.useState<string | null>(null);
  const [coachLists, setCoachLists] = React.useState<any[]>([]);
  const [coachSelectedListId, setCoachSelectedListId] = React.useState<string>("");
  const [coachSelectedListName, setCoachSelectedListName] = React.useState<string>("");
  const [coachMemberIds, setCoachMemberIds] = React.useState<Set<string>>(new Set());
  const [coachNewListName, setCoachNewListName] = React.useState("");
  const [coachCreatingList, setCoachCreatingList] = React.useState(false);
  const [coachListSaving, setCoachListSaving] = React.useState(false);
  const [coachListActionError, setCoachListActionError] = React.useState<string | null>(null);

  // Rating
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setCoachRatingLoading(true);
        setCoachRatingError(null);

        const rr = await fetch(`/api/coach/player-rating?playerProfileId=${encodeURIComponent(playerProfileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const rj = await rr.json().catch(() => ({}));
        if (cancelled) return;

        const n = Number(rj?.data?.rating ?? 0);
        const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
        setCoachRating(safe);
      } catch {
        if (!cancelled) setCoachRating(0);
      } finally {
        if (!cancelled) setCoachRatingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerProfileId]);

  // Notes
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setCoachNotesLoading(true);
        setCoachNotesError(null);

        const res = await fetch(`/api/coach/notes?playerProfileId=${encodeURIComponent(playerProfileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setCoachNotesError(json?.error || `Failed to load coach notes (${res.status})`);
          setCoachNotes([]);
          return;
        }

        const arr = Array.isArray(json?.data?.notes) ? json.data.notes : [];
        const sorted = [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCoachNotes(sorted);
      } catch (e: any) {
        if (!cancelled) {
          setCoachNotesError(e?.message || "Failed to load coach notes.");
          setCoachNotes([]);
        }
      } finally {
        if (!cancelled) setCoachNotesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerProfileId]);

  // Lists
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setCoachListsLoading(true);
        setCoachListsError(null);

        const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setCoachListsError(json?.error || `Failed to load lists (${res.status})`);
          setCoachLists([]);
          setCoachSelectedListId("");
          setCoachSelectedListName("");
          setCoachMemberIds(new Set());
          return;
        }

        const incoming = Array.isArray(json?.data?.lists) ? json.data.lists : [];
        setCoachLists(incoming);

        setCoachSelectedListId("");
        setCoachSelectedListName("");
        setCoachMemberIds(new Set());
      } catch (e: any) {
        if (!cancelled) {
          setCoachListsError(e?.message || "Failed to load lists.");
          setCoachLists([]);
        }
      } finally {
        if (!cancelled) setCoachListsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!coachSelectedListId) return;
    loadCoachSelectedListDetail(coachSelectedListId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachSelectedListId]);

  async function saveCoachRating(nextRating: number) {
    const clamped = Math.max(0, Math.min(5, Math.round(nextRating)));
    const next = coachRating === clamped ? 0 : clamped;

    const prev = coachRating;
    setCoachRating(next);
    setCoachRatingSaving(true);
    setCoachRatingError(null);

    try {
      const res = await fetch("/api/coach/player-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId, rating: next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to save rating (${res.status})`);

      const n = Number(json?.data?.rating ?? next);
      const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : next;
      setCoachRating(safe);
    } catch (e: any) {
      setCoachRating(prev);
      setCoachRatingError(e?.message || "Failed to save rating.");
    } finally {
      setCoachRatingSaving(false);
    }
  }

  async function addCoachNote() {
    if (!newCoachNoteText.trim()) return;

    try {
      setAddingCoachNote(true);
      setCoachNotesError(null);

      const res = await fetch("/api/coach/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerProfileId,
          noteText: newCoachNoteText.trim(),
          sharedWithOrg: true,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false || !json?.data?.note) {
        throw new Error(json?.error || `Failed to save note (${res.status})`);
      }

      setCoachNotes((prev) => [json.data.note, ...prev]);
      setNewCoachNoteText("");
    } catch (e: any) {
      setCoachNotesError(e?.message || "Failed to save note.");
    } finally {
      setAddingCoachNote(false);
    }
  }

  async function loadCoachSelectedListDetail(listId: string) {
    if (!listId) {
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return;
    }

    setCoachListActionError(null);

    const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(listId)}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      setCoachListActionError(json?.error || `Failed to load list (${res.status})`);
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return;
    }

    setCoachSelectedListName(json?.data?.list?.name || "Selected List");
    const ids = new Set<string>(
      (Array.isArray(json?.data?.members) ? json.data.members : [])
        .map((m: any) => String(m?.playerProfileId || "").trim())
        .filter(Boolean)
    );
    setCoachMemberIds(ids);
  }

  async function refreshCoachListsPreserveSelection() {
    const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) return;

    const incoming = Array.isArray(json?.data?.lists) ? json.data.lists : [];
    setCoachLists(incoming);

    setCoachSelectedListId((prev) => {
      if (prev && incoming.some((l: any) => l.id === prev)) return prev;
      setCoachSelectedListName("");
      setCoachMemberIds(new Set());
      return "";
    });
  }

  async function createCoachRecruitingList() {
    const name = coachNewListName.trim();
    if (!name) return;

    try {
      setCoachCreatingList(true);
      setCoachListActionError(null);

      const res = await fetch("/api/coach/recruiting-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to create list (${res.status})`);

      const newId = String(json?.data?.list?.id || "").trim();
      if (!newId) throw new Error("List created but missing id.");

      await refreshCoachListsPreserveSelection();
      setCoachSelectedListId(newId);
      setCoachNewListName("");
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to create list.");
    } finally {
      setCoachCreatingList(false);
    }
  }

  async function addPlayerToCoachSelectedList() {
    if (!coachSelectedListId) return;

    try {
      setCoachListSaving(true);
      setCoachListActionError(null);

      const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to add (${res.status})`);

      setCoachMemberIds((prev) => {
        const next = new Set(prev);
        next.add(playerProfileId);
        return next;
      });

      await refreshCoachListsPreserveSelection();
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to add player to list.");
    } finally {
      setCoachListSaving(false);
    }
  }

  async function removePlayerFromCoachSelectedList() {
    if (!coachSelectedListId) return;

    try {
      setCoachListSaving(true);
      setCoachListActionError(null);

      const res = await fetch(
        `/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members/${encodeURIComponent(playerProfileId)}`,
        { method: "DELETE", cache: "no-store" }
      );

      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed to remove (${res.status})`);

      setCoachMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(playerProfileId);
        return next;
      });

      await refreshCoachListsPreserveSelection();
    } catch (e: any) {
      setCoachListActionError(e?.message || "Failed to remove player from list.");
    } finally {
      setCoachListSaving(false);
    }
  }

  return (
    <>
      <div
        id="coach-notes"
        style={{
          scrollMarginTop: SECTION_SCROLL_MARGIN,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={coachLabel}>Internal Program Rating</div>

          {coachRatingLoading ? (
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Loading…</div>
          ) : (
            <RatingPickerInline value={coachRating} disabled={coachRatingSaving} onChange={(n) => saveCoachRating(n)} />
          )}

          {coachRatingSaving ? <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Saving…</div> : null}
        </div>
      </div>

      {coachRatingError ? (
        <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>{coachRatingError}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
          gap: 14,
          marginTop: 12,
        }}
      >
        {/* Notes */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>Coach Notes</div>

          <textarea
            value={newCoachNoteText}
            onChange={(e) => setNewCoachNoteText(e.target.value)}
            rows={3}
            placeholder="Add a note about this player (e.g. makeup, follow-up items)..."
            style={coachTextarea}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              onClick={addCoachNote}
              disabled={addingCoachNote || !newCoachNoteText.trim()}
              style={{ ...coachBtnGold, opacity: addingCoachNote || !newCoachNoteText.trim() ? 0.6 : 1 }}
            >
              {addingCoachNote ? "Saving…" : "Add Note"}
            </button>
          </div>

          {coachNotesLoading ? <div style={coachTinyMuted}>Loading notes…</div> : null}
          {coachNotesError ? <div style={coachTinyError}>{coachNotesError}</div> : null}

          {!coachNotesLoading && !coachNotesError && coachNotes.length === 0 ? (
            <div style={coachTinyMuted}>No notes yet.</div>
          ) : null}

          {!coachNotesLoading && !coachNotesError && coachNotes.length > 0 ? (
            <div style={{ display: "grid", gap: 10, maxHeight: 220, overflowY: "auto", paddingTop: 6 }}>
              {coachNotes.map((n: any) => (
                <div
                  key={n.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#f8fafc",
                    padding: "10px 10px",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.35 }}>
                    {n.noteText}
                  </div>

                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>
                      By {n?.coach?.name || (n?.coach?.email ? String(n.coach.email).split("@")[0] : "Coach")}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Lists */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>Recruiting Target Lists</div>

          {coachListsLoading ? <div style={coachTinyMuted}>Loading lists…</div> : null}
          {coachListsError ? <div style={coachTinyError}>{coachListsError}</div> : null}
          {coachListActionError ? <div style={coachTinyError}>{coachListActionError}</div> : null}

          <div style={{ display: "grid", gap: 10 }}>
            <div style={coachTinyMuted}>Create a list</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={coachNewListName}
                onChange={(e) => setCoachNewListName(e.target.value)}
                placeholder='e.g. "2028 Middle Infielders"'
                style={{ ...coachInput, flex: 1 }}
              />
              <button
                type="button"
                onClick={createCoachRecruitingList}
                disabled={coachCreatingList || !coachNewListName.trim()}
                style={{ ...coachBtnGold, opacity: coachCreatingList || !coachNewListName.trim() ? 0.6 : 1 }}
              >
                {coachCreatingList ? "Creating…" : "Create"}
              </button>
            </div>

            <div style={{ height: 1, background: "#eef2f7" }} />

            <div style={coachTinyMuted}>Add to an existing list</div>

            <select value={coachSelectedListId} onChange={(e) => setCoachSelectedListId(e.target.value)} style={coachInput}>
              <option value="">— Select a list —</option>
              {coachLists.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.memberCount})
                </option>
              ))}
            </select>

            {!coachSelectedListId ? (
              <div style={coachTinyMuted}>Select a list to add this player.</div>
            ) : coachMemberIds.has(playerProfileId) ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={coachTinyMuted}>
                  In <b>{coachSelectedListName || "this list"}</b>
                </div>
                <button
                  type="button"
                  onClick={removePlayerFromCoachSelectedList}
                  disabled={coachListSaving}
                  style={{ ...coachBtnDangerOutline, opacity: coachListSaving ? 0.7 : 1 }}
                >
                  {coachListSaving ? "Updating…" : "Remove"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={addPlayerToCoachSelectedList}
                disabled={coachListSaving}
                style={{ ...coachBtnGold, opacity: coachListSaving ? 0.7 : 1 }}
              >
                {coachListSaving ? "Adding…" : "Add Player to List"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** ---------- Styles ---------- */
const coachLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const coachInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
};

const coachTextarea: React.CSSProperties = {
  ...coachInput,
  minHeight: 90,
  resize: "none",
  lineHeight: 1.35,
};

const coachBtnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  cursor: "pointer",
};

const coachBtnDangerOutline: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 900,
  cursor: "pointer",
};

const coachTinyMuted: React.CSSProperties = { fontSize: 11, color: "#64748b", fontWeight: 700 };
const coachTinyError: React.CSSProperties = { fontSize: 11, color: "#b91c1c", fontWeight: 900, marginTop: 6 };

function RatingPickerInline(props: { value: number; disabled?: boolean; onChange: (n: number) => void }) {
  const v = Math.max(0, Math.min(5, Math.round(props.value || 0)));

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = i < v;

        return (
          <button
            key={n}
            type="button"
            disabled={props.disabled}
            onClick={() => props.onChange(n)}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(14,165,233,0.35)",
              background: "#fff",
              padding: 4,
              opacity: props.disabled ? 0.6 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
            }}
            title={`Set rating to ${n}/5`}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block" }}>
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill={filled ? "#caa042" : "#ffffff"}
                stroke="#0ea5e9"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}

      <button
        type="button"
        disabled={props.disabled}
        onClick={() => props.onChange(0)}
        style={{
          marginLeft: 6,
          border: "none",
          background: "transparent",
          color: "#0ea5e9",
          fontWeight: 900,
          fontSize: 12,
          opacity: props.disabled ? 0.6 : 1,
          cursor: props.disabled ? "not-allowed" : "pointer",
        }}
        title="Clear rating"
      >
        Clear
      </button>
    </div>
  );
}
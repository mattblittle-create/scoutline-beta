// app/(public)/player/[slug]/CoachViewerTools.tsx
"use client";

import * as React from "react";

export default function CoachViewerTools(props: {
  isCoachViewer: boolean;
  playerProfileId: string | null;
  sectionScrollMargin?: number;
}) {
  const SECTION_SCROLL_MARGIN = props.sectionScrollMargin ?? 235;

  const isActiveCoachViewer = !!props.isCoachViewer && !!props.playerProfileId;
  const playerProfileId = props.playerProfileId ?? "";

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

  const [staffLoading, setStaffLoading] = React.useState(false);
  const [staffError, setStaffError] = React.useState<string | null>(null);
  const [staffMembers, setStaffMembers] = React.useState<any[]>([]);
  const [shareRecipientMode, setShareRecipientMode] = React.useState<"selected" | "all">("selected");
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = React.useState("");
  const [shareSending, setShareSending] = React.useState(false);
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);
  const [shareError, setShareError] = React.useState<string | null>(null);

  // Rating
  React.useEffect(() => {
    if (!isActiveCoachViewer || !playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        setCoachRatingLoading(true);
        setCoachRatingError(null);

        const rr = await fetch(
          `/api/coach/player-rating?playerProfileId=${encodeURIComponent(playerProfileId)}`,
          { method: "GET", cache: "no-store" }
        );

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
  }, [isActiveCoachViewer, playerProfileId]);

  // Notes
  React.useEffect(() => {
    if (!isActiveCoachViewer || !playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        setCoachNotesLoading(true);
        setCoachNotesError(null);

        const res = await fetch(
          `/api/coach/notes?playerProfileId=${encodeURIComponent(playerProfileId)}`,
          { method: "GET", cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setCoachNotesError(json?.error || `Failed to load coach notes (${res.status})`);
          setCoachNotes([]);
          return;
        }

        const arr = Array.isArray(json?.data?.notes) ? json.data.notes : [];
        const sorted = [...arr].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
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
  }, [isActiveCoachViewer, playerProfileId]);

  // Lists
  React.useEffect(() => {
    if (!isActiveCoachViewer || !playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        setCoachListsLoading(true);
        setCoachListsError(null);

        const res = await fetch("/api/coach/recruiting-lists", {
          method: "GET",
          cache: "no-store",
        });

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
  }, [isActiveCoachViewer, playerProfileId]);

  React.useEffect(() => {
    if (!coachSelectedListId) return;
    loadCoachSelectedListDetail(coachSelectedListId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachSelectedListId]);

  React.useEffect(() => {
    if (!isActiveCoachViewer || !playerProfileId) return;

    let cancelled = false;

    (async () => {
      try {
        setStaffLoading(true);
        setStaffError(null);

        const res = await fetch("/api/coach/staff", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setStaffError(json?.error || `Failed to load staff (${res.status})`);
          setStaffMembers([]);
          return;
        }

        const arr = Array.isArray(json?.data?.staff) ? json.data.staff : [];
        const currentUserId = String(json?.data?.currentUserId || "");

        setStaffMembers(arr.filter((s: any) => String(s?.id || "") !== currentUserId));
      } catch (e: any) {
        if (!cancelled) {
          setStaffError(e?.message || "Failed to load staff.");
          setStaffMembers([]);
        }
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActiveCoachViewer, playerProfileId]);

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
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Failed to save rating (${res.status})`);
      }

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

      const res = await fetch(
        `/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ playerProfileId }),
        }
      );

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
        `/api/coach/recruiting-lists/${encodeURIComponent(coachSelectedListId)}/members/${encodeURIComponent(
          playerProfileId
        )}`,
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

  function toggleSelectedStaff(userId: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function sharePlayerCardWithStaff() {
    try {
      setShareSending(true);
      setShareError(null);
      setShareStatus(null);

      const ids = Array.from(selectedStaffIds);

      if (shareRecipientMode === "selected" && ids.length === 0) {
        throw new Error("Select at least one staff member or choose All Staff.");
      }

      const res = await fetch("/api/coach/share-player-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerProfileId,
          recipientMode: shareRecipientMode,
          recipientUserIds: ids,
          message: shareMessage.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Failed to share player card (${res.status})`);
      }

      const sentTo = Array.isArray(json?.data?.sentTo) ? json.data.sentTo.length : 0;
      setShareStatus(`Player card shared with ${sentTo} staff member${sentTo === 1 ? "" : "s"}.`);
      setShareMessage("");
    } catch (e: any) {
      setShareError(e?.message || "Failed to share player card.");
    } finally {
      setShareSending(false);
    }
  }

  const listsContainingPlayer = coachLists.filter((l: any) => !!l?.containsPlayer);

  const savedListCount = listsContainingPlayer.length;

  if (!isActiveCoachViewer || !playerProfileId) return null;

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
          {savedListCount > 0 ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: 11,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              Saved in {savedListCount} list{savedListCount === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      </div>

      {coachRatingError ? (
        <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>{coachRatingError}</div>
      ) : null}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 14,
    marginTop: 12,
    alignItems: "start",
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
                      {new Date(n.createdAt).toLocaleString(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})}
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
            {listsContainingPlayer.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {listsContainingPlayer.map((l: any) => (
                  <div
                    key={l.id}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {l.name}
                  </div>
                ))}
              </div>
            ) : null}

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

        {/* Share */}
        <div
          style={{
            gridColumn: "1 / -1",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
            background: "#fff",
            minWidth: 0,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
            Share Player Card with Staff
          </div>

          {staffLoading ? <div style={coachTinyMuted}>Loading staff…</div> : null}
          {staffError ? <div style={coachTinyError}>{staffError}</div> : null}
          {shareError ? <div style={coachTinyError}>{shareError}</div> : null}
          {shareStatus ? <div style={{ ...coachTinyMuted, color: "#166534", fontWeight: 900 }}>{shareStatus}</div> : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 0.9fr) minmax(280px, 1.2fr) minmax(200px, auto)",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={shareRecipientMode}
                onChange={(e) => setShareRecipientMode(e.target.value === "all" ? "all" : "selected")}
                style={coachInput}
              >
                <option value="selected">Select staff member(s)</option>
                <option value="all">All staff</option>
              </select>

              {shareRecipientMode === "selected" ? (
                <div style={{ display: "grid", gap: 8, maxHeight: 90, overflowY: "auto" }}>
                  {staffMembers.length === 0 && !staffLoading ? (
                    <div style={coachTinyMuted}>No other staff members found.</div>
                  ) : null}

                  {staffMembers.map((s: any) => {
                    const id = String(s?.id || "");
                    const checked = selectedStaffIds.has(id);

                    return (
                      <label
                        key={id}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedStaff(id)}
                        />
                        <span>
                          {s?.name || s?.email || "Coach"}
                          {s?.staffTitle ? <span style={{ color: "#64748b" }}> — {s.staffTitle}</span> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={coachTinyMuted}>This will email all other staff members linked to your program.</div>
              )}
            </div>

            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
              placeholder="Optional note for your staff..."
              style={coachTextarea}
            />

            <button
              type="button"
              onClick={sharePlayerCardWithStaff}
              disabled={
                shareSending ||
                staffLoading ||
                (shareRecipientMode === "selected" && selectedStaffIds.size === 0)
              }
              style={{
                ...coachBtnGold,
                minWidth: 200,
                height: 44,
                alignSelf: "start",
                opacity:
                  shareSending ||
                  staffLoading ||
                  (shareRecipientMode === "selected" && selectedStaffIds.size === 0)
                    ? 0.6
                    : 1,
              }}
            >
              {shareSending ? "Sharing…" : "Share Player Card"}
            </button>
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
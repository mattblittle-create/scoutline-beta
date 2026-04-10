// app/dashboard/coach/player/[profileId]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PublicProfileHeader from "@/app/components/public/PublicProfileHeader";
import PublicAcademics, { AcademicsData } from "@/app/components/public/PublicAcademics";
import PublicAthletics, { AthleticsData, TeamEntry } from "@/app/components/public/PublicAthletics";
import PublicStats from "@/app/components/public/PublicStats";
import PublicMetrics, { MetricsData } from "@/app/components/public/PublicMetrics";
import PublicMedia, { MediaData } from "@/app/components/public/PublicMedia";
import PublicCoaches, { CoachesData } from "@/app/components/public/PublicCoaches";

import { toPublicMedia } from "@/app/lib/publicMedia";
import { normalizePlanTier, normalizeActivityStatus, canViewSection, canViewCoreField } from "@/app/lib/visibility";

type ProfileSummary = {
  id: string;
  email: string;
  profileState: string;
  ownershipMode: string;
  ownerTeamId: string | null;
  hasActiveTeamBilling: boolean;
  hasActivePlayerBilling: boolean;
};

type UserSummary =
  | {
      id: string;
      name: string | null;
      email: string;
      slug?: string | null;
      photoUrl?: string | null;
    }
  | null;

type PlayerSummary =
  | {
      gradYear: number | null;
      primaryPos: string | null;
      secondaryPos: string | null;
      bats: string | null;
      throws: string | null;
      hsName: string | null;
      travelTeam: string | null;
      hometown: string | null;
      state: string | null;
    }
  | null;

type MetricsSnapshot =
  | {
      topExitVelo: number | null;
      topPitchVelo: number | null;
      popTime: number | null;
      lastUpdated: string | null;
    }
  | null;

type StatsSnapshot =
  | {
      season: string | null;
      team: string | null;
      avg: number | null;
      obp: number | null;
      slg: number | null;
      gp: number | null;
      pa: number | null;
      ab: number | null;
    }
  | null;

type ApiOk = {
  ok: true;
  data: {
    profile: ProfileSummary;
    user: UserSummary;
    player: PlayerSummary;
    metrics: MetricsSnapshot;
    stats: StatsSnapshot;
  };
};

type ApiErr = {
  ok: false;
  error: string;
};

type CoachNote = {
  id: string;
  noteText: string;
  sharedWithOrg: boolean;
  createdAt: string;
  coach: {
    id: string;
    name: string | null;
    email: string;
  };
  teamName?: string | null;
  collegeName?: string | null;
};

type NotesListOk = {
  ok: true;
  data: {
    notes: CoachNote[];
  };
};

type NotesErr = {
  ok: false;
  error: string;
};

type RecruitingListSummary = {
  id: string;
  name: string;
  memberCount: number;
};

type RecruitingListMemberMini = {
  playerProfileId: string;
};

type ListsGetOk = { ok: true; data: { lists: RecruitingListSummary[] } };
type ListDetailOk = { ok: true; data: { list: { id: string; name: string }; members: RecruitingListMemberMini[] } };

type Props = {
  params: { profileId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

/** ---------- Tiny shared response helpers ---------- */
type ApiOkGeneric<T> = { ok: true; data: T };
type ApiErrGeneric = { ok: false; error: string };

function assertOk<T>(json: ApiOkGeneric<T> | ApiErrGeneric): asserts json is ApiOkGeneric<T> {
  if (!json.ok) throw new Error(json.error || "Request failed");
}

// Add-note POST response
type AddNoteOk = ApiOkGeneric<{ note: CoachNote }>;
type AddNoteErr = ApiErrGeneric;

export default function CoachPlayerDetailPage({ params, searchParams }: Props) {
  const router = useRouter();
  const profileId = params.profileId;
  const sourceParam = (searchParams?.source as string | undefined) || undefined;

  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [user, setUser] = useState<UserSummary>(null);
  const [player, setPlayer] = useState<PlayerSummary>(null);
  const [metrics, setMetrics] = useState<MetricsSnapshot>(null);
  const [stats, setStats] = useState<StatsSnapshot>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------- Public Profile payload (same as /player/[slug]) ----------------
  const sp = useSearchParams();
  const [publicData, setPublicData] = useState<any | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicErr, setPublicErr] = useState<string | null>(null);

  // ---------------- Player Rating (coach/program-only) ----------------
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);

  // Coach notes
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Recruiting Lists (program-wide)
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [lists, setLists] = useState<RecruitingListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedListName, setSelectedListName] = useState<string>("");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  const isInSelectedList = !!profileId && memberIds.has(profileId);
  const [listSaving, setListSaving] = useState(false);
  const [listActionError, setListActionError] = useState<string | null>(null);

  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatOkMsg, setChatOkMsg] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Load core player detail + metrics/stats snapshot
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const query = sourceParam ? `?source=${encodeURIComponent(sourceParam)}` : "";
        const res = await fetch(`/api/coach/player/${profileId}${query}`, {
          method: "GET",
          cache: "no-store",
        });

        const json: ApiOk | ApiErr = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          const msg =
            (!json.ok && "error" in json && (json as ApiErr).error) || `Request failed with status ${res.status}`;
          setError(msg);
          setProfile(null);
          setUser(null);
          setPlayer(null);
          setMetrics(null);
          setStats(null);
          return;
        }

        setProfile(json.data.profile);
        setUser(json.data.user);
        setPlayer(json.data.player);
        setMetrics(json.data.metrics ?? null);
        setStats(json.data.stats ?? null);
      } catch (err) {
        console.error("Error loading coach player detail", err);
        if (!cancelled) {
          setError("Failed to load player details.");
          setProfile(null);
          setUser(null);
          setPlayer(null);
          setMetrics(null);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId, sourceParam]);

  // Fetch the same payload used by the public profile page, using slug from /api/coach/player/[profileId]
  useEffect(() => {
    const slug = (user as any)?.slug ? String((user as any).slug) : "";
    if (!slug) return;

    let cancelled = false;

    (async () => {
      try {
        setPublicLoading(true);
        setPublicErr(null);

        // Keep it fresh in dev; safe in prod too.
        const debugParam = sp.get("debug") === "1";
        const demoParam = sp.get("demo") === "1";

        const qsParts: string[] = [];
        if (demoParam) qsParts.push("demo=1");
        if (debugParam) qsParts.push("debug=1");

        // In dev we always want fresh data; in prod it's still safe for coaches.
        qsParts.push("fresh=1");

        const qs = qsParts.length ? `?${qsParts.join("&")}` : "";
        const res = await fetch(`/api/public/player/${encodeURIComponent(slug)}${qs}`, { cache: "no-store" });

        if (res.status === 404) {
          if (!cancelled) {
            setPublicData(null);
            setPublicErr("Public profile not found for this player.");
          }
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load public profile.");

        if (!cancelled) setPublicData(json.data || null);
      } catch (e: any) {
        if (!cancelled) {
          setPublicData(null);
          setPublicErr(e?.message || "Failed to load public profile.");
        }
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ⭐ Load coach/program rating for this player profile
  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;

    async function loadRating() {
      try {
        setRatingLoading(true);
        setRatingError(null);

        const res = await fetch(`/api/coach/player-rating?playerProfileId=${encodeURIComponent(profileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || json?.ok === false) {
          setRating(0);
          return;
        }

        const n = Number(json?.data?.rating ?? 0);
        const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
        setRating(safe);
      } catch {
        if (!cancelled) setRating(0);
      } finally {
        if (!cancelled) setRatingLoading(false);
      }
    }

    loadRating();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // Load coach notes for this player profile
  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;

    async function loadNotes() {
      try {
        setNotesLoading(true);
        setNotesError(null);

        const res = await fetch(`/api/coach/notes?playerProfileId=${encodeURIComponent(profileId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json: NotesListOk | NotesErr = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.ok) {
          const msg =
            (!json.ok && "error" in json && (json as NotesErr).error) || `Request failed with status ${res.status}`;
          setNotesError(msg);
          setNotes([]);
          return;
        }

        const sorted = [...json.data.notes].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotes(sorted);
      } catch (err) {
        console.error("Error loading coach notes", err);
        if (!cancelled) {
          setNotesError("Failed to load coach notes.");
          setNotes([]);
        }
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // Load recruiting lists (initial)
  useEffect(() => {
    let cancelled = false;

    async function loadLists(opts?: { preserveSelection?: boolean }) {
      try {
        setListsLoading(true);
        setListsError(null);

        const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
        const json: ListsGetOk | ApiErr = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setListsError((!json.ok && (json as any).error) || `Failed to load lists (${res.status})`);
          setLists([]);
          setSelectedListId("");
          setSelectedListName("");
          setMemberIds(new Set());
          return;
        }

        const incoming = Array.isArray(json.data.lists) ? json.data.lists : [];
        setLists(incoming);

        const preserve = !!opts?.preserveSelection;

        if (!preserve) {
          setSelectedListId("");
          setSelectedListName("");
          setMemberIds(new Set());
          return;
        }

        setSelectedListId((prev) => {
          if (prev && incoming.some((l) => l.id === prev)) return prev;
          setSelectedListName("");
          setMemberIds(new Set());
          return "";
        });
      } catch (e: any) {
        if (!cancelled) {
          setListsError(e?.message || "Failed to load lists.");
          setLists([]);
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    }

    loadLists({ preserveSelection: false });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load selected list detail (members)
  useEffect(() => {
    if (!selectedListId) {
      setSelectedListName("");
      setMemberIds(new Set());
      return;
    }

    let cancelled = false;

    async function loadListDetail() {
      try {
        setListActionError(null);

        const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const json: ListDetailOk | ApiErr = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setListActionError((!json.ok && (json as any).error) || `Failed to load list (${res.status})`);
          setSelectedListName("");
          setMemberIds(new Set());
          return;
        }

        setSelectedListName(json.data.list.name || "Selected List");

        const ids = new Set<string>(
          (Array.isArray(json.data.members) ? json.data.members : [])
            .map((m) => String((m as any).playerProfileId || "").trim())
            .filter(Boolean)
        );
        setMemberIds(ids);
      } catch (e: any) {
        if (!cancelled) {
          setListActionError(e?.message || "Failed to load list.");
          setMemberIds(new Set());
        }
      }
    }

    loadListDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedListId]);

  async function refreshListsPreserveSelection() {
    try {
      const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) return;

      const incoming = Array.isArray(json.data?.lists) ? json.data.lists : [];
      setLists(incoming);

      // If the selected list no longer exists, clear selection
      setSelectedListId((prev) => {
        if (prev && incoming.some((l: any) => l.id === prev)) return prev;
        setSelectedListName("");
        setMemberIds(new Set());
        return "";
      });
    } catch {
      // silent best-effort refresh
    }
  }

  async function saveRating(nextRating: number) {
    if (!profileId) return;

    const clamped = Math.max(0, Math.min(5, Math.round(nextRating)));
    const next = rating === clamped ? 0 : clamped;

    const prev = rating;
    setRating(next);
    setRatingSaving(true);
    setRatingError(null);

    try {
      const res = await fetch("/api/coach/player-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerProfileId: profileId,
          rating: next,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Failed to save rating (${res.status})`);
      }

      const n = Number(json?.data?.rating ?? next);
      const safe = Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : next;
      setRating(safe);
    } catch (e: any) {
      setRating(prev);
      setRatingError(e?.message || "Failed to save rating.");
    } finally {
      setRatingSaving(false);
    }
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    if (!profileId) return;

    try {
      setAddingNote(true);
      setNotesError(null);

      const res = await fetch("/api/coach/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          playerProfileId: profileId,
          noteText: newNoteText.trim(),
          sharedWithOrg: true, // ✅ always shared with staff
        }),
      });

      const json: AddNoteOk | AddNoteErr = await res
        .json()
        .catch(() => ({ ok: false, error: "Bad response" } as AddNoteErr));

      if (!res.ok) {
        // if server returned non-2xx, prefer payload error when available
        if (!json.ok) throw new Error(json.error || `Failed to save note (status ${res.status})`);
        throw new Error(`Failed to save note (status ${res.status})`);
      }

      // ✅ narrows json; guarantees json.data.note exists
      assertOk(json);

      setNotes((prev) => [json.data.note, ...prev]);
      setNewNoteText("");
    } catch (err: any) {
      console.error("Error adding coach note", err);
      setNotesError(err?.message || "Failed to save note.");
    } finally {
      setAddingNote(false);
    }
  };

  const createRecruitingList = async () => {
    const name = newListName.trim();
    if (!name) return;

    try {
      setCreatingList(true);
      setListActionError(null);

      const res = await fetch("/api/coach/recruiting-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to create list (${res.status})`);
      }

      const newId = String(json?.data?.list?.id || "").trim();
      if (!newId) throw new Error("List created but missing list id.");

      // refresh lists (best-effort)
      const res2 = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
      const json2 = await res2.json().catch(() => ({}));
      if (res2.ok && json2?.ok) {
        const incoming = Array.isArray(json2.data?.lists) ? json2.data.lists : [];
        setLists(incoming);
      }

      setSelectedListId(newId);
      setSelectedListName(""); // filled by detail loader
      setMemberIds(new Set());
      setNewListName("");
    } catch (e: any) {
      setListActionError(e?.message || "Failed to create list.");
    } finally {
      setCreatingList(false);
    }
  };

  const addPlayerToSelectedList = async () => {
    if (!selectedListId || !profileId) return;

    try {
      setListSaving(true);
      setListActionError(null);

      const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ playerProfileId: profileId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to add player (${res.status})`);
      }

      setMemberIds((prev) => {
        const next = new Set(prev);
        next.add(profileId);
        return next;
      });
      await refreshListsPreserveSelection();
    } catch (e: any) {
      setListActionError(e?.message || "Failed to add player to list.");
    } finally {
      setListSaving(false);
    }
  };

  const removePlayerFromSelectedList = async () => {
    if (!selectedListId || !profileId) return;

    try {
      setListSaving(true);
      setListActionError(null);

      const res = await fetch(
        `/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}/members/${encodeURIComponent(profileId)}`,
        { method: "DELETE", cache: "no-store" }
      );

      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (!res.ok || json?.ok === false) {
        throw new Error((json as any)?.error || `Failed to remove player (${res.status})`);
      }

      setMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
      await refreshListsPreserveSelection();
    } catch (e: any) {
      setListActionError(e?.message || "Failed to remove player from list.");
    } finally {
      setListSaving(false);
    }
  };

    async function sendFirstChatMessage() {
    const otherUserId = String(user?.id || "").trim();
    const initialMessage = chatDraft.trim();

    if (!otherUserId) {
      setChatError("Player user account is not available for chat.");
      return;
    }

    if (!initialMessage) {
      setChatError("Enter a message first.");
      return;
    }

    try {
      setChatSending(true);
      setChatError(null);
      setChatOkMsg(null);

      const res = await fetch("/api/chat/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          otherUserId,
          subject: "ScoutLine Coach Outreach",
          initialMessage,
        }),
      });

const json = await res.json().catch(() => ({}));
if (!res.ok || json?.ok === false) {
  throw new Error(json?.error || `Failed to send message (${res.status})`);
}

const conversationId = json?.data?.conversation?.id;

setChatDraft("");

if (conversationId) {
  router.push(`/dashboard/coach/chat?conversationId=${conversationId}`);
} else {
  setChatOkMsg("Message sent. The player can now reply in ScoutLine Chat.");
  setTimeout(() => setChatOkMsg(null), 2500);
}
    } catch (e: any) {
      setChatError(e?.message || "Failed to send message.");
    } finally {
      setChatSending(false);
    }
  }

  const playerName = user?.name || (user?.email ? user.email.split("@")[0] : "Player");

  return (
    <main style={wrap}>
      {/* Top bar */}
      <header style={topRow}>
        <button type="button" onClick={() => router.push("/dashboard/coach/recruiting-board")} style={backBtn}>
          <span style={{ marginRight: 6 }}>←</span> Back to Recruiting Board
        </button>
      </header>

      {/* Heading */}
      <section style={headingRow}>
        <div style={{ minWidth: 0 }}>
          <div style={ratingRow}>
            <div style={ratingLabel}>Internal Program Rating</div>

            {ratingLoading ? <div style={mutedTiny}>Loading…</div> : <RatingPicker value={rating} disabled={ratingSaving} onChange={(n) => saveRating(n)} />}

            {ratingSaving ? <div style={mutedTiny}>Saving…</div> : null}
          </div>

          {ratingError ? <div style={errorTiny}>{ratingError}</div> : null}

          <div style={h1}>{playerName}</div>

          {player?.gradYear ? <div style={subLine}>Class of {player.gradYear}</div> : null}
          {user?.email ? <div style={subLine2}>{user.email}</div> : null}
        </div>
      </section>

      {/* Load states */}
      {loading ? <div style={muted}>Loading player details…</div> : null}
      {!loading && error ? <div style={errorBox}>{error}</div> : null}
      {!loading && !error && !profile ? <div style={muted}>Player profile not available.</div> : null}

      {!loading && !error && profile ? (
        <section style={twoCol}>
          {/* Left: Public Profile UI (same layout as /player/[slug]) */}
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            {publicLoading ? <div style={muted}>Loading full player profile…</div> : null}
            {publicErr ? <div style={errorBox}>{publicErr}</div> : null}

            {!publicLoading && !publicErr && publicData?.profile ? (
              <CoachPublicProfileBody slug={String((user as any)?.slug || "")} data={publicData} cardStyle={card} h1Style={h1} />
            ) : null}

            {!publicLoading && !publicErr && !publicData?.profile ? <div style={muted}>Full public profile data not available yet.</div> : null}
          </div>

          {/* Right */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={card}>
              <div style={rowBetween}>
                <div style={sectionTitle}>Message Player</div>
                <div style={helperTiny}>Coach-initiated first contact through ScoutLine Chat.</div>
              </div>

              <div style={stackSm}>
                <div style={tinyMutedText}>
                  This creates the ScoutLine chat thread for this player. After that, the player can reply directly inside ScoutLine Chat.
                </div>

                <textarea
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  rows={4}
                  placeholder={`Message ${playerName}...`}
                  style={textarea}
                />

                <div style={rowEnd}>
                  <button
                    type="button"
                    onClick={sendFirstChatMessage}
                    disabled={chatSending || !chatDraft.trim() || !user?.id}
                    style={{ ...btnGold, opacity: chatSending || !chatDraft.trim() || !user?.id ? 0.6 : 1 }}
                  >
                    {chatSending ? "Sending…" : "Send ScoutLine Message"}
                  </button>
                </div>

                {chatError ? <div style={tinyErrorText}>{chatError}</div> : null}
                {chatOkMsg ? <div style={{ ...tinyMutedText, color: "#047857", fontWeight: 900 }}>{chatOkMsg}</div> : null}
              </div>
            </div>

            <div style={card}>
              <div style={rowBetween}>
                <div style={sectionTitle}>Coach Notes</div>
                <div style={helperTiny}>Notes are visible to you and your linked staff only.</div>
              </div>

              <div style={notesFormWrap}>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={3}
                  placeholder="Add a note about this player (e.g. makeup, intangibles, follow-up items)..."
                  style={textarea}
                />

                <div style={rowEnd}>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteText.trim()}
                    style={{ ...btnGold, opacity: addingNote || !newNoteText.trim() ? 0.6 : 1 }}
                  >
                    {addingNote ? "Saving…" : "Add Note"}
                  </button>
                </div>
              </div>

              {notesLoading ? <div style={tinyMutedText}>Loading notes…</div> : null}
              {notesError ? <div style={tinyErrorText}>{notesError}</div> : null}

              {!notesLoading && !notesError && notes.length === 0 ? (
                <div style={tinyMutedText}>No notes yet. Add your first note above.</div>
              ) : null}

              {!notesLoading && !notesError && notes.length > 0 ? (
                <div style={notesListWrap}>
                  {notes.map((note) => {
                    const pillStyle = note.sharedWithOrg ? pillShared : pillPrivate;
                    return (
                      <div key={note.id} style={noteCard}>
                        <div style={noteText}>{note.noteText}</div>

                        <div style={noteMetaRow}>
                          <div style={noteMetaLeft}>By {formatNoteAttribution(note)}</div>

                          <div style={noteMetaRight}>
                            <span style={noteDate}>{formatShortDate(note.createdAt)}</span>
                            <span style={pillStyle}>{note.sharedWithOrg ? "Shared" : "Private"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div style={card}>
              <div style={rowBetween}>
                <div style={sectionTitle}>Recruiting Target Lists</div>
                <div style={helperTiny}>Create lists and share with your linked staff.</div>
              </div>

              {listsLoading ? <div style={tinyMutedText}>Loading lists…</div> : null}
              {listsError ? <div style={tinyErrorText}>{listsError}</div> : null}
              {listActionError ? <div style={tinyErrorText}>{listActionError}</div> : null}

              <div style={stackSm}>
                <div style={helperTiny}>Create a list</div>
                <div style={rowBetweenTight}>
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder='e.g. "2028 Middle Infielders"'
                    style={{ ...input, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={createRecruitingList}
                    disabled={creatingList || !newListName.trim()}
                    style={{ ...btnGold, opacity: creatingList || !newListName.trim() ? 0.6 : 1 }}
                  >
                    {creatingList ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>

              <div style={divider} />

              <div style={stackSm}>
                <div style={helperTiny}>Add to an existing list</div>

                <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} style={input}>
                  <option value="">— Select a list —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.memberCount})
                    </option>
                  ))}
                </select>

                {!selectedListId ? (
                  <div style={tinyMutedText}>Select a list to add this player.</div>
                ) : isInSelectedList ? (
                  <div style={rowBetweenTight}>
                    <div style={tinyMutedText}>
                      In <b>{selectedListName || "this list"}</b>
                    </div>
                    <button
                      type="button"
                      onClick={removePlayerFromSelectedList}
                      disabled={listSaving}
                      style={{ ...btnDangerOutline, opacity: listSaving ? 0.7 : 1 }}
                    >
                      {listSaving ? "Updating…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={addPlayerToSelectedList} disabled={listSaving} style={{ ...btnGold, opacity: listSaving ? 0.7 : 1 }}>
                    {listSaving ? "Adding…" : "Add Player to List"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function StarIcon(props: { filled: boolean; size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block" }}>
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill={props.filled ? "#caa042" : "#ffffff"}
        stroke="#0ea5e9"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RatingPicker(props: { value: number; disabled?: boolean; onChange: (n: number) => void }) {
  const v = Math.max(0, Math.min(5, Math.round(props.value || 0)));

  return (
    <div style={ratingPickerRow}>
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
              ...ratingStarBtn,
              opacity: props.disabled ? 0.6 : 1,
              cursor: props.disabled ? "not-allowed" : "pointer",
            }}
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            title={`Set rating to ${n}/5`}
          >
            <StarIcon filled={filled} />
          </button>
        );
      })}

      <button
        type="button"
        disabled={props.disabled}
        onClick={() => props.onChange(0)}
        style={{
          ...ratingClearBtn,
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

function InfoRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div style={infoItem}>
      <div style={infoLabel}>{props.label}</div>
      <div style={infoValue}>{props.value}</div>
    </div>
  );
}

function MetricChip(props: { label: string; value: string }) {
  return (
    <div style={metricChip}>
      <div style={metricLabel}>{props.label}</div>
      <div style={metricValue}>{props.value}</div>
    </div>
  );
}

function StatLine(props: { label: string; value: string }) {
  return (
    <div style={statLine}>
      <span style={statLabel}>{props.label}</span>
      <span style={statValue}>{props.value}</span>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatNoteAttribution(note: CoachNote): string {
  const who = note.coach?.name || (note.coach?.email ? note.coach.email.split("@")[0] : "Coach");
  if (note.collegeName) return `${who} • ${note.collegeName}`;
  if (note.teamName) return `${who} • ${note.teamName}`;
  return who;
}

function formatAvg(val: number | null): string {
  if (val == null || Number.isNaN(val)) return "—";
  const fixed = val.toFixed(3);
  return fixed.startsWith("0") ? fixed.slice(1) : fixed;
}

function CoachPublicProfileBody(props: { slug: string; data: any; cardStyle: CSSProperties; h1Style: CSSProperties }) {
  const data = props.data;
  const profile = (data?.profile ?? {}) as any;

  // ---- Visibility context (use PUBLIC rules so it matches the public page layout) ----
  const plan = normalizePlanTier(data?.planTier ?? profile?.planTier ?? "Teams");
  const status = normalizeActivityStatus(profile?.activityStatus ?? profile?.status ?? null);

  const corePrivacy = {
    emailPrivate: Boolean(profile?.corePrivacy?.emailPrivate ?? profile?.emailPrivate),
    phonePrivate: Boolean(profile?.corePrivacy?.phonePrivate ?? profile?.phonePrivate),
    dobPrivate: Boolean(profile?.corePrivacy?.dobPrivate ?? profile?.dobPrivate),
  };

  const ctx = { viewer: "PUBLIC" as const, plan, status, corePrivacy };

  // ✅ Coach dashboard view should always show these sections.
  const showVideoSocial = true;
  const showCoachesRefs = true;

  // ---------- Academics mapping ----------
  const toArray = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
  const ac = profile.academics ?? {};
  const academicsData: AcademicsData = {
    bio: ac.bio ?? ac.academicBio ?? null,
    gradYear: profile.gradYear ?? ac.gradYear ?? null,
    gpa: profile.gpa ?? ac.gpa ?? null,
    gpaOutOf: ac.gpaOutOf ?? ac.gpa_scale ?? ac.gpaScale ?? null,
    sat: ac.sat ?? ac.satScore ?? null,
    act: ac.act ?? ac.actScore ?? null,
    highSchool: ac.highSchool ?? ac.highSchoolName ?? null,
    city: ac.city ?? ac.hsCity ?? null,
    state: ac.state ?? ac.hsState ?? null,
    areasOfStudy: Array.isArray(ac.areasOfStudy)
      ? ac.areasOfStudy
      : String(ac.areasOfStudyInput ?? ac.intendedMajors ?? ac.academicMajors ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
    transcriptUrls: toArray(ac.transcripts ?? ac.transcriptUrls ?? ac.transcriptUrl).map(String).filter(Boolean),
    reportCardUrls: toArray(ac.reportCards ?? ac.reportCardUrls ?? ac.reportCardUrl).map(String).filter(Boolean),
    otherDocs: toArray(ac.otherAcademicDocs)
      .map((d: any) =>
        typeof d === "string" ? { label: null, url: d } : { label: d?.label ?? d?.name ?? null, url: d?.url ?? "" }
      )
      .filter((d: any) => !!d.url),
  };

  // ---------- Athletics mapping ----------
  const at = profile.athletics ?? {};
  const derivedPositions =
    profile.positions ?? {
      primary: profile.primaryPos ?? null,
      secondary: profile.secondaryPos ? [profile.secondaryPos] : [],
    };

  const isPitcherSelected =
    String(profile.isPitcher ?? "").toLowerCase() === "yes" ||
    derivedPositions.primary === "P" ||
    (Array.isArray(derivedPositions.secondary) && derivedPositions.secondary.includes("P"));

  const hand = profile.pitcherHand === "RHP" || profile.pitcherHand === "LHP" ? profile.pitcherHand : null;
  const athleticsTeamsRaw: any[] = Array.isArray(at.teams) ? at.teams : [];
  const athleticsTeams: TeamEntry[] = athleticsTeamsRaw
    .map((t) => ({
      kind: t?.kind ?? null,
      name: t?.name ?? null,
      city: t?.city ?? null,
      state: t?.state ?? null,
      scheduleUrl: t?.scheduleUrl ?? null,
      websiteUrl: t?.websiteUrl ?? null,
      statsTeamName: null,
      statsSeason: null,
      statsYear: null,
      stats: null,
    }))
    .filter((t) => !!(String(t.name || "").trim() || String(t.scheduleUrl || "").trim() || String(t.websiteUrl || "").trim()));

  const athleticsData: AthleticsData = {
    bio: at.playerBio ?? at.athleticBio ?? null,
    eligibilityRegistered: at.eligibilityRegistered ?? at.registeredEligibilityCenters ?? at.ncaaNaiaRegistered ?? null,
    primaryPos: derivedPositions.primary ?? null,
    secondaryPos: Array.isArray(derivedPositions.secondary) ? derivedPositions.secondary : [],
    pitcher: isPitcherSelected && hand ? hand : null,
    bats: profile.bats ?? null,
    throws: profile.throws ?? null,
    teams: athleticsTeams,
  };

  // ---------- Metrics mapping ----------
  const metricsData: MetricsData = {
    dob: profile.dob ?? data?.metrics?.dob ?? null,
    series: Array.isArray(data?.metrics?.series) ? data.metrics.series : [],
    positions: derivedPositions,
    isPitcher: profile.isPitcher ?? at.isPitcher ?? null,
    pitcherHand: profile.pitcherHand ?? at.pitcherHand ?? null,
  };

  // ---------- Stats mapping ----------
  const rawSeasons: any[] = Array.isArray(data?.stats?.seasons)
    ? data.stats.seasons
    : Array.isArray(profile.seasons)
      ? profile.seasons
      : [];

  const statsTeams = rawSeasons.map((s: any) => ({
    kind: s?.kind ?? null,
    statsTeamName: String(s?.team ?? s?.teamName ?? s?.name ?? "").trim() || null,
    statsSeason: s?.seasonTerm ?? s?.season ?? null,
    statsYear: s?.seasonYear ?? s?.year ?? null,
    stats: {
      hitting: s?.hitting ?? s?.stats?.hitting ?? null,
      fielding: s?.fielding ?? s?.stats?.fielding ?? null,
      catching: s?.catching ?? s?.stats?.catching ?? null,
      pitching: s?.pitching ?? s?.stats?.pitching ?? null,
    },
    statsFileUrls: Array.isArray(s?.statsFileUrls) ? s.statsFileUrls : [],
    statsUrl: s?.statsUrl ?? null,
  }));

  // ---------- Media mapping ----------
  const vsRaw = profile.videoSocial ?? profile.videos ?? {};
  const coreEmail = profile.email ?? profile.contact?.email ?? null;
  const corePhone = profile.phone ?? profile.contact?.phone ?? null;

  const mediaDataFromApi: MediaData = toPublicMedia(vsRaw, {
    email: coreEmail,
    phone: corePhone,
    chatUrl: (vsRaw as any)?.chatUrl ?? null,
  });

  const primaryUrlFromApi: string | null = (() => {
    const raw: any = vsRaw;
    if (raw?.primary && raw?.primary?.id) {
      if (raw.primary.kind === "local" && Array.isArray(raw.localVideos)) {
        const match = raw.localVideos.find((lv: any) => String(lv?.id || "") === String(raw.primary.id));
        if (match?.publicUrl) return String(match.publicUrl);
      } else if (raw.primary.kind === "external" && Array.isArray(raw.externalVideos)) {
        const match = raw.externalVideos.find((ev: any) => String(ev?.id || "") === String(raw.primary.id));
        if (match?.url) return String(match.url);
      }
    }
    return null;
  })();

  // ---------- Coaches mapping ----------
  const toArr2 = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
  const rawCoachesFromApi: any[] = toArr2(profile.coaches)
    .concat(toArr2(profile.references))
    .concat(toArr2(profile.coachesReferences))
    .filter(Boolean);

  const coachesData: CoachesData = {
    coaches: rawCoachesFromApi.map((c) => ({
      firstName: c?.firstName ?? c?.first ?? null,
      lastName: c?.lastName ?? c?.last ?? null,
      teamOrOrg: c?.teamOrOrg ?? c?.team ?? c?.organization ?? c?.org ?? null,
      email: c?.email ?? c?.coachEmail ?? null,
      phone: c?.phone ?? c?.coachPhone ?? null,
      focus: c?.focus ?? c?.coachingFocus ?? c?.role ?? c?.position ?? null,
    })),
  };

  const cardViewUrl = `/player/${encodeURIComponent(props.slug)}/card`;

  return (
    <>
      <PublicProfileHeader
        profile={{
          ...profile,
          positions: derivedPositions,
          gpa: academicsData.gpa as any,
          gradYear: academicsData.gradYear as any,
        }}
        metrics={data?.metrics}
        demoMode={data?.demoMode}
        cardStyle={props.cardStyle}
        h1Style={props.h1Style}
        pillStyle={pillStylePublic}
      />

      {primaryUrlFromApi ? (
  <PublicMedia
    media={mediaDataFromApi}
    title="Primary Video"
    primaryUrl={primaryUrlFromApi}
    hidePrimaryInGrid={true}
    showOnlyPrimary={true}
    hideConnectRow={true}
    cardStyle={props.cardStyle}
    h2Style={h2Public}
    pillStyle={pillStylePublic}
  />
) : null}

      <PublicAcademics academics={academicsData} cardStyle={props.cardStyle} h2Style={h2Public} pillStyle={pillStylePublic} />

      <PublicAthletics athletics={athleticsData} cardStyle={props.cardStyle} h2Style={h2Public} pillStyle={pillStylePublic} />

      <PublicMetrics metrics={metricsData} cardStyle={props.cardStyle} h2Style={h2Public} pillStyle={pillStylePublic} />

      <PublicStats
        stats={{ teams: statsTeams, seasons: rawSeasons }}
        title="Stats"
        cardStyle={props.cardStyle}
        h2Style={h2Public}
        pillStyle={pillStylePublic}
      />

      {showVideoSocial && (
        <PublicMedia
          media={mediaDataFromApi}
          primaryUrl={primaryUrlFromApi}
          hidePrimaryInGrid={true}
          cardStyle={props.cardStyle}
          h2Style={h2Public}
          pillStyle={pillStylePublic}
        />
      )}

      {showCoachesRefs && <PublicCoaches data={coachesData} cardStyle={props.cardStyle} h2Style={h2Public} />}

      <section style={{ ...props.cardStyle, marginTop: 16, textAlign: "center" }}>
        <a href={cardViewUrl} style={primaryButtonPublic}>
          View Player Card
        </a>
      </section>
    </>
  );
}

const h2Public: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  fontWeight: 900,
};

const pillStylePublic: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "3px 10px",
};

const primaryButtonPublic: CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid #eab308",
  background: "#eab308",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};

/* -------------------------------------------------------------------------- */
/*  Styles (inline, Tailwind-free)                                             */
/* -------------------------------------------------------------------------- */

const wrap: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const topRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 6,
};

const backBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 12,
};

const h1: CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

const subLine: CSSProperties = {
  marginTop: 6,
  color: "#475569",
  fontWeight: 800,
  fontSize: 13,
};

const subLine2: CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
};

const ratingRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
  flexWrap: "wrap",
};

const ratingLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const muted: CSSProperties = { color: "#64748b", fontSize: 14 };
const mutedTiny: CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 800 };
const errorTiny: CSSProperties = { color: "#b91c1c", fontSize: 11, fontWeight: 900, marginBottom: 6 };

const tinyMutedText: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
};

const tinyErrorText: CSSProperties = {
  fontSize: 11,
  color: "#b91c1c",
  fontWeight: 900,
  marginBottom: 6,
};

const errorBox: CSSProperties = {
  marginTop: 10,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 800,
};

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const sectionTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  color: "#0f172a",
  marginBottom: 10,
};

const cardHeaderRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 8,
};

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.25fr)",
  gap: 14,
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px 14px",
};

const infoItem: CSSProperties = {
  display: "grid",
  gap: 4,
};

const infoLabel: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 900,
};

const infoValue: CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  fontWeight: 800,
};

const chips3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 10,
};

const metricChip: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const metricLabel: CSSProperties = {
  fontSize: 10,
  color: "#64748b",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const metricValue: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#0f172a",
};

const statsMetaRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
};

const statsTeamDot: CSSProperties = {
  color: "#94a3b8",
  fontWeight: 700,
};

const statsLineRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: 16,
};

const statsFooterText: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
};

const statsEmptyText: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
};

const divider: CSSProperties = { height: 1, background: "#eef2f7", margin: "10px 0" };

const statLine: CSSProperties = { display: "inline-flex", alignItems: "baseline", gap: 6 };
const statLabel: CSSProperties = {
  fontSize: 10,
  color: "#64748b",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const statValue: CSSProperties = { fontSize: 14, color: "#0f172a", fontWeight: 900 };

const input: CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: 90,
  resize: "none",
  lineHeight: 1.35,
};

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDangerOutline: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#b91c1c",
  fontWeight: 900,
  cursor: "pointer",
};

const ratingPickerRow: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" };

const ratingStarBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid rgba(14,165,233,0.35)",
  background: "#fff",
  padding: 4,
};

const ratingClearBtn: CSSProperties = {
  marginLeft: 8,
  border: "none",
  background: "transparent",
  color: "#0ea5e9",
  fontWeight: 900,
  fontSize: 12,
};

const rowBetween: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 10,
};

const rowEnd: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 10,
};

const rowBetweenTight: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const helperTiny: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.3,
};

const notesFormWrap: CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 12,
};

const notesListWrap: CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 260,
  overflowY: "auto",
  paddingTop: 6,
};

const noteCard: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  padding: "10px 10px",
};

const noteText: CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  fontWeight: 700,
  whiteSpace: "pre-line",
  lineHeight: 1.35,
};

const noteMetaRow: CSSProperties = {
  marginTop: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const noteMetaLeft: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 800,
};

const noteMetaRight: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const noteDate: CSSProperties = {
  fontSize: 10,
  color: "#94a3b8",
  fontWeight: 800,
};

const pillShared: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #bbf7d0",
  background: "#ecfdf5",
  color: "#047857",
};

const pillPrivate: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#64748b",
};

const stackSm: CSSProperties = {
  display: "grid",
  gap: 10,
};
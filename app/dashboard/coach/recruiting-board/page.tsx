// app/dashboard/coach/recruiting-board/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const US_STATE_ABBRS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
] as const;

const POS_OPTIONS = [
  "P",
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "CF",
  "RF",
  "Utility",
  "CIF",
  "MIF",
  "OF",
] as const;

type SearchRow = {
  playerProfileId: string;
  rating?: number;
  profileEmail: string;
  name: string | null;
  email: string | null;
  slug: string | null;

  gradYear: number | null;
  primaryPos: string | null;
  secondaryPos: string | null;
  pitcherHand: string | null;
  bats: string | null;
  throws: string | null;

  isCommitted: boolean;
  committedProgram: string | null;

  state?: string | null;
  hometown?: string | null; // city
  hsName?: string | null;
  travelTeam?: string | null;

  metricsLatest?: Record<string, number | null>;

  lists?: Array<{ id: string; name: string }>;

  updatedAt: string;
};

type ListSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
};

type ListMember = {
  playerProfileId: string;
  label: string | null;
  addedAt: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  phoneDigits?: string | null;
  slug: string | null;
  gradYear: number | null;
  primaryPos: string | null;
  secondaryPos: string | null;
  bats: string | null;
  throws: string | null;
  isCommitted: boolean;
  committedProgram: string | null;
};

type RecruitingTarget = { gradYear: number; positions: string[] };

type CoachProfileMini =
  | { ok: true; data: { coach: { recruitingTargets: RecruitingTarget[] } } }
  | { ok: false; error: string };

type ListsGetOk = { ok: true; data: { lists: ListSummary[] } };
type ListDetailOk = { ok: true; data: { list: { id: string; name: string; description: string | null }; members: ListMember[] } };
type ApiErr = { ok: false; error: string };

type SortDir = "asc" | "desc";
type SortKey =
  | "name"
  | "rating"
  | "gradYear"
  | "pos"
  | "pitcherHand"
  | "state"
  | "city"
  | "hsName"
  | "travelTeam"
  | "exitVelo"
  | "sixtyYdDash"
  | "homeToFirst"
  | "throwVelo"
  | "fastballVelo"
  | "popTime"
  | "committed"
  | "updatedAt";

export default function RecruitingBoardPage() {
    const selectedListRef = React.useRef<HTMLDivElement | null>(null);

  function openListAndScroll(listId: string) {
    setSelectedListId(listId);

    // Scroll after the DOM updates. Use an offset so the card isn't hidden under headers.
    const offsetPx = 220; // increase if you want it even higher (e.g. 280–340)

    setTimeout(() => {
      const el = selectedListRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const y = window.scrollY + rect.top - offsetPx;

      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }, 50);
  }

  // Search inputs
  const [q, setQ] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [pos, setPos] = useState("");
  // Quick presets (coach recruiting targets)
const [targetsLoading, setTargetsLoading] = useState(true);
const [targets, setTargets] = useState<RecruitingTarget[]>([]);

  // New filters
  const [committed, setCommitted] = useState<string>(""); // "", "true", "false"
  const [bats, setBats] = useState("");
  const [throws, setThrows] = useState("");
  const [pitcherHand, setPitcherHand] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [hsName, setHsName] = useState("");
  const [travelTeam, setTravelTeam] = useState("");
  const [gpaMin, setGpaMin] = useState("");

  // Throw metric selector
  const [throwMetricKey, setThrowMetricKey] = useState<
    "rawThrowVelo" | "infieldThrowVelo" | "outfieldThrowVelo" | "catcherThrowVelo"
  >("rawThrowVelo");

  // Metric filters (min/max)
  const [exitMin, setExitMin] = useState("");
  const [sixtyMin, setSixtyMin] = useState("");
  const [htfMin, setHtfMin] = useState("");
  const [throwMin, setThrowMin] = useState("");
  const [popMin, setPopMin] = useState("");
  const [fbMin, setFbMin] = useState("");
  const [chMin, setChMin] = useState("");
  const [bbMin, setBbMin] = useState("");

  // Search results
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [lastViewedPlayerProfileId, setLastViewedPlayerProfileId] = useState<string>("");

  // ---------------- Rating (display-only stars) ----------------
  function StarIcon(props: { filled: boolean }) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block" }}>
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

  function RatingStars(props: { rating: number }) {
    const r = Math.max(0, Math.min(5, Math.round(props.rating || 0)));
    return (
      <div style={ratingWrap} aria-label={`Rating ${r} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={ratingStarBox}>
            <StarIcon filled={i < r} />
          </span>
        ))}
      </div>
    );
  }

  // Sorting (double-click)
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Lists
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState<string | null>(null);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");

  // Create list
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [createListError, setCreateListError] = useState<string | null>(null);

  // Selected list detail + members
  const [listDetailLoading, setListDetailLoading] = useState(false);
  const [listDetailError, setListDetailError] = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string>("");
  const [selectedListDesc, setSelectedListDesc] = useState<string>("");
  const [members, setMembers] = useState<ListMember[]>([]);

  // Add/remove member actions
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [removingFromListId, setRemovingFromListId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("scoutline:lastViewedRecruit");
      if (saved) setLastViewedPlayerProfileId(saved);
    } catch {}
  }, []);

  // Load lists on mount
  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      try {
        setListsLoading(true);
        setListsError(null);

        const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
        const json: ListsGetOk | ApiErr = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          const msg = (!json.ok && json.error) || `Failed to load lists (${res.status})`;
          setListsError(msg);
          setLists([]);
          setSelectedListId("");
          return;
        }

        const incoming = Array.isArray(json.data.lists) ? json.data.lists : [];
        setLists(incoming);

        // ✅ New sessions: do NOT auto-select a list.
        // Always start on "— Select a list —"
        setSelectedListId("");
        setSelectedListName("");
        setSelectedListDesc("");
        setMembers([]);


      } catch (e: any) {
        if (!cancelled) {
          setListsError(e?.message || "Failed to load lists.");
          setLists([]);
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    }

    loadLists();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    useEffect(() => {
    let cancelled = false;

    async function loadTargets() {
      try {
        setTargetsLoading(true);

        const res = await fetch("/api/coach/profile", { method: "GET", cache: "no-store" });
        const text = await res.text();
        const json: CoachProfileMini = text ? (JSON.parse(text) as any) : ({ ok: false, error: "Empty response" } as any);

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setTargets([]);
          return;
        }

        const incoming = Array.isArray((json as any).data?.coach?.recruitingTargets)
          ? ((json as any).data.coach.recruitingTargets as RecruitingTarget[])
          : [];

        // normalize + sort
        const cleaned = incoming
          .map((t) => ({
            gradYear: Number(t.gradYear),
            positions: Array.isArray(t.positions)
              ? Array.from(new Set(t.positions.map((p) => String(p || "").trim()).filter(Boolean)))
              : [],
          }))
          .filter((t) => Number.isFinite(t.gradYear))
          .sort((a, b) => a.gradYear - b.gradYear);

        setTargets(cleaned);
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setTargetsLoading(false);
      }
    }

    loadTargets();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load selected list members when selectedListId changes
  useEffect(() => {
    if (!selectedListId) {
      setSelectedListName("");
      setSelectedListDesc("");
      setMembers([]);
      return;
    }

    let cancelled = false;

    async function loadListDetail() {
      try {
        setListDetailLoading(true);
        setListDetailError(null);
        setMemberActionError(null);

        const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const text = await res.text();
        const json: ListDetailOk | ApiErr = text ? (JSON.parse(text) as any) : ({ ok: false, error: `Empty response (${res.status})` } as any);
        if (cancelled) return;

        if (!res.ok || !json.ok) {
          const msg = (!json.ok && json.error) || `Failed to load list (${res.status})`;
          setListDetailError(msg);
          setSelectedListName("");
          setSelectedListDesc("");
          setMembers([]);
          return;
        }

        setSelectedListName(json.data.list.name);
        setSelectedListDesc(json.data.list.description ?? "");
        setMembers(Array.isArray(json.data.members) ? json.data.members : []);
      } catch (e: any) {
        if (!cancelled) {
          setListDetailError(e?.message || "Failed to load list.");
          setMembers([]);
        }
      } finally {
        if (!cancelled) setListDetailLoading(false);
      }
    }

    loadListDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedListId]);

function onHeaderDoubleClick(nextKey: SortKey) {
  setSortKey((prev) => {
    // Same column: just flip direction
    if (prev === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    }

    // New column:
    // Rating should default to DESC (5 → 0)
    if (nextKey === "rating") {
      setSortDir("desc");
    } else {
      setSortDir("asc");
    }

    return nextKey;
  });
}

  function metricNum(r: SearchRow, key: string): number | null {
    const v = r.metricsLatest?.[key];
    const n = typeof v === "number" ? v : v == null ? null : Number(v);
    return Number.isFinite(n as number) ? (n as number) : null;
  }

  function metricVal(r: SearchRow, key: string): string {
    const metrics = r.metricsLatest || {};

    const v =
      key === "throwVelo"
        ? metrics.catcherThrowVelo ??
          metrics.infieldThrowVelo ??
          metrics.outfieldThrowVelo ??
          metrics.rawThrowVelo ??
          null
        : key === "fastballVelo"
        ? metrics.avgFbVelo ?? null
        : metrics[key];

    if (v == null || Number.isNaN(Number(v))) return "—";
    if (key === "sixtyYdDash" || key === "homeToFirst" || key === "popTime") return Number(v).toFixed(2);
    return String(Math.round(Number(v)));
  }

  function resultsLabel(count: number) {
  return `Showing ${count} result${count === 1 ? "" : "s"}`;
}

function hasAnySearchCriteria() {
  return (
    !!q.trim() ||
    !!gradYear.trim() ||
    !!pos.trim() ||
    !!committed ||
    !!bats.trim() ||
    !!throws.trim() ||
    !!pitcherHand.trim() ||
    !!state.trim() ||
    !!city.trim() ||
    !!hsName.trim() ||
    !!travelTeam.trim() ||
    !!gpaMin.trim() ||
    !!exitMin.trim() ||
    !!sixtyMin.trim() ||
    !!htfMin.trim() ||
    !!throwMin.trim() ||
    !!popMin.trim()
  );
}

  const selectedMemberIds = useMemo(() => new Set(members.map((m) => m.playerProfileId)), [members]);

const sortedMembers = useMemo(() => {
  const toSortKey = (m: ListMember) => {
    const rawName = (m.name || "").trim();
    if (rawName) {
      const parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].toLowerCase();
      const last = parts[parts.length - 1].toLowerCase();
      const first = parts.slice(0, parts.length - 1).join(" ").toLowerCase();
      return `${last}, ${first}`;
    }

    const emailLocal = (m.email ? m.email.split("@")[0] : "").trim().toLowerCase();
    return emailLocal || String(m.playerProfileId || "").toLowerCase();
  };

  const arr = [...members];
  arr.sort((a, b) => {
    const ak = toSortKey(a);
    const bk = toSortKey(b);
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
  return arr;
}, [members]);

  const sortedResults = useMemo(() => {
    const arr = [...results];

    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      const aName = (a.name || a.email || a.profileEmail || "").toLowerCase();
      const bName = (b.name || b.email || b.profileEmail || "").toLowerCase();

      const aPos = (a.primaryPos || "").toUpperCase();
      const bPos = (b.primaryPos || "").toUpperCase();

      const aCity = (a.hometown || "").toLowerCase();
      const bCity = (b.hometown || "").toLowerCase();

      const aHs = (a.hsName || "").toLowerCase();
      const bHs = (b.hsName || "").toLowerCase();

      const aState = (a.state || "").toUpperCase();
      const bState = (b.state || "").toUpperCase();

      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();

      const aExit = metricNum(a, "exitVelo");
      const bExit = metricNum(b, "exitVelo");
      const a60 = metricNum(a, "sixtyYdDash");
      const b60 = metricNum(b, "sixtyYdDash");
      const aH1 = metricNum(a, "homeToFirst");
      const bH1 = metricNum(b, "homeToFirst");
      const aThrow = metricNum(a, throwMetricKey);
      const bThrow = metricNum(b, throwMetricKey);
      const aPop = metricNum(a, "popTime");
      const bPop = metricNum(b, "popTime");

      const aCommitted = a.isCommitted ? 1 : 0;
      const bCommitted = b.isCommitted ? 1 : 0;

      const aRating = Number(a.rating ?? 0);
      const bRating = Number(b.rating ?? 0);

      const cmpStr = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
      const cmpNumNullLast = (x: number | null, y: number | null) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1; // null last
        if (y == null) return -1;
        return x < y ? -1 : x > y ? 1 : 0;
      };

      switch (sortKey) {
        case "name":
          return cmpStr(aName, bName) * dir;
        case "rating":
          return (aRating - bRating) * dir;
        case "gradYear":
          return cmpNumNullLast(a.gradYear ?? null, b.gradYear ?? null) * dir;
        case "pos":
          return cmpStr(aPos, bPos) * dir;
        case "pitcherHand":
          return String(a.pitcherHand || "").localeCompare(String(b.pitcherHand || ""));
        case "state":
          return cmpStr(aState, bState) * dir;
        case "city":
          return cmpStr(aCity, bCity) * dir;
        case "hsName":
          return cmpStr(aHs, bHs) * dir;
        case "travelTeam":
          return cmpStr(
            String(a.travelTeam || "").toLowerCase(),
            String(b.travelTeam || "").toLowerCase()
          ) * dir;
        case "exitVelo":
          return cmpNumNullLast(aExit, bExit) * dir;
        case "sixtyYdDash":
          return cmpNumNullLast(a60, b60) * dir;
        case "homeToFirst":
          return cmpNumNullLast(aH1, bH1) * dir;
        case "throwVelo":
          return cmpNumNullLast(aThrow, bThrow) * dir;
        case "popTime":
          return cmpNumNullLast(aPop, bPop) * dir;
        case "committed":
          return (aCommitted - bCommitted) * dir;
        case "updatedAt":
        default:
          return (aUpdated - bUpdated) * dir;
      }
    });

    return arr;
  }, [results, sortKey, sortDir, throwMetricKey]);

  function clearAllFilters() {
  setQ("");
  setGradYear("");
  setPos("");

  setCommitted("");
  setBats("");
  setThrows("");
  setPitcherHand("");

  setState("");
  setCity("");
  setHsName("");
  setTravelTeam("");

  setGpaMin("");

  setThrowMetricKey("rawThrowVelo");

  setExitMin("");
  setSixtyMin("");
  setHtfMin("");
  setThrowMin("");
  setPopMin("");

  setFbMin("");
  setChMin("");
  setBbMin("");

  setErr(null);
}

const TAKE_IF_NO_FILTERS = process.env.NODE_ENV === "production" ? 500 : 5000;

  async function runSearch() {
    try {
      setLoading(true);
      setErr(null);

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (gradYear.trim()) params.set("gradYear", gradYear.trim());
      if (pos.trim()) params.set("pos", pos.trim().toUpperCase());

      if (committed) params.set("committed", committed);
      if (bats.trim()) params.set("bats", bats.trim().toUpperCase());
      if (throws.trim()) params.set("throws", throws.trim().toUpperCase());
      if (pitcherHand.trim()) params.set("pitcherHand", pitcherHand.trim().toUpperCase());
      if (state.trim()) params.set("state", state.trim().toUpperCase());
      if (city.trim()) params.set("city", city.trim());
      if (hsName.trim()) params.set("hsName", hsName.trim());
      if (travelTeam.trim()) params.set("travelTeam", travelTeam.trim());
if (gpaMin.trim()) params.set("gpaMin", gpaMin.trim());

// metrics (MIN only)
if (exitMin.trim()) params.set("m_exitVeloMin", exitMin.trim());
if (sixtyMin.trim()) params.set("m_sixtyYdDashMax", sixtyMin.trim());
if (htfMin.trim()) params.set("m_homeToFirstMax", htfMin.trim());
if (throwMin.trim()) params.set(`m_${throwMetricKey}Min`, throwMin.trim());
if (popMin.trim()) params.set("m_popTimeMax", popMin.trim());
if (fbMin.trim()) params.set("m_avgFbVeloMin", fbMin.trim());
if (chMin.trim()) params.set("m_avgChVeloMin", chMin.trim());
if (bbMin.trim()) params.set("m_avgBbVeloMin", bbMin.trim());

// If no criteria at all, fetch ALL active profiles (server caps safely)
// If no criteria at all, fetch ALL active profiles (server caps safely)
const hasAnyCriteria =
  !!q.trim() ||
  !!gradYear.trim() ||
  !!pos.trim() ||
  !!committed ||
  !!bats.trim() ||
  !!throws.trim() ||
  !!pitcherHand.trim() ||
  !!state.trim() ||
  !!city.trim() ||
  !!hsName.trim() ||
  !!travelTeam.trim() ||
  !!gpaMin.trim() ||
  !!exitMin.trim() ||
  !!sixtyMin.trim() ||
  !!htfMin.trim() ||
  !!throwMin.trim() ||
  !!popMin.trim() ||
  !!fbMin.trim() ||
  !!chMin.trim() ||
  !!bbMin.trim();

params.set("take", hasAnyCriteria ? "25" : String(TAKE_IF_NO_FILTERS));

const res = await fetch(`/api/coach/player/search?${params.toString()}`, {
  cache: "no-store",
});

const json = await res.json();

if (!res.ok || !json?.ok) {
  setErr(json?.error || `Search failed (${res.status})`);
  setResults([]);
  return;
}

const nextResults = Array.isArray(json.results) ? json.results : [];
setResults(nextResults);

} catch (e: any) {
  setErr(e?.message || "Search failed.");
  setResults([]);
} finally {
  setLoading(false);
}
}

  async function refreshListsKeepSelection() {
    const res = await fetch("/api/coach/recruiting-lists", { method: "GET", cache: "no-store" });
    const json: ListsGetOk | ApiErr = await res.json();
    if (!res.ok || !json.ok) return;

    const incoming = Array.isArray(json.data.lists) ? json.data.lists : [];
    setLists(incoming);

    if (selectedListId && incoming.some((l) => l.id === selectedListId)) return;
    setSelectedListId(incoming[0]?.id || "");
  }

  async function createList() {
    try {
      setCreatingList(true);
      setCreateListError(null);

      const name = newListName.trim();
      const description = newListDesc.trim();

      if (!name) {
        setCreateListError("List name is required.");
        return;
      }

      const res = await fetch("/api/coach/recruiting-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setCreateListError(json?.error || `Failed (${res.status})`);
        return;
      }

      await refreshListsKeepSelection();
      const newId = json?.data?.list?.id as string | undefined;
      if (newId) setSelectedListId(newId);

      setNewListName("");
      setNewListDesc("");
    } catch (e: any) {
      setCreateListError(e?.message || "Failed to create list.");
    } finally {
      setCreatingList(false);
    }
  }

  async function reloadSelectedList() {
    if (!selectedListId) return;

    setListDetailLoading(true);
    setListDetailError(null);

    try {
      const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const json: ListDetailOk | ApiErr = await res.json();

      if (!res.ok || !json.ok) {
        const msg = (!json.ok && json.error) || `Failed to load list (${res.status})`;
        setListDetailError(msg);
        setMembers([]);
        return;
      }

      setSelectedListName(json.data.list.name);
      setSelectedListDesc(json.data.list.description ?? "");
      setMembers(Array.isArray(json.data.members) ? json.data.members : []);
    } finally {
      setListDetailLoading(false);
    }
  }

  async function addPlayerToSelectedList(playerProfileId: string) {
    if (!selectedListId) {
      setMemberActionError("Select a list first (or create one).");
      return;
    }

    try {
      setAddingToListId(playerProfileId);
      setMemberActionError(null);

      const res = await fetch(`/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerProfileId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMemberActionError(json?.error || `Failed (${res.status})`);
        return;
      }

      await reloadSelectedList();
      await refreshListsKeepSelection();
    } catch (e: any) {
      setMemberActionError(e?.message || "Failed to add player to list.");
    } finally {
      setAddingToListId(null);
    }
  }

  async function removePlayerFromSelectedList(playerProfileId: string) {
    if (!selectedListId) return;

    try {
      setRemovingFromListId(playerProfileId);
      setMemberActionError(null);

      const res = await fetch(
        `/api/coach/recruiting-lists/${encodeURIComponent(selectedListId)}/members/${encodeURIComponent(playerProfileId)}`,
        { method: "DELETE" }
      );

      const json = await res.json().catch(() => ({ ok: res.ok }));

      if (!res.ok || json?.ok === false) {
        setMemberActionError(json?.error || `Failed (${res.status})`);
        return;
      }

      await reloadSelectedList();
      await refreshListsKeepSelection();
    } catch (e: any) {
      setMemberActionError(e?.message || "Failed to remove player from list.");
    } finally {
      setRemovingFromListId(null);
    }
  }

return (
  <main style={wrap}>
      {/* Page header (standalone like Invites) */}
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Recruiting Board</div>
          <div style={pageMuted}>
            Search for players by what you are recruiting for in Quick Presets or by certain criteria and create recruiting target lists that can be shared with staff in your program.
          </div>
        </div>
      </section>

      <section style={twoCol}>
        {/* LEFT: Search */}
        <div style={{ display: "grid", gap: 14, minWidth: 0}}>
          <div style={card}>
            <div style={sectionTitle}>Player Search</div>

                  {/* Quick Presets */}
            <div style={presetWrap}>
<div style={presetHeaderRow}>
  <div>
    <div style={presetTitle}>Quick Presets</div>
    <div style={presetHelper}>
      Click a grad year and position to quick-fill the Search area.
    </div>
  </div>

  <button
    type="button"
    onClick={() => {
      setGradYear("");
      setPos("");
    }}
    style={presetClearBtn}
  >
    Clear Quick Presets
  </button>
</div>

              {targetsLoading ? (
                <div style={presetMuted}>Loading your recruiting targets…</div>
              ) : targets.length === 0 ? (
                <div style={presetMuted}>
                  No recruiting targets set yet. Add them on your Coach Profile to enable one-click filters.
                </div>
              ) : (
                <div style={targetsBlock}>
                  {targets.map((t) => {
                    const year = t.gradYear;
                    const posList = (t.positions || []).map((p) => String(p).toUpperCase()).filter(Boolean);

                    return (
                      <div key={year} style={targetsRow}>
                        <button
                          type="button"
                          onClick={() => {
                            setGradYear(String(year));
                            setPos("");
                          }}
                          style={targetsYearBtn}
                          title={`Show Class of ${year}`}
                        >
                          {year}
                        </button>

                        {posList.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setGradYear(String(year));
                              setPos("");
                            }}
                            style={targetsPosBtnGhost}
                            title={`Show ${year} (any position)`}
                          >
                            Any position
                          </button>
                        ) : (
                          <div style={targetsPosWrap}>
                            {posList.map((p) => (
                              <button
                                key={`${year}-${p}`}
                                type="button"
                                onClick={() => {
                                  setGradYear(String(year));
                                  setPos(p);
                                }}
                                style={targetsPosBtn}
                                title={`Show ${year} • ${p}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Row 1 */}
            <div style={formRow}>
              <Field label="Player Name" onClear={() => setQ("")}>
                <input value={q} onChange={(e) => setQ(e.target.value)} style={inputWide} placeholder="First and Last" />
              </Field>

              <Field label="Grad Year" onClear={() => setGradYear("")}>
                <input
  value={gradYear}
  onChange={(e) => setGradYear(e.target.value)}
  style={inputSm}
  placeholder={String(new Date().getFullYear() + 1)}
/>
              </Field>

<Field label="Position" onClear={() => setPos("")}>
  <input
    value={pos}
    onChange={(e) => setPos(e.target.value.toUpperCase())}
    onBlur={(e) => {
      const v = e.target.value.toUpperCase().trim();
      if (v && !POS_OPTIONS.includes(v as any)) setPos("");
    }}
    style={inputSm}
    placeholder="Position"
    list="pos-options"
    autoComplete="off"
  />
  <datalist id="pos-options">
    {POS_OPTIONS.map((p) => (
      <option key={p} value={p} />
    ))}
  </datalist>
</Field>
            </div>

            {/* Row 2 (requested fields) */}
            <div style={{ ...formRow, marginTop: 10 }}>
<Field label="State" onClear={() => setState("")}>
  <input
    value={state}
    onChange={(e) => setState(e.target.value.toUpperCase())}
    onBlur={(e) => {
  const v = e.target.value.toUpperCase().trim();
  if (v && !US_STATE_ABBRS.includes(v as any)) setState("");
}}
    style={inputXs}
    placeholder="State"
    list="state-abbr-options"
    autoComplete="off"
    maxLength={2}
    inputMode="text"
  />
  <datalist id="state-abbr-options">
    {US_STATE_ABBRS.map((abbr) => (
      <option key={abbr} value={abbr} />
    ))}
  </datalist>
</Field>

              <Field label="City" onClear={() => setCity("")}>
                <input value={city} onChange={(e) => setCity(e.target.value)} style={inputWideSm} placeholder="City" />
              </Field>

              <Field label="GPA (min)" onClear={() => setGpaMin("")}>
                <input value={gpaMin} onChange={(e) => setGpaMin(e.target.value)} style={inputXs} placeholder="3.0" />
              </Field>

              <Field label="High School" onClear={() => setHsName("")}>
                <input value={hsName} onChange={(e) => setHsName(e.target.value)} style={inputWideSm} placeholder="High School Name" />
              </Field>

              <Field label="Travel Team" onClear={() => setTravelTeam("")}>
                <input value={travelTeam} onChange={(e) => setTravelTeam(e.target.value)} style={inputWideSm} placeholder="Travel Team Name" />
              </Field>
            </div>

            {/* Row 3: other filters */}
            <div style={{ ...formRow, marginTop: 10 }}>
              <Field label="Committed" onClear={() => setCommitted("")}>
                <select value={committed} onChange={(e) => setCommitted(e.target.value)} style={selectSm}>
                  <option value="">Any</option>
                  <option value="true">Committed</option>
                  <option value="false">Uncommitted</option>
                </select>
              </Field>

              <Field label="Bats" onClear={() => setBats("")}>
                <select value={bats} onChange={(e) => setBats(e.target.value)} style={selectSm}>
                  <option value="">Any</option>
                  <option value="R">R</option>
                  <option value="L">L</option>
                  <option value="S">S</option>
                </select>
              </Field>

              <Field label="Throws" onClear={() => setThrows("")}>
                <select value={throws} onChange={(e) => setThrows(e.target.value)} style={selectSm}>
                  <option value="">Any</option>
                  <option value="R">R</option>
                  <option value="L">L</option>
                  <option value="S">S</option>
                </select>
              </Field>

              <Field label="Pitcher Hand" onClear={() => setPitcherHand("")}>
                <select value={pitcherHand} onChange={(e) => setPitcherHand(e.target.value)} style={selectMd}>
                  <option value="">Any</option>
                  <option value="RHP">RHP</option>
                  <option value="LHP">LHP</option>
                </select>
              </Field>
            </div>

            {/* Metrics section */}
            <div style={divider} />
            <div style={miniTitle}>Metric Filters (latest values)</div>

{/* Metrics row 1 */}
<div style={{ ...formRow, marginTop: 10 }}>
  <Field label="Exit Velo (min)" onClear={() => setExitMin("")}>
    <input value={exitMin} onChange={(e) => setExitMin(e.target.value)} style={inputXs} placeholder="90" />
  </Field>

  <Field label="60 Yrd (max)" onClear={() => setSixtyMin("")}>
    <input value={sixtyMin} onChange={(e) => setSixtyMin(e.target.value)} style={inputXs} placeholder="6.8" />
  </Field>

  <Field label="H to 1st (max)" onClear={() => setHtfMin("")}>
    <input value={htfMin} onChange={(e) => setHtfMin(e.target.value)} style={inputXs} placeholder="3.9" />
  </Field>
</div>

{/* Metrics row 2 (Throw Metric + Throw Min + Pop Min + Search button aligned right) */}
<div style={{ ...formRow, marginTop: 10 }}>
    <Field label="Throw Metric" onClear={() => setThrowMetricKey("rawThrowVelo")}>
    <select value={throwMetricKey} onChange={(e) => setThrowMetricKey(e.target.value as any)} style={selectMd}>
      <option value="rawThrowVelo">Raw Throw Velo</option>
      <option value="infieldThrowVelo">IF Throw Velo</option>
      <option value="outfieldThrowVelo">OF Throw Velo</option>
      <option value="catcherThrowVelo">C Throw Velo</option>
    </select>
  </Field>

  <Field label="Throw Velo (min)" onClear={() => setThrowMin("")}>
    <input value={throwMin} onChange={(e) => setThrowMin(e.target.value)} style={inputXs} placeholder="75" />
  </Field>
  
  <Field label="C Pop (max)" onClear={() => setPopMin("")}>
    <input value={popMin} onChange={(e) => setPopMin(e.target.value)} style={inputXs} placeholder="1.9" />
  </Field>

  <Field label="FB Velo (min)" onClear={() => setFbMin("")}>
  <input
    value={fbMin}
    onChange={(e) => setFbMin(e.target.value)}
    style={inputXs}
    placeholder="85"
  />
</Field>

<Field label="CH Velo (min)" onClear={() => setChMin("")}>
  <input
    value={chMin}
    onChange={(e) => setChMin(e.target.value)}
    style={inputXs}
    placeholder="75"
  />
</Field>

<Field label="BB Velo (min)" onClear={() => setBbMin("")}>
  <input
    value={bbMin}
    onChange={(e) => setBbMin(e.target.value)}
    style={inputXs}
    placeholder="70"
  />
</Field>
</div>

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    onClick={clearAllFilters}
    style={presetClearBtn}
  >
    Clear All
  </button>

  <button
    type="button"
    onClick={runSearch}
    style={{ ...btnGold, opacity: loading ? 0.7 : 1 }}
  >
    {loading ? "Searching…" : "Search"}
  </button>
</div>

            {err ? <div style={errorBoxInline}>{err}</div> : null}
            {memberActionError ? <div style={warnBoxInline}>{memberActionError}</div> : null}
          </div>
        </div>

        {/* RIGHT: Lists */}
        <div style={{ display: "grid", gap: 14, alignContent: "start", minWidth: 0 }}>
          <div style={card}>
            <div style={sectionTitle}>Recruiting Target Lists</div>
            <div style={cardSub}>Create named lists and share with staff.</div>

            {listsLoading ? (
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>Loading lists…</div>
            ) : listsError ? (
              <div style={{ marginTop: 10, ...errorBoxInline }}>{listsError}</div>
            ) : (
              <>
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <Field label="Select list">
                    <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} style={select}>
                      <option value="">— Select a list —</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.memberCount})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div style={divider} />
                  <div style={miniTitle}>Create new list</div>

                  <Field label="List name">
                    <input value={newListName} onChange={(e) => setNewListName(e.target.value)} style={inputWide} placeholder="e.g. 2028 Infielders" />
                  </Field>

                  <Field label="Description (optional)">
                    <input value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} style={inputWide} placeholder="Optional notes about this list…" />
                  </Field>

<div
  style={{
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 0,
  }}
>
  <button
    type="button"
    onClick={createList}
    disabled={creatingList}
    style={{ ...btnGold, opacity: creatingList ? 0.7 : 1 }}
  >
    {creatingList ? "Creating…" : "Create List"}
  </button>

  {createListError ? <span style={{ color: "#b91c1c", fontSize: 12 }}>{createListError}</span> : null}
</div>
                </div>
              </>
            )}
          </div>

<div style={card} ref={selectedListRef}>
  <div style={selectedListHeader}>
    <div style={sectionTitle}>Selected List</div>

    {selectedListId ? (
      <div style={selectedListMeta}>
        {listDetailLoading ? (
          <span style={mutedSmall}>Loading…</span>
        ) : (
          <span style={selectedListPill}>
            {(selectedListName || "List")} ({members.length})
          </span>
        )}
      </div>
    ) : null}
  </div>

  {!selectedListId ? (
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>Select a list to view players saved to it.</div>
            ) : (
              <>
                {listDetailLoading ? (
                  <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>Loading list…</div>
                ) : listDetailError ? (
                  <div style={{ marginTop: 10, ...errorBoxInline }}>{listDetailError}</div>
                ) : members.length === 0 ? (
                  <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>No players in this list yet. Search for a player and click Add to save them here.</div>
                ) : (
                  <div style={{ marginTop: 12, ...tableWrap, ...selectedListTableWrap, maxHeight: 260, overflowY: "auto" }}>
                    <table style={tableTight}>
                      <thead>
                        <tr>
<th style={{ ...thTight, width: "50%" }}>Player</th>
<th style={{ ...thTight, width: 86 }}>Grad</th>
<th style={{ ...thTight, width: 86 }}>Pos</th>
<th style={{ ...thTight, width: 86 }}>Contact</th>
<th style={{ ...thRightTight, width: 86 }}>Remove</th>
                        </tr>
                      </thead>

                      <tbody>
{sortedMembers.map((m) => {
  const name = m.name || (m.email ? m.email.split("@")[0] : "Player");
  const posLabel = m.primaryPos ? `${m.primaryPos}${m.secondaryPos ? ` / ${m.secondaryPos}` : ""}` : "—";

const emailHref = m.email ? `mailto:${m.email}` : null;
const emailIsPrivate = Boolean((m as any).emailPrivate);
const emailAllowed = !!emailHref && !emailIsPrivate;

const phoneRaw = String((m as any).phone || "").trim();
const phoneDigits = phoneRaw.replace(/[^\d]/g, "");
const phoneHref = phoneDigits ? `tel:${phoneDigits}` : null;
const phoneIsPrivate = Boolean((m as any).phonePrivate);
const phoneAllowed = !!phoneHref && !phoneIsPrivate;

  // ✅ Change 1B: Selected List should link to PUBLIC profile when slug exists
  const publicHref = m.slug ? `/player/${encodeURIComponent(m.slug)}?source=recruiting-board` : null;

  return (
    <tr key={m.playerProfileId}>
<td style={tdTight}>
  {publicHref ? (
    <a
      href={publicHref}
      style={{ ...linkSky, ...truncateText }}
      target="_blank"
      rel="noreferrer"
    >
      {name}
    </a>
  ) : (
    <span style={{ fontWeight: 900, ...truncateText }}>{name}</span>
  )}
</td>
      <td style={tdTight}>{m.gradYear ?? "—"}</td>
      <td style={tdTight}>{posLabel}</td>

      <td style={tdTight}>
        <details style={contactDetails}>
          <summary style={contactSummary}>Contact</summary>

<div style={contactMenu}>
  {emailAllowed ? (
    <a href={emailHref!} style={contactLink}>
      Email
    </a>
  ) : (
    <div style={contactDisabled}>
      Email{emailIsPrivate ? " (Private)" : ""}
    </div>
  )}

  {phoneAllowed ? (
    <a href={phoneHref!} style={contactLink}>
      Phone
    </a>
  ) : (
    <div style={contactDisabled}>
      Phone{phoneIsPrivate ? " (Private)" : ""}
    </div>
  )}
</div>
        </details>
      </td>

      <td style={tdRightTight}>
        <button
          type="button"
          onClick={() => removePlayerFromSelectedList(m.playerProfileId)}
          disabled={removingFromListId === m.playerProfileId}
          style={{ ...btnSmallOutline, opacity: removingFromListId === m.playerProfileId ? 0.65 : 1 }}
        >
          {removingFromListId === m.playerProfileId ? "Removing…" : "Remove"}
        </button>
      </td>
    </tr>
  );
})}
                      </tbody>
                    </table>
                  </div>
                )}

                {memberActionError ? <div style={{ marginTop: 10, ...warnBoxInline }}>{memberActionError}</div> : null}
              </>
            )}
          </div>
        </div>
      </section>
      
   <div style={card}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    }}
  >
    <div>
      <div style={sectionTitle}>Search Results</div>
      <div style={cardSub}>
      Select a player to view their profile. Double-click a column header to sort. Select a list, then click Add to save a player. NOTE that Rating is internal to program view. 
      </div>
    </div>

    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
      {resultsLabel(sortedResults.length)}
    </div>
  </div>             

  <div style={{ marginTop: 12, ...tableWrap, maxHeight: 900, overflowY: "auto" }}>
    <table style={table}>
      <thead>
        <tr>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("name")}>Player</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("rating")}>Rating</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("gradYear")}>Grad Yr</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("pos")}>Pos</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("pitcherHand")}>Pitcher</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("state")}>State</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("city")}>City</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("hsName")}>High School</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("travelTeam")}>Travel Team</th>

          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("exitVelo")}>Exit Velo</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("sixtyYdDash")}>60 Yrd</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("homeToFirst")}>H→1st</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("throwVelo")}>Throw Velo</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("fastballVelo")}>FB Velo</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("popTime")}>C Pop</th>

          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("committed")}>Committed</th>
          <th style={thClick} onDoubleClick={() => onHeaderDoubleClick("updatedAt")}>Updated</th>
          <th style={thRightClick}>List</th>
        </tr>
      </thead>

      <tbody>
{sortedResults.length === 0 ? (
  <tr>
    <td style={tdMuted} colSpan={18}>
      {loading
        ? "Searching…"
        : !hasAnySearchCriteria()
        ? "No results yet. Add filters and click Search or click Search to load all players."
        : "No matches for these filters. Try clearing a filter or click Clear All and search again."}
    </td>
  </tr>
) : (
          sortedResults.map((r) => {
            const name = r.name || (r.email ? r.email.split("@")[0] : "Player");
            const alreadyInList = selectedMemberIds.has(r.playerProfileId);

            return (
              <tr
                key={r.playerProfileId}
                style={{
                  background:
                    r.playerProfileId === lastViewedPlayerProfileId
                      ? "rgba(14,165,233,0.08)"
                      : undefined,
                }}
              >
                <td style={td}>
                  {r.slug ? (
                    <a
                      href={`/player/${encodeURIComponent(r.slug)}?source=recruiting-board`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkSky}
                      onClick={() => {
                        try {
                          window.localStorage.setItem("scoutline:lastViewedRecruit", r.playerProfileId);
                        } catch {}

                        setLastViewedPlayerProfileId(r.playerProfileId);
                      }}
                    >
                      {name}

                      {r.playerProfileId === lastViewedPlayerProfileId ? (
                        <div
                          style={{
                            marginTop: 4,
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#e0f2fe",
                            border: "1px solid #7dd3fc",
                            color: "#075985",
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          Recently Viewed
                        </div>
                      ) : null}
                    </a>
                  ) : (
                    <span style={mutedSmall}>No public profile</span>
                  )}

                  <div style={mutedSmall}>{r.email || r.profileEmail}</div>
                </td>

                <td style={td}>
                  <RatingStars rating={Number(r.rating ?? 0)} />
                </td>

                <td style={td}>{r.gradYear ?? "—"}</td>

                <td style={td}>
                  {r.primaryPos ? `${r.primaryPos}${r.secondaryPos ? ` / ${r.secondaryPos}` : ""}` : "—"}
                </td>

                <td style={td}>{r.pitcherHand || "—"}</td>

                <td style={td}>{r.state || "—"}</td>
                <td style={td}>{r.hometown || "—"}</td>
                <td style={td}>{r.hsName || "—"}</td>
                <td style={td}>{r.travelTeam || "—"}</td>

                <td style={td}>{metricVal(r, "exitVelo")}</td>
                <td style={td}>{metricVal(r, "sixtyYdDash")}</td>
                <td style={td}>{metricVal(r, "homeToFirst")}</td>
                <td style={td}>{metricVal(r, "throwVelo")}</td>
                <td style={td}>{metricVal(r, "fastballVelo")}</td>
                <td style={td}>{metricVal(r, "popTime")}</td>

                <td style={td}>
                  {r.isCommitted ? (
                    <span style={pillCommitted}>
                      {r.committedProgram ? `  ${r.committedProgram}` : ""}
                    </span>
                  ) : (
                    <span style={mutedSmall}>Uncommitted</span>
                  )}
                </td>

                <td style={td}>{formatShortDate(r.updatedAt)}</td>

                <td style={tdRight}>
                  {/* Existing list memberships (pills) */}
                  {Array.isArray((r as any).lists) && (r as any).lists.length > 0 ? (
                    <div style={listPillsWrap}>
                      {(r as any).lists.map((l: any) => (
                        <button
                          key={String(l.id)}
                          type="button"
                          onClick={() => openListAndScroll(String(l.id))}
                          style={listPillBtn}
                          title={`Open list: ${String(l.name)}`}
                        >
                          {String(l.name)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={mutedSmall}>—</span>
                  )}

{/* Action for the currently selected list */}
<div style={{ marginTop: 8 }}>
  {!selectedListId ? (
    <span style={mutedSmall}>Select list</span>
  ) : alreadyInList ? (
    <button
      type="button"
      onClick={() => removePlayerFromSelectedList(r.playerProfileId)}
      disabled={removingFromListId === r.playerProfileId}
      style={{ ...btnSmallOutline, opacity: removingFromListId === r.playerProfileId ? 0.65 : 1 }}
      title={`Remove from ${selectedListName || "selected list"}`}
    >
      {removingFromListId === r.playerProfileId ? "Removing…" : "Remove"}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => addPlayerToSelectedList(r.playerProfileId)}
      disabled={addingToListId === r.playerProfileId}
      style={{ ...btnSmall, opacity: addingToListId === r.playerProfileId ? 0.65 : 1 }}
      title={`Add to ${selectedListName || "selected list"}`}
    >
      {addingToListId === r.playerProfileId ? "Adding…" : "Add"}
    </button>
  )}
</div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</div>
    </main>
  );
}

function Field(props: { label: string; children: React.ReactNode; onClear?: () => void }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={fieldLabel}>{props.label}</div>
        {props.onClear ? (
          <button
            type="button"
            onClick={props.onClear}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 900,
              color: "#0f172a",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ---------------- Styles ---------------- */

const topRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: 0,
  border: "none",
  borderRadius: 0,
  background: "none",
};

const pageTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: "1.75rem",
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

const pageMuted: CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const selectedListHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const selectedListMeta: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const selectedListPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  whiteSpace: "nowrap",
};

const listPillsWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 6,
};

const listPillBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const card: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  minWidth: 0,   // ✅ allow cards to shrink inside grid (prevents page-level x-scroll)
};

const cardTitle: CSSProperties = { fontWeight: 900, fontSize: 16 };
const sectionTitle: CSSProperties = { fontWeight: 900, fontSize: 14 };
const miniTitle: CSSProperties = { fontWeight: 900, fontSize: 12, color: "#0f172a", marginTop: 6 };

const cardSub: CSSProperties = { marginTop: 4, color: "#64748b", fontSize: 13, lineHeight: 1.3 };
const mutedSmall: CSSProperties = { color: "#64748b", fontSize: 12, lineHeight: 1.3 };

const divider: CSSProperties = { height: 1, background: "#e5e7eb", margin: "12px 0 6px" };

const fieldLabel: CSSProperties = { fontSize: 11, color: "#64748b", fontWeight: 900 };

const formRow: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const inputWide: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  minWidth: 260,
};

const inputWideSm: CSSProperties = { ...inputWide, minWidth: 200 };

const inputSm: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  width: 140,
};

const inputXs: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  width: 120,
};

const select: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  width: "100%",
};

const selectSm: CSSProperties = { ...select, width: 120 };
const selectMd: CSSProperties = { ...select, width: 150 };

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
};

const btnSmall: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const btnSmallOutline: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const errorBoxInline: CSSProperties = {
  marginTop: 10,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12,
};

const warnBoxInline: CSSProperties = {
  marginTop: 10,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12,
};

const tableWrap: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,   // ✅ critical: allows the scroll container to shrink and keep overflow internal
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  overflowX: "auto",
  background: "#fff",
};

const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 };

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 900,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const targetsPosWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  flex: 1,
};

const targetsPosBtn: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const targetsPosBtnGhost: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px dashed #e5e7eb",
  background: "transparent",
  color: "#64748b",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  justifySelf: "start",
};

const contactDetails: CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const contactSummary: CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 10,
  padding: "6px 10px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const contactMenu: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 120,
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  padding: 6,
  zIndex: 10,
};

const contactLink: CSSProperties = {
  display: "block",
  padding: "8px 10px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#0ea5e9",
  fontWeight: 900,
  fontSize: 12,
};

const contactDisabled: CSSProperties = {
  display: "block",
  padding: "8px 10px",
  borderRadius: 10,
  color: "#94a3b8",
  fontWeight: 900,
  fontSize: 12,
};

const thClick: CSSProperties = { ...th, cursor: "pointer" };
const thRightClick: CSSProperties = { ...th, textAlign: "right" };
const thRight: CSSProperties = { ...th, textAlign: "right" };

const td: CSSProperties = { padding: "10px 12px", borderTop: "1px solid #eef2f7", color: "#0f172a" };
const tdRight: CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };

const tdMuted: CSSProperties = { padding: "12px 12px", borderTop: "1px solid #eef2f7", color: "#64748b" };

const linkSky: CSSProperties = { color: "#0ea5e9", fontWeight: 900, textDecoration: "none" };

const pillCommitted: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #bbf7d0",
  background: "#ecfdf5",
  color: "#0ea5e9",
  whiteSpace: "nowrap",
};

const pillInList: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#334155",
  whiteSpace: "nowrap",
};

const presetWrap: CSSProperties = {
  marginTop: 10,
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const presetHeaderRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const presetTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const presetMuted: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.3,
};

const presetChips: CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const targetsBlock: CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 8,
  maxHeight: 116,            // ~3 rows visible
  overflowY: "auto",
  paddingRight: 6,           // keeps scrollbar off the text
};

const targetsRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const targetsYearBtn: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #caa042",
  background: "rgba(202,160,66,0.16)",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  textAlign: "center",
};

const targetsPosText: CSSProperties = {
  fontSize: 12,
  color: "#0f172a",
  fontWeight: 800,
  lineHeight: 1.2,
  opacity: 0.9,
};

const presetHelper: CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.3,
};

const presetClearBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const chip: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #caa042",
  background: "rgba(202,160,66,0.16)",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const chipSoft: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const ratingWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const ratingStarBox: CSSProperties = {
  width: 16,
  height: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const wrap: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px 16px",
  display: "grid",
  gap: 14,
  boxSizing: "border-box",
};

const tableTight: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  tableLayout: "fixed",
  minWidth: 450,
};

const thTight: CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 900,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const thRightTight: CSSProperties = { ...thTight, textAlign: "right" };

const tdTight: CSSProperties = {
  padding: "8px 8px",
  borderTop: "1px solid #eef2f7",
  color: "#0f172a",
  verticalAlign: "middle",
};

const tdRightTight: CSSProperties = { ...tdTight, textAlign: "right", whiteSpace: "nowrap" };

const truncateText: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const selectedListTableWrap: CSSProperties = {
  maxWidth: 450,
};

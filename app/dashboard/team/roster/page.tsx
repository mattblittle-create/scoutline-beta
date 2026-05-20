// app/dashboard/team/roster/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const POSITION_OPTIONS = [
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

const POSITION_GROUPS: Record<string, string[]> = {
  CIF: ["1B", "3B"],
  MIF: ["2B", "SS"],
  OF: ["LF", "CF", "RF"],
};

function normalizePos(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function expandSelectedPositions(selected: string[]) {
  const out = new Set<string>();
  for (const s of selected) {
    const key = normalizePos(s);
    const grp = POSITION_GROUPS[key];
    if (grp) grp.forEach((p) => out.add(p));
    else out.add(key);
  }
  return Array.from(out);
}

function addToSet(prev: string[], value: string) {
  const v = normalizePos(value);
  if (!v) return prev;
  if (prev.includes(v)) return prev;
  return [...prev, v];
}

function removeFromSet(prev: string[], value: string) {
  const v = normalizePos(value);
  return prev.filter((x) => normalizePos(x) !== v);
}

type RosterRow = {
  membershipId?: string;
  playerProfileId: string;
  publicSlug?: string | null; // ✅ public route slug for /player/[slug]
  firstName: string;
  lastName: string;
  photoUrl?: string | null;

  gradYear?: number | null;
  gpa?: string | null;
  committed?: boolean | null;
  primaryPos?: string | null;
  secondaryPos?: string | null;
  pitcher?: boolean | null;
  throws?: string | null; // "R" | "L"
  bats?: string | null; // "R" | "L" | "S"

  isActive: boolean;
};

type Filters = {
  q: string;
  gradYear: string;
  gpaMin: string;

  committed: "" | "yes" | "no";

  // multi-select positions
  primaryPositions: string[];
  secondaryPositions: string[];

  pitcher: "" | "yes" | "no";

  // dropdown hands
  throws: "ANY" | "R" | "L";
  bats: "ANY" | "R" | "L" | "S";
};

function normText(v: any) {
  return String(v ?? "").trim();
}

function fullName(r: RosterRow) {
  return `${r.firstName || ""} ${r.lastName || ""}`.trim();
}

function matchesFilters(r: RosterRow, f: Filters) {
  const q = f.q.toLowerCase();
  if (q) {
    const name = fullName(r).toLowerCase();
    if (!name.includes(q)) return false;
  }

  if (f.gradYear) {
    const gy = Number(f.gradYear);
    if (!Number.isFinite(gy) || r.gradYear !== gy) return false;
  }

  if (f.gpaMin) {
    const min = Number(f.gpaMin);
    const gpa = r.gpa ? Number(r.gpa) : NaN;
    if (Number.isFinite(min) && Number.isFinite(gpa) && gpa < min) return false;
    if (Number.isFinite(min) && !Number.isFinite(gpa)) return false;
  }

  if (f.committed) {
    const want = f.committed === "yes";
    if (!!r.committed !== want) return false;
  }

  // positions (multi-select + group expansion)
  const expandedPrimary = expandSelectedPositions(f.primaryPositions || []);
  const expandedSecondary = expandSelectedPositions(f.secondaryPositions || []);

  const rp = normalizePos(r.primaryPos);
  const rs = normalizePos(r.secondaryPos);

  if (expandedPrimary.length) {
    if (!expandedPrimary.includes(rp)) return false;
  }

  if (expandedSecondary.length) {
    if (!expandedSecondary.includes(rs)) return false;
  }

  if (f.pitcher) {
    const want = f.pitcher === "yes";
    if (!!r.pitcher !== want) return false;
  }

  if (f.bats !== "ANY") {
    if (normalizePos(r.bats) !== f.bats) return false;
  }

  if (f.throws !== "ANY") {
    if (normalizePos(r.throws) !== f.throws) return false;
  }

  return true;
}

export default function TeamRosterPage() {
  const search = useSearchParams();
  const fallbackEmail = normText(search.get("email") || search.get("username")).toLowerCase();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<RosterRow[]>([]);
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [filters, setFilters] = React.useState<Filters>({
    q: "",
    gradYear: "",
    gpaMin: "",
    committed: "",
    primaryPositions: [],
    secondaryPositions: [],
    pitcher: "",
    bats: "ANY",
    throws: "ANY",
  });

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const [teaserModalOpen, setTeaserModalOpen] = React.useState(false);
  const [teaserCoachEmail, setTeaserCoachEmail] = React.useState("");
  const [teaserCoachName, setTeaserCoachName] = React.useState("");
  const [teaserNote, setTeaserNote] = React.useState("");
  const [teaserSuccess, setTeaserSuccess] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => rows.filter((r) => matchesFilters(r, filters)), [rows, filters]);
  const selectedIds = React.useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const selectedRows = React.useMemo(() => {
    const setIds = new Set(selectedIds);
    return rows.filter((r) => setIds.has(r.playerProfileId));
  }, [rows, selectedIds]);

  const selectedActiveRows = React.useMemo(() => selectedRows.filter((r) => r.isActive && !!r.publicSlug), [selectedRows]);

async function load() {
  setLoading(true);
  setError(null);

  try {
    const url = fallbackEmail
      ? `/api/team/roster?email=${encodeURIComponent(fallbackEmail)}`
      : "/api/team/roster";

    const res = await fetch(url, {
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Roster API returned non-JSON response.");
    }

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to load roster.");
    }

const apiRows = (json?.data?.roster || []) as RosterRow[];

setRows(Array.isArray(apiRows) ? apiRows : []);
setAnalytics(json?.data?.analytics || null);
  } catch (e: any) {
    setRows([]);
    setError(e?.message || "Failed to load roster.");
  } finally {
    setLoading(false);
  }
}

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const r of filtered) next[r.playerProfileId] = on;
    setSelected(next);
  }

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function clearSelection() {
    setSelected({});
  }

async function persistRosterActive(membershipId: string, isActive: boolean) {
  const url = fallbackEmail
    ? `/api/team/roster?email=${encodeURIComponent(fallbackEmail)}`
    : "/api/team/roster";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipId, isActive }),
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Roster update returned non-JSON response.");
  }

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Failed to update roster status.");
  }
}

  async function toggleRosterActive(playerProfileId: string) {
    const current = rows.find((r) => r.playerProfileId === playerProfileId);
    if (!current) return;

    const nextActive = !current.isActive;

    // optimistic UI
    setRows((prev) => prev.map((r) => (r.playerProfileId === playerProfileId ? { ...r, isActive: nextActive } : r)));

    try {
      if (current.membershipId) {
        await persistRosterActive(current.membershipId, nextActive);
      }
    } catch (e: any) {
      // revert on failure
      setRows((prev) => prev.map((r) => (r.playerProfileId === playerProfileId ? { ...r, isActive: !nextActive } : r)));
      setError(e?.message || "Failed to update roster status.");
    }
  }

function openTeaserTabs(rowsToOpen: RosterRow[]) {
  const activeWithSlug = rowsToOpen.filter((r) => r.isActive && !!r.publicSlug);

  if (!activeWithSlug.length) {
    setError(
      "Select at least one ACTIVE player with a public profile slug to send a teaser card."
    );
    return;
  }

  for (const r of activeWithSlug) {
    const url = `/player/${encodeURIComponent(
      r.publicSlug as string
    )}/card?from=teaser`;

    window.open(url, "_blank", "noopener,noreferrer");
  }
}

async function sendTeaserCards() {
  setError(null);

  const playerProfileIds = selectedActiveRows
    .map((r) => r.playerProfileId)
    .filter(Boolean);

  try {
    const res = await fetch("/api/team/teaser-cards/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachEmail: teaserCoachEmail,
        coachName: teaserCoachName,
        note: teaserNote,
        playerProfileIds,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to send teaser cards.");
    }

    setTeaserModalOpen(false);
    setTeaserCoachEmail("");
    setTeaserCoachName("");
    setTeaserNote("");

setTeaserSuccess(
  `Teaser cards sent to ${teaserCoachEmail.trim()}.`
);
  } catch (e: any) {
    setError(e?.message || "Failed to send teaser cards.");
  }
}

return (
    <main style={{ display: "grid", gap: 12 }}>
      {analytics ? (
  <section
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    }}
  >
    <div style={analyticsCard}>
      <div style={analyticsLabel}>Active Players</div>
      <div style={analyticsValue}>
        {analytics.activePlayers ?? 0}
      </div>
    </div>

    <div style={analyticsCard}>
  <div style={analyticsLabel}>Inactive Players</div>
  <div style={analyticsValue}>
    {analytics.inactivePlayers ?? 0}
  </div>
</div>

    <div style={analyticsCard}>
      <div style={analyticsLabel}>Committed</div>
      <div style={analyticsValue}>
        {analytics.committedPlayers ?? 0}
      </div>
    </div>

    <div style={analyticsCard}>
      <div style={analyticsLabel}>Average GPA</div>
      <div style={analyticsValue}>
        {analytics.avgGpa ?? "—"}
      </div>
    </div>
  </section>
) : null}

{analytics ? (
  <section
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
    }}
  >
    <div style={analyticsCard}>
      <div style={analyticsLabel}>Grad Year Breakdown</div>
      <div style={breakdownList}>
        {Object.entries(analytics.gradYears || {}).map(([label, count]) => (
          <div key={label} style={breakdownRow}>
            <span>{label}</span>
            <strong>{String(count)}</strong>
          </div>
        ))}
      </div>
    </div>

    <div style={analyticsCard}>
      <div style={analyticsLabel}>Primary Position Breakdown</div>
      <div style={breakdownList}>
        {Object.entries(analytics.primaryPositions || {}).map(
          ([label, count]) => (
            <div key={label} style={breakdownRow}>
              <span>{label}</span>
              <strong>{String(count)}</strong>
            </div>
          )
        )}
      </div>
    </div>

    <div style={analyticsCard}>
      <div style={analyticsLabel}>Pitcher Breakdown</div>
      <div style={breakdownList}>
        {Object.entries(analytics.pitcherHands || {}).map(([label, count]) => (
          <div key={label} style={breakdownRow}>
            <span>{label}</span>
            <strong>{String(count)}</strong>
          </div>
        ))}
      </div>
    </div>
  </section>
) : null}

      {/* Top controls */}
      <section style={topBar}>
        <div style={{ display: "grid", gap: 6, minWidth: 260 }}>
          <div style={searchTitle}>Search</div>
          <input
            style={input}
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search by player name"
          />
          {fallbackEmail ? (
            <div style={miniHint}>Dev mode: email detected in URL: {fallbackEmail}</div>
          ) : (
            <div style={miniHint}>Tip: filters stack — use as many as you want.</div>
          )}
        </div>

        {/* Row 1: Grad Year, GPA, Committed */}
        <div style={filtersRow3}>
          <Filter label="Grad Year">
            <input
              style={input}
              value={filters.gradYear}
              onChange={(e) => setFilters((f) => ({ ...f, gradYear: e.target.value }))}
              placeholder="2028"
              inputMode="numeric"
            />
          </Filter>

          <Filter label="GPA (min)">
            <input
              style={input}
              value={filters.gpaMin}
              onChange={(e) => setFilters((f) => ({ ...f, gpaMin: e.target.value }))}
              placeholder="3.5"
              inputMode="decimal"
            />
          </Filter>

          <Filter label="Committed">
            <select
              style={input}
              value={filters.committed}
              onChange={(e) => setFilters((f) => ({ ...f, committed: e.target.value as any }))}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Filter>
        </div>

        {/* Row 2: Pitcher, Bats, Throws */}
        <div style={filtersRow3}>
          <Filter label="Pitcher">
            <select
              style={input}
              value={filters.pitcher}
              onChange={(e) => setFilters((f) => ({ ...f, pitcher: e.target.value as any }))}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Filter>

          <Filter label="Bats">
            <select style={input} value={filters.bats} onChange={(e) => setFilters((f) => ({ ...f, bats: e.target.value as any }))}>
              <option value="ANY">Any</option>
              <option value="R">R</option>
              <option value="L">L</option>
              <option value="S">S</option>
            </select>
          </Filter>

          <Filter label="Throws">
            <select
              style={input}
              value={filters.throws}
              onChange={(e) => setFilters((f) => ({ ...f, throws: e.target.value as any }))}
            >
              <option value="ANY">Any</option>
              <option value="R">R</option>
              <option value="L">L</option>
            </select>
          </Filter>
        </div>

        {/* Row 3: Primary Positions + Secondary Positions */}
        <div style={filtersRow2Wide}>
          <Filter label="Primary Positions">
            <select
              style={input}
              value=""
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (!val) return;
                setFilters((f) => ({ ...f, primaryPositions: addToSet(f.primaryPositions, val) }));
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>
                Select…
              </option>
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {filters.primaryPositions.length ? (
              <div style={pillRowCompact}>
                {filters.primaryPositions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    style={pillChipCompact}
                    onClick={() => setFilters((f) => ({ ...f, primaryPositions: removeFromSet(f.primaryPositions, p) }))}
                    title="Remove"
                  >
                    <span style={{ paddingRight: 6 }}>{p}</span>
                    <span style={pillXCompact}>×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Filter>

          <Filter label="Secondary Positions">
            <select
              style={input}
              value=""
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (!val) return;
                setFilters((f) => ({ ...f, secondaryPositions: addToSet(f.secondaryPositions, val) }));
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>
                Select…
              </option>
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {filters.secondaryPositions.length ? (
              <div style={pillRowCompact}>
                {filters.secondaryPositions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    style={pillChipCompact}
                    onClick={() => setFilters((f) => ({ ...f, secondaryPositions: removeFromSet(f.secondaryPositions, p) }))}
                    title="Remove"
                  >
                    <span style={{ paddingRight: 6 }}>{p}</span>
                    <span style={pillXCompact}>×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Filter>
        </div>
      </section>

      {/* Actions */}
      <section style={actionsRow}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={btnGhost} onClick={() => toggleAll(true)} disabled={loading}>
            Select All
          </button>
          <button type="button" style={btnGhost} onClick={() => toggleAll(false)} disabled={loading}>
            Clear All
          </button>
          <button type="button" style={btnGhost} onClick={clearSelection} disabled={loading || selectedIds.length === 0}>
            Clear Selection
          </button>

          <div style={pill}>
            Selected: <span style={{ fontWeight: 900 }}>{selectedIds.length}</span>
          </div>

          <button
            type="button"
            style={{
              ...btnGoldSmall,
              cursor: selectedActiveRows.length ? "pointer" : "not-allowed",
              opacity: selectedActiveRows.length ? 1 : 0.65,
            }}
            disabled={loading || selectedActiveRows.length === 0}
            title={
              selectedActiveRows.length
                ? `Open teaser cards for ${selectedActiveRows.length} active player(s)`
                : "Select at least one ACTIVE player to send teaser cards."
            }
            onClick={() => {
  setTeaserSuccess(null);
  setTeaserModalOpen(true);
}}
          >
            Send Teaser Cards
          </button>
          
          {teaserSuccess ? (
  <div
    style={{
      border: "1px solid #bbf7d0",
      borderRadius: 12,
      background: "#f0fdf4",
      color: "#166534",
      padding: "8px 12px",
      fontWeight: 900,
      fontSize: 12,
    }}
  >
    {teaserSuccess}
  </div>
) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={btnGhost} onClick={load} disabled={loading}>
            Refresh
          </button>

<span style={miniHint}>
  Loaded from roster API
</span>
        </div>
      </section>

      {/* List */}
      <section style={card}>
        {loading ? (
          <div style={{ padding: 10, color: "#475569", fontWeight: 800 }}>Loading…</div>
        ) : error ? (
          <div style={errorBox}>{error}</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Roster ({filtered.length} shown / {rows.length} total)
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={miniHint}>Select player(s) to enable specific actions.</div>
                <div style={miniHint}>Click "Active" or "Inactive" to update player status on roster.</div>
              </div>
            </div>

            {/* ✅ Scrollable roster area (page stays stable) */}
            <div style={rosterScrollArea}>
              {filtered.length === 0 ? (
                <div style={{ padding: 10, color: "#64748b", fontWeight: 800 }}>No players match your filters.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {filtered.map((r) => {
                    const isSelected = !!selected[r.playerProfileId];

                    // ✅ single gate for row actions
                    const canActions = r.isActive;

                    // teaser also requires slug
                    const canTeaser = canActions && !!r.publicSlug;

                    return (
                      <div key={r.playerProfileId} style={rowCard}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.playerProfileId)} />

                          <div style={avatar}>
                            {r.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.photoUrl}
                                alt={fullName(r)}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <span style={{ fontWeight: 900, color: "#64748b" }}>
                                {r.firstName?.[0] || "P"}
                                {r.lastName?.[0] || ""}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
<div style={{ fontWeight: 900 }}>
  {r.publicSlug ? (
    <Link
      href={`/player/${encodeURIComponent(r.publicSlug)}`}
      style={{ color: "#0f172a", textDecoration: "none" }}
      title="View public player profile"
    >
      {fullName(r) || "Player"}
    </Link>
  ) : (
    <span>{fullName(r) || "Player"}</span>
  )}{" "}
  {r.committed ? <span style={committedPill}>COMMITTED</span> : null}
</div>

<button
  type="button"
  onClick={() => toggleRosterActive(r.playerProfileId)}
  style={r.isActive ? activePillSmall : inactivePillSmall}
  title={
    fallbackEmail
      ? "Toggle roster status"
      : "Active players appear on the team roster and count toward team billing. Inactive players are removed from the active roster and lose team-managed profile access until reactivated."
  }
>
  {r.isActive ? "Active" : "Inactive"}
</button>
                            </div>

                            <div style={mutedLine}>
                              Grad {r.gradYear ?? "—"} • GPA {r.gpa ?? "—"} • {r.primaryPos ?? "—"}
                              {r.secondaryPos ? ` / ${r.secondaryPos}` : ""} • Throws {r.throws ?? "—"} • Bats{" "}
                              {r.bats ?? "—"}
                            </div>
                          </div>
                        </div>

                        <div style={rightActions}>
                          {isSelected ? (
                            <>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(145px, 1fr))",
    gap: 8,
    alignItems: "stretch",
    width: "100%",
    maxWidth: 650,
  }}
>
  {/* Top row: Edit, Recruiting, Teaser */}
  {canActions ? (
    <Link
      href={`/dashboard/team/roster/player/${encodeURIComponent(
        r.playerProfileId
      )}/edit`}
      style={btnGhostSmall}
    >
      Edit Player Profile
    </Link>
  ) : (
    <span
      style={btnGhostSmallDisabled}
      title="Player must be Active to edit profile."
    >
      Edit Player Profile
    </span>
  )}

  {canActions ? (
    <Link
      href={`/dashboard/player/recruiting-tool?playerProfileId=${encodeURIComponent(
        r.playerProfileId
      )}&from=team-roster`}
      style={btnGhostSmall}
    >
      Recruiting Tool
    </Link>
  ) : (
    <span
      style={btnGhostSmallDisabled}
      title="Player must be Active to use recruiting tools."
    >
      Recruiting Tool
    </span>
  )}

  {canActions && r.publicSlug ? (
<Link
  href={`/player/${encodeURIComponent(r.publicSlug)}/card?from=teaser`}
  target="_blank"
  rel="noopener noreferrer"
  style={btnGoldSmall}
>
  Send Teaser Card
</Link>
  ) : (
    <span
      style={btnGoldSmallDisabled}
      title={
        !r.publicSlug
          ? "Player needs a public profile before sending a teaser card."
          : "Player must be Active to send teaser card."
      }
    >
      Send Teaser Card
    </span>
  )}

  {/* Bottom row: College Search, Suggested, Target */}
  {canActions ? (
    <Link
      href={`/dashboard/player/college-search?playerProfileId=${encodeURIComponent(
        r.playerProfileId
      )}&from=team-roster`}
      style={btnGhostSmall}
    >
      College Search
    </Link>
  ) : (
    <span
      style={btnGhostSmallDisabled}
      title="Player must be Active to use college search."
    >
      College Search
    </span>
  )}

  {canActions ? (
    <Link
      href={`/dashboard/player/suggested-programs?playerProfileId=${encodeURIComponent(
        r.playerProfileId
      )}&from=team-roster`}
      style={btnGhostSmall}
    >
      Suggested Programs
    </Link>
  ) : (
    <span
      style={btnGhostSmallDisabled}
      title="Player must be Active to view suggested programs."
    >
      Suggested Programs
    </span>
  )}

  {canActions ? (
    <Link
      href={`/dashboard/player/target-programs?playerProfileId=${encodeURIComponent(
        r.playerProfileId
      )}&from=team-roster`}
      style={btnGhostSmall}
    >
      Target Programs
    </Link>
  ) : (
    <span
      style={btnGhostSmallDisabled}
      title="Player must be Active to view target programs."
    >
      Target Programs
    </span>
  )}
</div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
      {teaserModalOpen ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.45)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <section
      style={{
        width: "100%",
        maxWidth: 720,
        borderRadius: 18,
        background: "#fff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
        padding: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 950,
            color: "#0f172a",
          }}
        >
          Send Teaser Cards
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          Selected active players with public teaser cards:{" "}
          <strong>{selectedActiveRows.length}</strong>
        </p>
      </div>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  }}
>
  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontWeight: 900, fontSize: 12, color: "#0f172a" }}>
      Coach Email
    </span>
    <input
      style={input}
      value={teaserCoachEmail}
      onChange={(e) => setTeaserCoachEmail(e.target.value)}
      placeholder="coach@college.edu"
      type="email"
    />
  </label>

  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontWeight: 900, fontSize: 12, color: "#0f172a" }}>
      Coach Name Optional
    </span>
    <input
      style={input}
      value={teaserCoachName}
      onChange={(e) => setTeaserCoachName(e.target.value)}
      placeholder="Coach Smith"
    />
  </label>
</div>

<label style={{ display: "grid", gap: 6 }}>
  <span style={{ fontWeight: 900, fontSize: 12, color: "#0f172a" }}>
    Personal Note Required
  </span>
  <textarea
    style={{
      ...input,
      minHeight: 110,
      resize: "vertical",
      lineHeight: 1.45,
    }}
    value={teaserNote}
    onChange={(e) => setTeaserNote(e.target.value)}
    placeholder="Coach, I wanted to send you a few players from our roster who may fit what you're looking for..."
  />
</label>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#f8fafc",
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        {selectedActiveRows.length ? (
          selectedActiveRows.map((r) => (
            <div
              key={r.playerProfileId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                color: "#0f172a",
                fontWeight: 850,
              }}
            >
              <span>{fullName(r) || r.playerProfileId}</span>

              {r.publicSlug ? (
                <Link
                  href={`/player/${encodeURIComponent(r.publicSlug)}/card?from=teaser`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#8a6a21",
                    fontWeight: 900,
                    textDecoration: "none",
                  }}
                >
                  Preview
                </Link>
              ) : null}
            </div>
          ))
        ) : (
          <div style={{ color: "#7f1d1d", fontWeight: 900 }}>
            Select at least one active player with a public profile.
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={btnGhost}
          onClick={() => setTeaserModalOpen(false)}
        >
          Close
        </button>

        <button
          type="button"
          style={{
            ...btnGoldSmall,
            padding: "10px 14px",
opacity:
  selectedActiveRows.length &&
  teaserCoachEmail.trim() &&
  teaserNote.trim().length >= 20
    ? 1
    : 0.6,
cursor:
  selectedActiveRows.length &&
  teaserCoachEmail.trim() &&
  teaserNote.trim().length >= 20
    ? "pointer"
    : "not-allowed",
          }}
          disabled={
  !selectedActiveRows.length ||
  !teaserCoachEmail.trim() ||
  teaserNote.trim().length < 20
}
          onClick={sendTeaserCards}
        >
          Send Teaser Cards
        </button>
      </div>
    </section>
  </div>
) : null}
    </main>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={filterField}>
      <div style={filterLabel}>{label}</div>
      {children}
    </div>
  );
}

/* ---------------- Styles ---------------- */

const topBar: React.CSSProperties = {
  display: "grid",
  gap: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
};

const searchTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  color: "#0f172a",
  margin: 0,
};

const filtersRow3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  alignItems: "end",
};

const filtersRow2Wide: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  alignItems: "start",
};

const filterField: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const filterLabel: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 400,
  outline: "none",
  background: "#fff",
};

const pillRowCompact: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 6,
};

const pillChipCompact: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "4px 8px",
  background: "#f8fafc",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 11,
  lineHeight: 1,
};

const pillXCompact: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  lineHeight: 1,
  fontWeight: 900,
  fontSize: 12,
};

const actionsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const pill: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 12,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

const rosterScrollArea: React.CSSProperties = {
  marginTop: 10,
  maxHeight: 520,
  overflowY: "auto",
  paddingRight: 6,
};

const rowCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  background: "#fff",
};

const rightActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "nowrap",
  justifyContent: "flex-end",
  minWidth: 0,
};

const avatar: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const committedPill: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 8,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  fontWeight: 900,
  fontSize: 11,
  verticalAlign: "middle",
};

const mutedLine: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
};

const miniHint: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.35,
};

const analyticsCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
  display: "grid",
  gap: 6,
};

const analyticsLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const analyticsValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1,
};

const breakdownList: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 4,
};

const breakdownRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 10,
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 800,
};

const errorBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
};

const btnGoldSmall: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontSize: 12,
  fontWeight: 900,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const btnGoldSmallDisabled: React.CSSProperties = {
  ...btnGoldSmall,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#94a3b8",
  cursor: "not-allowed",
  opacity: 0.7,
  userSelect: "none",
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
  cursor: "pointer",
};

const btnGhostSmall: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const btnGhostSmallDisabled: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#94a3b8",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "not-allowed",
  fontSize: 12,
  whiteSpace: "nowrap",
  userSelect: "none",
};

const activePillSmall: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #bbf7d0",
  background: "#d4af37",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 11,
  cursor: "pointer",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const inactivePillSmall: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #fecaca",
  background: "#FF0000",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 11,
  cursor: "pointer",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

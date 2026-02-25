"use client";

import React, { useEffect, useState } from "react";

type TeamRole = "PLAYER" | "COACH" | "TEAM_ADMIN" | "RECRUITING_COACH";

type CoachDashboardResponse = {
  ok: true;
  data: {
    coach: {
      id: string;
      name: string | null;
      email: string;
      collegeId: string | null;
      collegeName: string | null;
    };
    teams: Array<{
      teamId: string;
      teamName: string;
      teamType: string;
      role: TeamRole;
      season: string | null;
      isPrimaryForProfile: boolean;
    }>;
    teamPlayers: Array<{
      teamId: string;
      teamName: string;
      teamType: string;
      playerUserId: string;
      playerName: string | null;
      playerEmail: string | null;
      playerProfileId: string | null;
      profileState: string | null;
      ownershipMode: string | null;
      isPrimaryTeamForProfile: boolean;
      gradYear: number | null;
      primaryPos: string | null;
      secondaryPos: string | null;
      bats: string | null;
      throws: string | null;
    }>;
    recruitingBoard: Array<{
      entryId: string;
      createdAt: string;
      notifiedPlayer: boolean;
      label: string | null;
      playerProfileId: string;
      profileState: string;
      ownershipMode: string;
      playerUserId: string | null;
      playerName: string | null;
      playerEmail: string | null;
      gradYear: number | null;
      primaryPos: string | null;
      secondaryPos: string | null;
      bats: string | null;
      throws: string | null;
    }>;
  };
};

type ApiError = {
  ok: false;
  error: string;
};

type DashboardData = CoachDashboardResponse["data"];

type TabId = "teams" | "players" | "board";

export default function CoachDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("teams");
  const [selectedTeamId, setSelectedTeamId] = useState<string | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/coach/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const json: CoachDashboardResponse | ApiError = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          const msg =
            (!json.ok && "error" in json && json.error) ||
            `Request failed with status ${res.status}`;
          setError(msg);
          setData(null);
          return;
        }

        setData(json.data);
      } catch (err) {
        console.error("Error loading coach dashboard", err);
        if (!cancelled) {
          setError("Failed to load dashboard.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const coachName =
    data?.coach.name || (data?.coach.email ? data.coach.email.split("@")[0] : "");

  const hasTeams = (data?.teams.length ?? 0) > 0;
  const hasPlayers = (data?.teamPlayers.length ?? 0) > 0;
  const hasBoard = (data?.recruitingBoard.length ?? 0) > 0;

  const teamOptions = data?.teams ?? [];

  const filteredPlayers =
    data && data.teamPlayers
      ? selectedTeamId === "ALL"
        ? data.teamPlayers
        : data.teamPlayers.filter((p) => p.teamId === selectedTeamId)
      : [];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page heading */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Coach Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            View your teams, rosters, and recruiting board in one place.
          </p>
        </div>

        {data && (
          <div className="rounded-xl border border-slate-200 px-3 py-2 bg-white shadow-sm text-xs text-slate-700 max-w-xs">
            <div className="font-medium text-slate-900 truncate">
              {coachName || "Coach"}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {data.coach.email}
            </div>
            {data.coach.collegeName && (
              <div className="mt-1 text-[11px] text-emerald-700 font-medium truncate">
                {data.coach.collegeName} • College Program
              </div>
            )}
          </div>
        )}
      </header>

      {/* Loading / error states */}
      {loading && (
        <div className="text-sm text-slate-500">Loading dashboard…</div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && !data && (
        <div className="text-sm text-slate-500">
          No data available. Make sure you&apos;re logged in as a coach.
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Top summary cards */}
          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Teams you coach"
              value={data.teams.length}
              hint="Active coach / admin roles"
            />
            <SummaryCard
              label="Players on your rosters"
              value={data.teamPlayers.length}
              hint="Across all active teams"
            />
            <SummaryCard
              label="Players on recruiting board"
              value={data.recruitingBoard.length}
              hint={
                data.coach.collegeId
                  ? "Shared across your college staff"
                  : "College programs only"
              }
            />
          </section>

          {/* Tabs */}
          <section className="mt-4">
            <div className="flex border-b border-slate-200 gap-2 text-xs md:text-sm">
              <TabButton
                id="teams"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                label="My Teams"
              />
              <TabButton
                id="players"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                label="Team Players"
                disabled={!hasPlayers}
              />
              <TabButton
                id="board"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                label="Recruiting Board"
                disabled={!data.coach.collegeId}
              />
            </div>

            <div className="mt-4">
              {activeTab === "teams" && (
                <TeamsTab teams={data.teams} hasTeams={hasTeams} />
              )}

              {activeTab === "players" && (
                <PlayersTab
                  teams={teamOptions}
                  players={filteredPlayers}
                  hasPlayers={hasPlayers}
                  selectedTeamId={selectedTeamId}
                  setSelectedTeamId={setSelectedTeamId}
                />
              )}

              {activeTab === "board" && (
                <RecruitingBoardTab
                  board={data.recruitingBoard}
                  collegeName={data.coach.collegeName}
                  collegeId={data.coach.collegeId}
                  hasBoard={hasBoard}
                />
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

function SummaryCard(props: {
  label: string;
  value: number;
  hint?: string;
}) {
  const { label, value, hint } = props;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      {hint && (
        <div className="text-[11px] text-slate-400 leading-snug">{hint}</div>
      )}
    </div>
  );
}

function TabButton(props: {
  id: TabId;
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
  label: string;
  disabled?: boolean;
}) {
  const { id, activeTab, setActiveTab, label, disabled } = props;
  const isActive = activeTab === id;

  return (
    <button
      type="button"
      onClick={() => !disabled && setActiveTab(id)}
      className={[
        "px-3 py-2 border-b-2 -mb-px",
        "transition-colors text-xs md:text-sm",
        disabled
          ? "border-transparent text-slate-300 cursor-not-allowed"
          : isActive
          ? "border-amber-500 text-slate-900 font-medium"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* ------------------------------ Teams Tab --------------------------------- */

type Team = DashboardData["teams"][number];

function TeamsTab({ teams, hasTeams }: { teams: Team[]; hasTeams: boolean }) {
  if (!hasTeams) {
    return (
      <div className="text-sm text-slate-500">
        You&apos;re not currently listed as a coach or team admin on any
        active teams.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-xs md:text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Team</th>
            <th className="text-left px-3 py-2 font-medium">Type</th>
            <th className="text-left px-3 py-2 font-medium">Season</th>
            <th className="text-left px-3 py-2 font-medium">Role</th>
            <th className="text-left px-3 py-2 font-medium">
              Primary for Profiles
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={`${t.teamId}-${t.role}-${t.season ?? "base"}`}>
              <td className="px-3 py-2 border-t border-slate-100 text-slate-900">
                {t.teamName}
              </td>
              <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                {formatTeamType(t.teamType)}
              </td>
              <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                {t.season || "—"}
              </td>
              <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                {formatTeamRole(t.role)}
              </td>
              <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                {t.isPrimaryForProfile ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                    Primary
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------- Players Tab -------------------------------- */

type PlayerRow = DashboardData["teamPlayers"][number];

function PlayersTab(props: {
  teams: Team[];
  players: PlayerRow[];
  hasPlayers: boolean;
  selectedTeamId: string | "ALL";
  setSelectedTeamId: (v: string | "ALL") => void;
}) {
  const { teams, players, hasPlayers, selectedTeamId, setSelectedTeamId } =
    props;

  if (!hasPlayers) {
    return (
      <div className="text-sm text-slate-500">
        No active players found across your teams yet.
      </div>
    );
  }

  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.teamId, t));

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
        <span className="text-slate-500">Filter by team:</span>
        <select
          value={selectedTeamId}
          onChange={(e) =>
            setSelectedTeamId(
              e.target.value === "ALL" ? "ALL" : e.target.value
            )
          }
          className="border border-slate-300 rounded-md px-2 py-1 text-xs md:text-sm bg-white"
        >
          <option value="ALL">All teams</option>
          {teams.map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.teamName}
              {t.season ? ` • ${t.season}` : ""}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400">
          Showing {players.length} player
          {players.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Player</th>
              <th className="text-left px-3 py-2 font-medium">Team</th>
              <th className="text-left px-3 py-2 font-medium">Grad</th>
              <th className="text-left px-3 py-2 font-medium">Pos</th>
              <th className="text-left px-3 py-2 font-medium">B / T</th>
              <th className="text-left px-3 py-2 font-medium">Ownership</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const team = teamMap.get(p.teamId);
              const isPrimaryTeam = p.isPrimaryTeamForProfile;

              return (
                <tr key={`${p.teamId}-${p.playerUserId}`}>
                  <td className="px-3 py-2 border-t border-slate-100">
                    <div className="text-slate-900">
                      {p.playerName || "Unnamed Player"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.playerEmail || "No email"}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                    <div>{p.teamName}</div>
                    {team?.season && (
                      <div className="text-[11px] text-slate-400">
                        {team.season}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                    {p.gradYear ?? "—"}
                  </td>
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                    <div>
                      {p.primaryPos || "—"}
                      {p.secondaryPos ? ` / ${p.secondaryPos}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                    {p.bats || "—"} / {p.throws || "—"}
                  </td>
                  <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] rounded-full border border-slate-200 px-2 py-0.5 bg-slate-50 text-slate-600">
                        {formatOwnership(p.ownershipMode, p.profileState)}
                      </span>
                      {isPrimaryTeam && (
                        <span className="text-[10px] text-emerald-700">
                          Primary team
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------- Recruiting Board Tab -------------------------- */

type BoardEntry = DashboardData["recruitingBoard"][number];

function RecruitingBoardTab(props: {
  board: BoardEntry[];
  collegeName: string | null;
  collegeId: string | null;
  hasBoard: boolean;
}) {
  const { board, collegeName, collegeId, hasBoard } = props;

  if (!collegeId) {
    return (
      <div className="text-sm text-slate-500">
        Recruiting Board is only available for college programs. Link your
        coach account to a college to enable this view.
      </div>
    );
  }

  if (!hasBoard) {
    return (
      <div className="text-sm text-slate-500">
        No players on your recruiting board yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collegeName && (
        <div className="text-xs text-slate-500">
          Shared board for{" "}
          <span className="font-medium text-slate-800">
            {collegeName}
          </span>
          .
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Player</th>
              <th className="text-left px-3 py-2 font-medium">Grad</th>
              <th className="text-left px-3 py-2 font-medium">Pos</th>
              <th className="text-left px-3 py-2 font-medium">B / T</th>
              <th className="text-left px-3 py-2 font-medium">Label</th>
              <th className="text-left px-3 py-2 font-medium">Added</th>
              <th className="text-left px-3 py-2 font-medium">Notified</th>
            </tr>
          </thead>
          <tbody>
            {board.map((entry) => (
              <tr key={entry.entryId}>
                <td className="px-3 py-2 border-t border-slate-100">
                  <div className="text-slate-900">
                    {entry.playerName || "Unnamed Player"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {entry.playerEmail || "No email"}
                  </div>
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  {entry.gradYear ?? "—"}
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  <div>
                    {entry.primaryPos || "—"}
                    {entry.secondaryPos ? ` / ${entry.secondaryPos}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  {entry.bats || "—"} / {entry.throws || "—"}
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  {entry.label || "—"}
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  {formatShortDate(entry.createdAt)}
                </td>
                <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                  {entry.notifiedPlayer ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                      Yes
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

function formatTeamType(type: string): string {
  switch (type) {
    case "TRAVEL":
      return "Travel";
    case "HS":
      return "High School";
    case "TRAINING":
      return "Training / Facility";
    case "COLLEGE":
      return "College";
    case "OTHER":
      return "Other";
    default:
      return type;
  }
}

function formatTeamRole(role: TeamRole): string {
  switch (role) {
    case "PLAYER":
      return "Player";
    case "COACH":
      return "Coach";
    case "TEAM_ADMIN":
      return "Team Admin";
    case "RECRUITING_COACH":
      return "Recruiting Coach";
    default:
      return role;
  }
}

function formatOwnership(ownershipMode: string | null, state: string | null) {
  const s = state || "";
  const o = ownershipMode || "";

  if (s === "TEAM_REMOVAL_PENDING_TRANSFER") {
    return "Transfer window (team → player)";
  }
  if (s === "ARCHIVED_NO_ACTIVE_PLAN") {
    return "Archived (no active plan)";
  }
  if (s === "TEAM_OWNED_ACTIVE") {
    if (o === "TEAM_PRIMARY") return "Team-owned (primary)";
    return "Team-owned";
  }
  if (s === "PLAYER_OWNED_ACTIVE") {
    if (o === "PLAYER_PRIMARY") return "Player-owned (primary)";
    return "Player-owned";
  }
  return "Unknown";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// app/team/[slug]/RosterClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";

type PublicPlayerRow = {
  playerProfileId: string;
  publicSlug: string;
  firstName: string;
  lastName: string;
  gradYear?: number | null;
  primaryPos?: string | null;
  secondaryPos?: string | null;
  committed?: boolean;
  committedCollege?: string | null;
  photoUrl?: string | null;
};

function safeText(v: any) {
  return String(v ?? "").trim();
}

function fullName(p: PublicPlayerRow) {
  const n = `${safeText(p.firstName)} ${safeText(p.lastName)}`.trim();
  return n || "Player";
}

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

function posString(p: PublicPlayerRow) {
  const a = safeText(p.primaryPos);
  const b = safeText(p.secondaryPos);
  return [a, b].filter(Boolean).join(" / ");
}

type Props = {
  roster: PublicPlayerRow[];
};

type SortKey = "NAME_ASC" | "NAME_DESC" | "GRAD_ASC" | "GRAD_DESC" | "POS_ASC";

export default function RosterClient({ roster }: Props) {
  const [qName, setQName] = React.useState("");
  const [qGrad, setQGrad] = React.useState("");
  const [qPos, setQPos] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("NAME_ASC");

  const filtered = React.useMemo(() => {
    const nameNeedle = norm(qName);
    const posNeedle = norm(qPos);

    const gradNeedle = norm(qGrad);
    const gradNum = gradNeedle ? Number(gradNeedle) : NaN;

    return (roster || []).filter((p) => {
      // 1) Name
      if (nameNeedle) {
        const nameHay = norm(`${p.firstName ?? ""} ${p.lastName ?? ""}`);
        if (!nameHay.includes(nameNeedle)) return false;
      }

      // 2) Grad Year
      if (gradNeedle) {
        if (!Number.isFinite(gradNum)) return false;
        const gy = typeof p.gradYear === "number" ? p.gradYear : null;
        if (gy !== gradNum) return false;
      }

      // 3) Position
      if (posNeedle) {
        const hay = norm(`${p.primaryPos ?? ""} ${p.secondaryPos ?? ""}`);
        if (!hay.includes(posNeedle)) return false;
      }

      return true;
    });
  }, [roster, qName, qGrad, qPos]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];

    const nameCmp = (a: PublicPlayerRow, b: PublicPlayerRow) => {
      const an = norm(fullName(a));
      const bn = norm(fullName(b));
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    };

    const gradCmp = (a: PublicPlayerRow, b: PublicPlayerRow) => {
      const ag = typeof a.gradYear === "number" ? a.gradYear : 9999;
      const bg = typeof b.gradYear === "number" ? b.gradYear : 9999;
      if (ag !== bg) return ag - bg;
      return nameCmp(a, b);
    };

    const posCmp = (a: PublicPlayerRow, b: PublicPlayerRow) => {
      const ap = norm(posString(a) || "zzzz");
      const bp = norm(posString(b) || "zzzz");
      if (ap < bp) return -1;
      if (ap > bp) return 1;
      return nameCmp(a, b);
    };

    arr.sort((a, b) => {
      switch (sort) {
        case "NAME_DESC":
          return -nameCmp(a, b);
        case "GRAD_ASC":
          return gradCmp(a, b);
        case "GRAD_DESC":
          return -gradCmp(a, b);
        case "POS_ASC":
          return posCmp(a, b);
        case "NAME_ASC":
        default:
          return nameCmp(a, b);
      }
    });

    return arr;
  }, [filtered, sort]);

  const hasAnyQuery = Boolean(norm(qName) || norm(qGrad) || norm(qPos));
  const showing = sorted.length;
  const total = (roster || []).length;

  return (
    <section style={card}>
      <div style={headerTop}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Roster</div>
          <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700 }}>
            List of active players on this team with public profiles. Click a player to view their profile.
          </div>
        </div>

        <div style={pill}>
          Showing: <span style={{ fontWeight: 950 }}>{showing}</span>
          <span style={{ opacity: 0.7 }}> / {total}</span>
        </div>
      </div>

      {/* Search + Sort */}
      <div style={controls}>
        <div style={controlGrid}>
          <div style={field}>
            <label style={label}>Search Name</label>
            <input
              style={input}
              value={qName}
              onChange={(e) => setQName(e.target.value)}
              placeholder="first and/or last"
              autoComplete="off"
            />
          </div>

          <div style={field}>
            <label style={label}>Grad Year</label>
            <input
              style={input}
              value={qGrad}
              onChange={(e) => setQGrad(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              placeholder="e.g., 2028"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>

          <div style={field}>
            <label style={label}>Position</label>
            <input
              style={input}
              value={qPos}
              onChange={(e) => setQPos(e.target.value)}
              placeholder="e.g., SS or RHP"
              autoComplete="off"
            />
          </div>

          <div style={field}>
            <label style={label}>Sort</label>
            <select style={input} value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="NAME_ASC">Name (A–Z)</option>
              <option value="NAME_DESC">Name (Z–A)</option>
              <option value="GRAD_ASC">Grad Year (Asc)</option>
              <option value="GRAD_DESC">Grad Year (Desc)</option>
              <option value="POS_ASC">Position (A–Z)</option>
            </select>
          </div>
        </div>

        {hasAnyQuery ? (
          <div style={filterRow}>
            <button
              type="button"
              style={btnClear}
              onClick={() => {
                setQName("");
                setQGrad("");
                setQPos("");
              }}
            >
              Clear Filters
            </button>
            <div style={mutedSmall}>
              Tip: You can use 1, 2, or all 3 fields together.
            </div>
          </div>
        ) : (
          <div style={mutedSmall}>
            Tip: Search supports partial matches (name/position) and exact match for grad year.
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {total === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>
            No public players yet. Players will appear here once they accept and publish their profile.
          </div>
        ) : showing === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>
            No players match your search. Try clearing filters.
          </div>
        ) : (
          <div style={grid}>
            {sorted.map((p) => {
              const name = fullName(p);
              const pos = posString(p) || "—";
              const grad = p.gradYear ?? "—";

              const committed = Boolean(p.committed);
              const college = safeText(p.committedCollege);
              const committedTitle =
                committed && college
                  ? `Committed: ${college}`
                  : committed
                    ? "Committed"
                    : "";

              return (
                <Link
                  key={p.playerProfileId}
                  href={`/player/${encodeURIComponent(p.publicSlug)}`}
                  style={playerCard}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <div style={avatar}>
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photoUrl}
                          alt={name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontWeight: 950, color: "#64748b" }}>
                          {p.firstName?.[0] || "P"}
                          {p.lastName?.[0] || ""}
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={playerName}>{name}</div>
                        {committed ? (
                          <span style={committedPill} title={committedTitle}>
                            COMMITTED
                          </span>
                        ) : null}
                      </div>

                      <div style={playerMeta}>
                        Grad {grad} • {pos}
                        {committed && college ? ` • ${college}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Styles ---------------- */

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

const headerTop: React.CSSProperties = {
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

const controls: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
};

const controlGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 400,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

const filterRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const btnClear: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const mutedSmall: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 800,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 10,
};

const playerCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
  textDecoration: "none",
  display: "block",
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

const playerName: React.CSSProperties = {
  fontWeight: 950,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 240,
};

const playerMeta: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
};

const committedPill: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  fontWeight: 950,
  fontSize: 11,
};

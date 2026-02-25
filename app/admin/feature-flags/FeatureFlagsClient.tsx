// app/admin/feature-flags/FeatureFlagsClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Flag = {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  config: any;
  createdAt: string | Date;
  updatedAt: string | Date;
  updatedByAdminUserId: string | null;
  updatedByAdminUser: { id: string; user: { email: string } } | null;
};

function fmt(d: any) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function safeJsonStringify(v: any) {
  try {
    if (v === null || v === undefined) return "";
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

function parseJsonOrThrow(s: string) {
  const trimmed = (s || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("Config must be valid JSON (or blank).");
  }
}

function isValidKey(key: string) {
  // lowercase, numbers, underscores, hyphens; start with letter
  return /^[a-z][a-z0-9_-]{2,60}$/.test(key);
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 56,
        height: 28,
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: value ? "#caa042" : "#e5e7eb",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 150ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 30 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          transition: "all 150ms ease",
        }}
      />
    </button>
  );
}

function rolloutPct(config: any): number {
  const n = Number(config?.rollout);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function StatusBadge({
  enabled,
  rollout,
  isProd,
}: {
  enabled: boolean;
  rollout: number;
  isProd: boolean;
}) {
  const live = enabled && rollout >= 100 && isProd;
  const label = !enabled ? "OFF" : live ? "LIVE" : rollout >= 100 ? "ON" : `ON · ${rollout}%`;

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontWeight: 900,
    fontSize: 11,
    whiteSpace: "nowrap",
    background: !enabled ? "#f1f5f9" : live ? "rgba(202,160,66,0.20)" : "rgba(202,160,66,0.12)",
    color: !enabled ? "#475569" : "#0f172a",
  };

  return <span style={style}>{label}</span>;
}

export default function FeatureFlagsClient({
  initialFlags,
  canManage,
  isProd,
}: {
  initialFlags: Flag[];
  canManage: boolean;
  isProd: boolean;
}) {
  const router = useRouter();

  const [flags, setFlags] = React.useState<Flag[]>(() => initialFlags ?? []);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Create form
  const [newKey, setNewKey] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newEnabled, setNewEnabled] = React.useState(false);
  const [newConfig, setNewConfig] = React.useState("");

  // Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editKey, setEditKey] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editEnabled, setEditEnabled] = React.useState(false);
  const [editConfig, setEditConfig] = React.useState("");

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }

  function openEdit(f: Flag) {
    setError(null);
    setEditId(f.id);
    setEditKey(f.key);
    setEditDesc(f.description ?? "");
    setEditEnabled(!!f.enabled);
    setEditConfig(safeJsonStringify(f.config));
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
  }

  async function refreshFromServer() {
    // simplest + consistent: let server re-fetch
    router.refresh();
  }

  async function createFlag() {
    setError(null);

    const key = newKey.trim();
    if (!isValidKey(key)) {
      setError("Key must be lowercase and start with a letter (3–61 chars). Example: in_app_banners_enabled");
      return;
    }

    let config: any = null;
    try {
      config = parseJsonOrThrow(newConfig);
    } catch (e: any) {
      setError(e?.message || "Invalid JSON.");
      return;
    }

    setBusy("create");
    try {
      const res = await fetch("/api/admin/feature-flags/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          description: newDesc.trim() || null,
          enabled: !!newEnabled,
          config,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Created!");
      setNewKey("");
      setNewDesc("");
      setNewEnabled(false);
      setNewConfig("");
      await refreshFromServer();
    } catch (e: any) {
      setError(e?.message || "Failed to create.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFlag(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(id)}/toggle`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Updated!");
      await refreshFromServer();
    } catch (e: any) {
      setError(e?.message || "Failed to toggle.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editId) return;
    setError(null);
    setBusy(editId);

    let config: any = null;
    try {
      config = parseJsonOrThrow(editConfig);
    } catch (e: any) {
      setError(e?.message || "Invalid JSON.");
      setBusy(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(editId)}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc.trim() || null,
          enabled: !!editEnabled,
          config,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Saved!");
      closeEdit();
      await refreshFromServer();
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteFlag(f: Flag) {
    setError(null);
    if (!canManage) return;

    const ok = window.confirm(`Delete feature flag "${f.key}"?\n\nThis cannot be undone.`);
    if (!ok) return;

    setBusy(`delete:${f.id}`);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(f.id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Deleted.");
      await refreshFromServer();
    } catch (e: any) {
      setError(e?.message || "Failed to delete.");
    } finally {
      setBusy(null);
    }
  }

  // Keep local list usable even after refresh (Next will re-render, but this helps while editing)
  React.useEffect(() => setFlags(initialFlags ?? []), [initialFlags]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Create */}
      <section style={card}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>
          Create Feature Flag {canManage ? "" : "(read-only)"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 0.6fr", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Key</div>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g., in_app_banners_enabled"
              style={input}
              disabled={!canManage || busy === "create"}
            />
            <div style={hint}>lowercase, letters/numbers/_/- ; must start with a letter</div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Description</div>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What this flag controls"
              style={input}
              disabled={!canManage || busy === "create"}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Enabled</div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle value={newEnabled} onChange={setNewEnabled} disabled={!canManage || busy === "create"} />
              <div style={{ fontWeight: 900 }}>{newEnabled ? "True" : "False"}</div>
            </div>

            <button
              type="button"
              style={btnGold}
              onClick={createFlag}
              disabled={!canManage || busy === "create"}
              title={!canManage ? "Requires SCOUTLINE_ADMIN" : "Create flag"}
            >
              {busy === "create" ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <div style={lbl}>Config (JSON, optional)</div>
          <textarea
            value={newConfig}
            onChange={(e) => setNewConfig(e.target.value)}
            placeholder='e.g., { "rollout": 50, "cohorts": ["beta"] }'
            style={textarea}
            disabled={!canManage || busy === "create"}
          />
        </div>
      </section>

      {/* Status */}
      {toast ? <div style={{ ...muted, color: "#047857", fontWeight: 900 }}>{toast}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      {/* List */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Flags ({flags.length})</div>

          <button type="button" style={btnGhost} onClick={() => refreshFromServer()}>
            Refresh
          </button>
        </div>

        {flags.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800 }}>No feature flags yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Key", "Status", "Enabled", "Description", "Updated", "Updated By", "Actions"].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => {
                  const updatedBy = f.updatedByAdminUser?.user?.email ?? "—";
                  const rollout = rolloutPct(f.config);
                  const rowBusy = busy === f.id || busy === `delete:${f.id}`;

                  return (
                    <tr key={f.id}>
                      <td style={td}>
                        <code>{f.key}</code>
                      </td>

                      <td style={td}>
                        <StatusBadge enabled={!!f.enabled} rollout={rollout} isProd={isProd} />
                      </td>

                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <Toggle
                            value={!!f.enabled}
                            onChange={() => toggleFlag(f.id)}
                            disabled={!canManage || rowBusy}
                          />
                          <span style={{ fontWeight: 900 }}>{f.enabled ? "true" : "false"}</span>
                        </div>
                      </td>

                      <td style={td}>{(f.description || "").trim() || "—"}</td>

                      <td style={td}>{fmt(f.updatedAt)}</td>

                      <td style={td}>{updatedBy}</td>

                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={btnGhostSm}
                            onClick={() => openEdit(f)}
                            disabled={rowBusy}
                            title="Edit config/description"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={btnDangerSm}
                            onClick={() => deleteFlag(f)}
                            disabled={!canManage || rowBusy}
                            title={!canManage ? "Requires SCOUTLINE_ADMIN" : "Delete flag"}
                          >
                            {busy === `delete:${f.id}` ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editOpen ? (
        <div style={modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeEdit()}>
          <div style={modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>Edit Flag</div>
              <button type="button" style={btnGhost} onClick={closeEdit}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Key</div>
                <input value={editKey} readOnly style={{ ...input, background: "#f8fafc" }} />
                <div style={hint}>Key cannot be changed.</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Description</div>
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={input} />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ ...lbl, margin: 0 }}>Enabled</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Toggle value={editEnabled} onChange={setEditEnabled} />
                  <div style={{ fontWeight: 900 }}>{editEnabled ? "True" : "False"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Config (JSON, optional)</div>
                <textarea value={editConfig} onChange={(e) => setEditConfig(e.target.value)} style={textarea} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" style={btnGhost} onClick={closeEdit} disabled={busy === editId}>
                  Cancel
                </button>
                <button type="button" style={btnGold} onClick={saveEdit} disabled={busy === editId}>
                  {busy === editId ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Styles ---------------- */

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const lbl: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 800,
};

const muted: React.CSSProperties = {
  color: "#475569",
  fontWeight: 800,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  background: "#fff",
  fontSize: 12,
};

const textarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  background: "#fff",
  minHeight: 110,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 12,
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhostSm: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDangerSm: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 900,
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.10)",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  fontSize: 11,
  verticalAlign: "top",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "min(860px, 96vw)",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 14,
  boxShadow: "0 14px 40px rgba(15,23,42,0.20)",
};

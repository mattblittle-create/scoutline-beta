// app/admin/benchmarks/page.tsx

"use client";

import React from "react";

const SCOPE_OPTIONS = ["SCHOOL", "CONFERENCE", "DIVISION", "GLOBAL"] as const;

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
  "CIF",
  "MIF",
  "OF",
  "UTILITY",
] as const;

const METRIC_OPTIONS = [
  ["exitVelo", "Exit Velo", "mph"],
  ["sixtyYdDash", "60 Yard Dash", "sec"],
  ["homeToFirst", "Home to First", "sec"],
  ["infieldThrowVelo", "Infield Throw Velo", "mph"],
  ["outfieldThrowVelo", "Outfield Throw Velo", "mph"],
  ["catcherThrowVelo", "Catcher Throw Velo", "mph"],
  ["avgFbVelo", "Avg FB Velo", "mph"],
  ["popTime", "Pop Time", "sec"],
] as const;

type BenchmarkRow = {
  id: string;
  scope: string;
  sourceKey: string;
  position: string;
  metricKey: string;
  metricLabel?: string | null;
  averageValue?: string | number | null;
  minValue?: string | number | null;
  maxValue?: string | number | null;
  unit?: string | null;
  sampleSize?: number | null;
  sourceUrl?: string | null;
  sourceNote?: string | null;
  verifiedAt?: string | null;
};

const blankForm = {
  scope: "DIVISION",
  sourceKey: "NCAA_D1",
  position: "3B",
  metricKey: "exitVelo",
  metricLabel: "Exit Velo",
  averageValue: "",
  minValue: "",
  maxValue: "",
  unit: "mph",
  sampleSize: "",
  sourceUrl: "",
  sourceNote: "",
  verifiedAt: "",
};

export default function AdminBenchmarksPage() {
  const [rows, setRows] = React.useState<BenchmarkRow[]>([]);
  const [form, setForm] = React.useState(blankForm);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function loadBenchmarks() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/benchmarks", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not load benchmarks.");
      }

      setRows(data.benchmarks || []);
    } catch (err) {
      console.error("ADMIN_BENCHMARKS_PAGE_LOAD_ERROR", err);
      setError("Could not load benchmarks.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadBenchmarks();
  }, []);

  function updateForm(key: keyof typeof blankForm, value: string) {
    const next = { ...form, [key]: value };

    if (key === "metricKey") {
      const match = METRIC_OPTIONS.find(([metricKey]) => metricKey === value);
      if (match) {
        next.metricLabel = match[1];
        next.unit = match[2];
      }
    }

    setForm(next);
  }

  async function saveBenchmark(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not save benchmark.");
      }

      setMessage("Benchmark saved.");
      await loadBenchmarks();
    } catch (err) {
      console.error("ADMIN_BENCHMARKS_SAVE_ERROR", err);
      setError("Could not save benchmark.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBenchmark(id: string) {
    if (!window.confirm("Delete this benchmark?")) return;

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/benchmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not delete benchmark.");
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
      setMessage("Benchmark deleted.");
    } catch (err) {
      console.error("ADMIN_BENCHMARKS_DELETE_ERROR", err);
      setError("Could not delete benchmark.");
    }
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 16px 56px" }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#0f172a" }}>
        Baseball Metric Benchmarks
      </h1>

      <p style={{ marginTop: 8, color: "#475569", fontWeight: 700 }}>
        Add verified school, conference, division, and global benchmarks for Truth Fit.
      </p>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {message ? <div style={successStyle}>{message}</div> : null}

      <form onSubmit={saveBenchmark} style={panelStyle}>
        <div style={gridStyle}>
          <Field label="Scope">
            <select value={form.scope} onChange={(e) => updateForm("scope", e.target.value)} style={inputStyle}>
              {SCOPE_OPTIONS.map((scope) => (
                <option key={scope} value={scope}>{scope}</option>
              ))}
            </select>
          </Field>

          <Field label="Source Key">
            <input
              value={form.sourceKey}
              onChange={(e) => updateForm("sourceKey", e.target.value)}
              placeholder="NCAA_D1, SEC, GLOBAL, or programId"
              style={inputStyle}
            />
          </Field>

          <Field label="Position">
            <select value={form.position} onChange={(e) => updateForm("position", e.target.value)} style={inputStyle}>
              {POSITION_OPTIONS.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </Field>

          <Field label="Metric">
            <select value={form.metricKey} onChange={(e) => updateForm("metricKey", e.target.value)} style={inputStyle}>
              {METRIC_OPTIONS.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Average">
            <input value={form.averageValue} onChange={(e) => updateForm("averageValue", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Min">
            <input value={form.minValue} onChange={(e) => updateForm("minValue", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Max">
            <input value={form.maxValue} onChange={(e) => updateForm("maxValue", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Unit">
            <input value={form.unit} onChange={(e) => updateForm("unit", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Sample Size">
            <input value={form.sampleSize} onChange={(e) => updateForm("sampleSize", e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Verified At">
            <input type="date" value={form.verifiedAt} onChange={(e) => updateForm("verifiedAt", e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Source URL">
            <input value={form.sourceUrl} onChange={(e) => updateForm("sourceUrl", e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Source Note">
            <textarea
              value={form.sourceNote}
              onChange={(e) => updateForm("sourceNote", e.target.value)}
              style={{ ...inputStyle, minHeight: 80, paddingTop: 10 }}
            />
          </Field>
        </div>

        <button type="submit" disabled={saving} style={primaryButtonStyle}>
          {saving ? "Saving..." : "Save Benchmark"}
        </button>
      </form>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
          Existing Benchmarks
        </h2>

        {loading ? (
          <div style={emptyStyle}>Loading benchmarks...</div>
        ) : rows.length === 0 ? (
          <div style={emptyStyle}>No benchmarks yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((row) => (
              <article key={row.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {row.scope} • {row.sourceKey} • {row.position} • {row.metricLabel || row.metricKey}
                  </div>
                  <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    Avg: {String(row.averageValue ?? "—")} | Min: {String(row.minValue ?? "—")} | Max:{" "}
                    {String(row.maxValue ?? "—")} | Unit: {row.unit || "—"} | Sample: {row.sampleSize ?? "—"}
                  </div>
                  {row.sourceNote ? (
                    <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>
                      {row.sourceNote}
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={() => deleteBenchmark(row.id)} style={dangerButtonStyle}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>{label}</span>
      {children}
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 10px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #0ea5e9",
  borderRadius: 999,
  padding: "10px 14px",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 999,
  padding: "8px 12px",
  background: "#fff1f2",
  color: "#991b1b",
  fontWeight: 900,
  cursor: "pointer",
};

const rowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#ffffff",
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const emptyStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#ffffff",
  padding: 16,
  color: "#64748b",
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#991b1b",
  borderRadius: 12,
  padding: 12,
  fontWeight: 800,
};

const successStyle: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  borderRadius: 12,
  padding: 12,
  fontWeight: 800,
};
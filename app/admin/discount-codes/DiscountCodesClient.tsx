"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type DiscountCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_TRIAL" | "OVERRIDE_PRICE";
  value: number;
  appliesTo: "PLAYER" | "TEAM" | "BOTH";
  cadence: string | null;
  durationType: "ONCE" | "MONTHS" | "FOREVER";
  durationMonths: number | null;
  expiresAt: string | Date | null;
  maxRedemptions: number | null;
  isActive: boolean;
  oncePerTarget: boolean;

  // from server
  plansAllowedJson?: string;
  plansAllowed?: string[];

  createdAt: string | Date;
  updatedAt: string | Date;

  // optional extras (fine if unused)
  createdByAdminEmail?: string;
  applicationsCount?: number;
  activeApps?: number;
  revokedApps?: number;
  expiredApps?: number;
};

type RecentDiscountApplication = {
  id: string;
  discountCodeId: string;
  discountCode: string; // label from server include
  targetType: "PLAYER" | "TEAM";
  targetId: string;
  planTier: string;
  cadence: string;
  status: string;
  appliedAt: string | Date;
  endsAt: string | Date | null;
  revokedAt: string | Date | null;
};

const PLAN_OPTIONS: { key: string; label: string }[] = [
  { key: "REDSHIRT", label: "Redshirt" },
  { key: "WALK_ON", label: "Walk-On" },
  { key: "ALL_AMERICAN", label: "All-American" },
  { key: "TEAM", label: "Teams" },
];

function fmt(d: any) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function toUpperCodeTight(s: string) {
  return (s || "").trim().replace(/\s+/g, "").toUpperCase();
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function onlyDigits(s: string) {
  return String(s || "").replace(/[^\d]/g, "");
}

function safeJsonParseArray(s: string): string[] {
  const t = (s || "").trim();
  if (!t) return [];
  try {
    const parsed: any = JSON.parse(t);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x));
  } catch {
    return [];
  }
}

function StatusPill({ isActive, expiresAt }: { isActive: boolean; expiresAt: any }) {
  const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const label = !isActive ? "INACTIVE" : expired ? "EXPIRED" : "ACTIVE";

  let border = "1px solid rgba(148,163,184,0.35)";
  let bg = "rgba(148,163,184,0.10)";
  let color = "#475569";

  if (label === "ACTIVE") {
    border = "1px solid rgba(34,197,94,0.35)";
    bg = "rgba(34,197,94,0.10)";
    color = "#0f172a";
  }
  if (label === "EXPIRED") {
    border = "1px solid rgba(239,68,68,0.35)";
    bg = "rgba(239,68,68,0.10)";
    color = "#7f1d1d";
  }

  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, border, background: bg, color, fontWeight: 900, fontSize: 11 }}>
      {label}
    </span>
  );
}

function Pill({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#fff",
        fontWeight: 900,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 900,
            lineHeight: 1,
            opacity: 0.7,
          }}
          aria-label={`Remove ${label}`}
          title="Remove"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

function ActionLink({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #0ea5e9",
        background: "#fff",
        fontSize: 11,
        fontWeight: 900,
        color: "#2563eb",
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 52,
        height: 28,
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: value ? "rgba(34,197,94,0.18)" : "#e5e7eb",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 150ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 26 : 3,
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

function valueTooltip(type: DiscountCode["type"]) {
  if (type === "PERCENT") return "For PERCENT, 100% = free";
  if (type === "FIXED") return "For FIXED, input dollar ($) amount discounted";
  if (type === "FREE_TRIAL") return "For FREE_TRIAL, select Duration to set trial time frame";
  return "For OVERRIDE_PRICE, input dollar ($) amount to be billed";
}

function valueAdornment(type: DiscountCode["type"]) {
  if (type === "PERCENT") return "%";
  if (type === "FIXED") return "$";
  if (type === "OVERRIDE_PRICE") return "$";
  return "";
}

function normalizeCadence(appliesTo: DiscountCode["appliesTo"], cadence: string) {
  if (appliesTo === "TEAM") return "monthly";
  const c = (cadence || "").trim().toLowerCase();
  if (c === "monthly" || c === "annual" || c === "both") return c;
  return "both";
}

function normalizeApplyCadence(targetType: "PLAYER" | "TEAM", cadence: string) {
  // apply route expects "monthly"|"annual"
  if (targetType === "TEAM") return "monthly";
  const c = (cadence || "").trim().toLowerCase();
  return c === "annual" ? "annual" : "monthly";
}

function normalizeApplyPlanTier(targetType: "PLAYER" | "TEAM", planTier: string) {
  if (targetType === "TEAM") return "TEAM";
  const t = String(planTier || "").trim().toUpperCase();
  // keep simple; your validateAndComputeDiscount will validate further
  return t || "WALK_ON";
}

function parseMetadataJson(input: string): any | undefined {
  const t = (input || "").trim();
  if (!t) return undefined;
  try {
    const parsed = JSON.parse(t);
    if (parsed && typeof parsed === "object") {
      // tolerate either {referrerUserId:"..."} or {metadata:{...}}
      if (parsed.metadata && typeof parsed.metadata === "object") return parsed.metadata;
      return parsed;
    }
    return undefined;
  } catch {
    throw new Error("Metadata must be valid JSON (or blank).");
  }
}

type ResolveOption = {
  targetType: "PLAYER" | "TEAM";
  targetId: string;
  label: string;
  extra?: any;
};

export default function DiscountCodesClient({
  initialCodes,
  initialRecentApps,
  canManage,
}: {
  initialCodes: DiscountCode[];
  initialRecentApps: RecentDiscountApplication[];
  canManage: boolean;
}) {
  const router = useRouter();

  const [codes, setCodes] = React.useState<DiscountCode[]>(() => initialCodes ?? []);
  const [apps, setApps] = React.useState<RecentDiscountApplication[]>(() => initialRecentApps ?? []);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // ----- Create Code -----
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState<DiscountCode["type"]>("PERCENT");
  const [valueRaw, setValueRaw] = React.useState("0");
  const [appliesTo, setAppliesTo] = React.useState<DiscountCode["appliesTo"]>("BOTH");
  const [cadence, setCadence] = React.useState<string>("both");
  const [durationType, setDurationType] = React.useState<DiscountCode["durationType"]>("ONCE");
  const [durationMonthsRaw, setDurationMonthsRaw] = React.useState("1");
  const [expiresAt, setExpiresAt] = React.useState<string>("");
  const [maxRedemptionsRaw, setMaxRedemptionsRaw] = React.useState<string>("");
  const [oncePerTarget, setOncePerTarget] = React.useState<boolean>(true);
  const [plansAllowed, setPlansAllowed] = React.useState<string[]>([]);

  // ----- Application Tool -----
  const [targetType, setTargetType] = React.useState<"PLAYER" | "TEAM">("TEAM");
  const [targetQuery, setTargetQuery] = React.useState("");
  const [resolvedTargetId, setResolvedTargetId] = React.useState<string | null>(null);
  const [resolvedLabel, setResolvedLabel] = React.useState<string | null>(null);
  const [resolveOptions, setResolveOptions] = React.useState<ResolveOption[]>([]);

  const [selectedCodeId, setSelectedCodeId] = React.useState<string>("");
  const [appPlanTier, setAppPlanTier] = React.useState<string>("TEAM");
  const [appCadence, setAppCadence] = React.useState<string>("monthly");
  const [appMetadata, setAppMetadata] = React.useState<string>("");

  // ----- Edit modal -----
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editCode, setEditCode] = React.useState<string>("");
  const [editType, setEditType] = React.useState<DiscountCode["type"]>("PERCENT");
  const [editValueRaw, setEditValueRaw] = React.useState<string>("0");
  const [editAppliesTo, setEditAppliesTo] = React.useState<DiscountCode["appliesTo"]>("BOTH");
  const [editCadence, setEditCadence] = React.useState<string>("both");
  const [editDurationType, setEditDurationType] = React.useState<DiscountCode["durationType"]>("ONCE");
  const [editDurationMonthsRaw, setEditDurationMonthsRaw] = React.useState("1");
  const [editExpiresAt, setEditExpiresAt] = React.useState<string>("");
  const [editMaxRedemptionsRaw, setEditMaxRedemptionsRaw] = React.useState<string>("");
  const [editOncePerTarget, setEditOncePerTarget] = React.useState<boolean>(true);
  const [editPlansAllowed, setEditPlansAllowed] = React.useState<string[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  async function refresh() {
    router.refresh();
  }

  React.useEffect(() => setCodes(initialCodes ?? []), [initialCodes]);
  React.useEffect(() => setApps(initialRecentApps ?? []), [initialRecentApps]);

  React.useEffect(() => {
    setCadence((c) => normalizeCadence(appliesTo, c));
  }, [appliesTo]);

  React.useEffect(() => {
    if (type === "FREE_TRIAL") setValueRaw("0");
  }, [type]);

  React.useEffect(() => {
    // keep app plan defaults sane per target
    if (targetType === "TEAM") {
      setAppPlanTier("TEAM");
      setAppCadence("monthly");
    } else {
      setAppPlanTier("WALK_ON");
      setAppCadence((c) => (c === "annual" ? "annual" : "monthly"));
    }
  }, [targetType]);

  function addPlan(setter: (v: string[]) => void, current: string[], planKey: string) {
    if (current.includes(planKey)) return;
    setter([...current, planKey]);
  }

  function removePlan(setter: (v: string[]) => void, current: string[], planKey: string) {
    setter(current.filter((p) => p !== planKey));
  }

  function renderPlanPicker(selected: string[], setSelected: (v: string[]) => void) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLAN_OPTIONS.map((p) => {
            const active = selected.includes(p.key);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => (active ? removePlan(setSelected, selected, p.key) : addPlan(setSelected, selected, p.key))}
                disabled={!canManage}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: active ? "rgba(14,165,233,0.10)" : "#fff",
                  fontWeight: 900,
                  cursor: canManage ? "pointer" : "not-allowed",
                }}
                title={active ? "Remove plan" : "Add plan"}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {selected.length === 0 ? (
          <div style={hint}>No plan restriction (applies to all plans).</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selected.map((k) => {
              const label = PLAN_OPTIONS.find((x) => x.key === k)?.label ?? k;
              return <Pill key={k} label={label} onRemove={() => removePlan(setSelected, selected, k)} />;
            })}
          </div>
        )}
      </div>
    );
  }

  function parseIntField(raw: string, fallback: number, min: number, max: number) {
    const d = onlyDigits(raw);
    if (!d) return fallback;
    const n = Number(d);
    if (!Number.isFinite(n)) return fallback;
    return clampInt(n, min, max);
  }

  function valueLabel(typeX: DiscountCode["type"], valueInt: number) {
    if (typeX === "PERCENT") return `${valueInt}%`;
    if (typeX === "FIXED") return `$${valueInt}`;
    if (typeX === "OVERRIDE_PRICE") return `$${valueInt}`;
    return "—";
  }

  async function createDiscountCode() {
    setError(null);

    const codeUpper = toUpperCodeTight(code);
    if (codeUpper.length < 3) {
      setError("Code must be at least 3 characters.");
      return;
    }

    const cadenceFinal = normalizeCadence(appliesTo, cadence);
    const durationMonths = durationType === "MONTHS" ? parseIntField(durationMonthsRaw, 1, 1, 60) : null;

    const valueInt =
      type === "FREE_TRIAL" ? 0 : parseIntField(valueRaw, 0, 0, type === "PERCENT" ? 100 : 100000);

    setBusy("create-code");
    try {
      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeUpper,
          type,
          value: valueInt,
          appliesTo,
          cadence: cadenceFinal,
          durationType,
          durationMonths,
          expiresAt: expiresAt ? expiresAt : null,
          maxRedemptions: maxRedemptionsRaw ? parseIntField(maxRedemptionsRaw, 1, 1, 1000000) : null,
          oncePerTarget: !!oncePerTarget,
          plansAllowed,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Created!");

      setCode("");
      setType("PERCENT");
      setValueRaw("0");
      setAppliesTo("BOTH");
      setCadence("both");
      setDurationType("ONCE");
      setDurationMonthsRaw("1");
      setExpiresAt("");
      setMaxRedemptionsRaw("");
      setOncePerTarget(true);
      setPlansAllowed([]);

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create code.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleCodeActive(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/discount-codes/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "toggle-active" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);
      showToast("Updated!");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to toggle status.");
    } finally {
      setBusy(null);
    }
  }

  function openEdit(c: DiscountCode) {
    setError(null);

    setEditId(c.id);
    setEditCode(c.code);
    setEditType(c.type);
    setEditValueRaw(String(c.value ?? 0));
    setEditAppliesTo(c.appliesTo);
    setEditCadence(normalizeCadence(c.appliesTo, c.cadence ?? "both"));
    setEditDurationType(c.durationType);
    setEditDurationMonthsRaw(String(c.durationMonths ?? 1));
    setEditExpiresAt(c.expiresAt ? String(c.expiresAt).slice(0, 16) : "");
    setEditMaxRedemptionsRaw(c.maxRedemptions ? String(c.maxRedemptions) : "");
    setEditOncePerTarget(!!c.oncePerTarget);

    const plansArr =
      Array.isArray(c.plansAllowed)
        ? c.plansAllowed
        : typeof c.plansAllowedJson === "string"
        ? safeJsonParseArray(c.plansAllowedJson)
        : [];
    setEditPlansAllowed(plansArr);

    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
  }

  React.useEffect(() => {
    setEditCadence((c) => normalizeCadence(editAppliesTo, c));
  }, [editAppliesTo]);

  React.useEffect(() => {
    if (editType === "FREE_TRIAL") setEditValueRaw("0");
  }, [editType]);

  async function saveEdit() {
    if (!editId) return;
    setError(null);
    setBusy(`edit:${editId}`);

    const cadenceFinal = normalizeCadence(editAppliesTo, editCadence);
    const durationMonths = editDurationType === "MONTHS" ? parseIntField(editDurationMonthsRaw, 1, 1, 60) : null;

    const valueInt =
      editType === "FREE_TRIAL" ? 0 : parseIntField(editValueRaw, 0, 0, editType === "PERCENT" ? 100 : 100000);

    try {
      const res = await fetch(`/api/admin/discount-codes/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType,
          value: valueInt,
          appliesTo: editAppliesTo,
          cadence: cadenceFinal,
          durationType: editDurationType,
          durationMonths,
          expiresAt: editExpiresAt ? editExpiresAt : null,
          maxRedemptions: editMaxRedemptionsRaw ? parseIntField(editMaxRedemptionsRaw, 1, 1, 1000000) : null,
          oncePerTarget: !!editOncePerTarget,
          plansAllowed: editPlansAllowed,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Saved!");
      closeEdit();
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setBusy(null);
    }
  }

  // ✅ NEW: resolve via canonical admin billing route (fixes your 404)
  async function resolveTarget() {
    setError(null);
    setResolvedTargetId(null);
    setResolvedLabel(null);
    setResolveOptions([]);

    const q = (targetQuery || "").trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters to resolve a target (id, slug, email, or name).");
      return;
    }

    setBusy("resolve");
    try {
      const url =
        `/api/admin/billing/discounts/resolve-target?` +
        new URLSearchParams({ targetType, q }).toString();

      const res = await fetch(url, { method: "GET" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      const resolved: ResolveOption | null = json?.resolved ?? null;
      const options: ResolveOption[] = Array.isArray(json?.options) ? json.options : [];

      if (resolved?.targetId) {
        setResolvedTargetId(resolved.targetId);
        setResolvedLabel(resolved.label || resolved.targetId);
        showToast("Resolved.");
        return;
      }

      if (options.length > 0) {
        setResolveOptions(options);
        setError(`Multiple matches (${options.length}). Pick one.`);
        return;
      }

      setError("No match found.");
    } catch (e: any) {
      setError(e?.message || "Failed to resolve.");
    } finally {
      setBusy(null);
    }
  }

  // ✅ NEW: apply via production source-of-truth route
  async function applyDiscount() {
    setError(null);

    if (!selectedCodeId) {
      setError("Select a discount code to apply.");
      return;
    }
    if (!resolvedTargetId) {
      setError("Resolve a target first.");
      return;
    }

    const selected = codes.find((c) => c.id === selectedCodeId);
    if (!selected?.code) {
      setError("Selected discount code not found.");
      return;
    }

    let metadata: any | undefined;
    try {
      metadata = parseMetadataJson(appMetadata);
    } catch (e: any) {
      setError(e?.message || "Metadata must be valid JSON (or blank).");
      return;
    }

    setBusy("apply");
    try {
      const payload = {
        code: selected.code,
        targetType,
        targetId: resolvedTargetId,
        planTier: normalizeApplyPlanTier(targetType, appPlanTier),
        cadence: normalizeApplyCadence(targetType, appCadence),
        metadata,
      };

      const res = await fetch("/api/billing/discount/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Applied!");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to apply.");
    } finally {
      setBusy(null);
    }
  }

  // ✅ NEW: revoke by removing active discount(s) for that target (works even if appId routes don’t exist)
  async function revokeApplicationByTarget(targetTypeX: "PLAYER" | "TEAM", targetIdX: string) {
    setError(null);
    const key = `revoke:${targetTypeX}:${targetIdX}`;
    setBusy(key);

    try {
      const res = await fetch("/api/discount/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: targetTypeX, targetId: targetIdX }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      showToast("Revoked.");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to revoke.");
    } finally {
      setBusy(null);
    }
  }

  const cadenceLocked = appliesTo === "TEAM";
  const cadenceOptions = ["monthly", "annual", "both"];

  const valueDisabled = type === "FREE_TRIAL";
  const valueSuffix = valueAdornment(type);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {toast ? <div style={{ ...muted, color: "#047857", fontWeight: 900 }}>{toast}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      {/* 1) CREATE DISCOUNT CODE */}
      <section style={card}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>Create Discount Code {canManage ? "" : "(read-only)"}</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Code</div>
              <input
                value={code}
                onChange={(e) => setCode(toUpperCodeTight(e.target.value))}
                placeholder="CODE1234"
                style={{ ...input, textTransform: "uppercase" }}
                disabled={!canManage || busy === "create-code"}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Type</div>
              <select value={type} onChange={(e) => setType(e.target.value as any)} style={input} disabled={!canManage}>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
                <option value="FREE_TRIAL">FREE_TRIAL</option>
                <option value="OVERRIDE_PRICE">OVERRIDE_PRICE</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Value</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {valueSuffix === "$" ? <span style={{ fontWeight: 900 }}>$</span> : null}
                <input
                  value={valueDisabled ? "" : onlyDigits(valueRaw)}
                  onChange={(e) => setValueRaw(onlyDigits(e.target.value))}
                  placeholder={type === "PERCENT" ? "50" : type === "FREE_TRIAL" ? "—" : "10"}
                  style={{ ...input, flex: 1 }}
                  disabled={!canManage || busy === "create-code" || valueDisabled}
                  title={valueTooltip(type)}
                  inputMode="numeric"
                />
                {valueSuffix === "%" ? <span style={{ fontWeight: 900 }}>%</span> : null}
              </div>
              <div style={hint}>{valueTooltip(type)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Applies To</div>
              <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value as any)} style={input} disabled={!canManage}>
                <option value="PLAYER">PLAYER</option>
                <option value="TEAM">TEAM</option>
                <option value="BOTH">BOTH</option>
              </select>
              <div style={hint}>TEAM locks cadence to monthly. PLAYER/BOTH can be monthly/annual/both.</div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Cadence</div>
              {cadenceLocked ? (
                <input value="monthly" readOnly style={{ ...input, background: "#f8fafc" }} />
              ) : (
                <select value={cadence} onChange={(e) => setCadence(e.target.value)} style={input} disabled={!canManage}>
                  {cadenceOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Duration</div>
              <select value={durationType} onChange={(e) => setDurationType(e.target.value as any)} style={input} disabled={!canManage}>
                <option value="ONCE">ONCE</option>
                <option value="MONTHS">MONTHS</option>
                <option value="FOREVER">FOREVER</option>
              </select>

              {durationType === "MONTHS" ? (
                <input
                  value={onlyDigits(durationMonthsRaw)}
                  onChange={(e) => setDurationMonthsRaw(onlyDigits(e.target.value))}
                  placeholder="3"
                  style={input}
                  disabled={!canManage}
                  inputMode="numeric"
                />
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Plans Allowed</div>
              {renderPlanPicker(plansAllowed, setPlansAllowed)}
              <div style={hint}>Select one or more plans to restrict the discount. Leave blank for all plans.</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Expires At (optional)</div>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={input}
                  disabled={!canManage}
                  title="Pick a date/time for expiration"
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Max Redemptions (optional)</div>
                <input
                  value={onlyDigits(maxRedemptionsRaw)}
                  onChange={(e) => setMaxRedemptionsRaw(onlyDigits(e.target.value))}
                  placeholder="100"
                  style={input}
                  disabled={!canManage}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
              <input type="checkbox" checked={oncePerTarget} onChange={(e) => setOncePerTarget(e.target.checked)} disabled={!canManage} />
              Once per target
            </label>

            <button
              type="button"
              onClick={createDiscountCode}
              disabled={!canManage || busy === "create-code"}
              style={btnGold}
              title={!canManage ? "Requires billing/admin role" : "Create code"}
            >
              {busy === "create-code" ? "Creating…" : "Create Code"}
            </button>
          </div>
        </div>
      </section>

      {/* 2) DISCOUNT APPLICATION TOOL */}
      <section style={card}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>Discount Application Tool {canManage ? "" : "(read-only)"}</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.3fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Target Type</div>
              <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} style={input} disabled={!canManage}>
                <option value="TEAM">TEAM</option>
                <option value="PLAYER">PLAYER</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Target Query (id / slug / email / name)</div>
              <input
                value={targetQuery}
                onChange={(e) => setTargetQuery(e.target.value)}
                placeholder={targetType === "TEAM" ? "team slug or id" : "player email/slug/id/name"}
                style={input}
                disabled={!canManage || busy === "resolve"}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Resolve</div>
              <button type="button" style={btnGhost} onClick={resolveTarget} disabled={!canManage || busy === "resolve"}>
                {busy === "resolve" ? "Resolving…" : "Resolve Target"}
              </button>
              <div style={hint}>
                Resolved:{" "}
                <span style={{ fontWeight: 900 }}>
                  {resolvedTargetId ? `${resolvedLabel ?? resolvedTargetId} (${resolvedTargetId})` : "—"}
                </span>
              </div>
            </div>
          </div>

          {resolveOptions.length > 0 ? (
            <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Multiple matches</div>
              <div style={{ display: "grid", gap: 8 }}>
                {resolveOptions.map((o) => (
                  <button
                    key={o.targetId}
                    type="button"
                    style={btnGhost}
                    onClick={() => {
                      setResolvedTargetId(o.targetId);
                      setResolvedLabel(o.label || o.targetId);
                      setResolveOptions([]);
                      setError(null);
                      showToast("Resolved.");
                    }}
                  >
                    {o.label} <span style={{ opacity: 0.7 }}>({o.targetType}:{o.targetId})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Select Discount Code</div>
              <select value={selectedCodeId} onChange={(e) => setSelectedCodeId(e.target.value)} style={input} disabled={!canManage}>
                <option value="">— Select —</option>
                {codes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.type} · {valueLabel(c.type, c.value)} · {c.isActive ? "ACTIVE" : "INACTIVE"}
                  </option>
                ))}
              </select>
              <div style={hint}>Tip: create the code above first, then apply it here.</div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Apply</div>
              <button type="button" style={btnGold} onClick={applyDiscount} disabled={!canManage || busy === "apply"}>
                {busy === "apply" ? "Applying…" : "Apply Discount"}
              </button>
            </div>
          </div>

          {/* ✅ NEW: plan/cadence required by /api/billing/discount/apply */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Plan Tier</div>
              {targetType === "TEAM" ? (
                <input value="TEAM" readOnly style={{ ...input, background: "#f8fafc" }} />
              ) : (
                <select value={appPlanTier} onChange={(e) => setAppPlanTier(e.target.value)} style={input} disabled={!canManage}>
                  {PLAN_OPTIONS.filter((p) => p.key !== "TEAM").map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key}
                    </option>
                  ))}
                </select>
              )}
              <div style={hint}>Required for correct pricing/validation.</div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={lbl}>Cadence</div>
              {targetType === "TEAM" ? (
                <input value="monthly" readOnly style={{ ...input, background: "#f8fafc" }} />
              ) : (
                <select value={appCadence} onChange={(e) => setAppCadence(e.target.value)} style={input} disabled={!canManage}>
                  <option value="monthly">monthly</option>
                  <option value="annual">annual</option>
                </select>
              )}
              <div style={hint}>Required for correct pricing/validation.</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Application Metadata (JSON, optional)</div>
            <textarea
              value={appMetadata}
              onChange={(e) => setAppMetadata(e.target.value)}
              placeholder={`e.g., { "referrerUserId": "cmk..." }\n(also accepts { "metadata": { ... } })`}
              style={textarea}
              disabled={!canManage}
            />
          </div>
        </div>
      </section>

      {/* 3) DISCOUNT CODES LIST */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Discount Codes ({codes.length})</div>
          <button type="button" style={btnGhost} onClick={refresh}>
            Refresh
          </button>
        </div>

        {codes.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800 }}>No discount codes yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Status", "Code", "Type", "Value", "Applies", "Cadence", "Duration", "Expires", "Updated", "Actions"].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const lockCadence = c.appliesTo === "TEAM";
                  const cadenceLabel = lockCadence ? "monthly" : c.cadence ?? "both";
                  const busyKey = busy === c.id || busy === `edit:${c.id}`;

                  return (
                    <tr key={c.id}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <StatusPill isActive={c.isActive} expiresAt={c.expiresAt} />
                          <Toggle value={c.isActive} onChange={() => toggleCodeActive(c.id)} disabled={!canManage || busyKey} />
                        </div>
                      </td>

                      <td style={td}>
                        <code>{c.code}</code>
                      </td>

                      <td style={td}>
                        <Pill label={c.type} />
                      </td>

                      <td style={td}>
                        <span style={{ fontWeight: 900 }}>{valueLabel(c.type, c.value)}</span>
                      </td>

                      <td style={td}>
                        <Pill label={c.appliesTo} />
                      </td>

                      <td style={td}>
                        <Pill label={cadenceLabel} />
                      </td>

                      <td style={td}>
                        <span style={{ fontWeight: 900 }}>
                          {c.durationType}
                          {c.durationType === "MONTHS" ? ` · ${c.durationMonths ?? "—"} mo` : ""}
                        </span>
                      </td>

                      <td style={td}>{c.expiresAt ? fmt(c.expiresAt) : "—"}</td>
                      <td style={td}>{fmt(c.updatedAt)}</td>

                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <ActionLink onClick={() => openEdit(c)} disabled={!canManage || busyKey}>
                            Edit
                          </ActionLink>
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

      {/* 4) RECENT APPLICATIONS */}
      <section style={card}>
        <div style={{ fontWeight: 900 }}>Recent Discount Applications ({apps.length})</div>

        {apps.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800 }}>No applications yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Status", "Code", "Target", "Target ID", "Plan", "Cadence", "Applied", "Ends", "Revoked", "Actions"].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((aRow) => {
                  const busyKey = busy === `revoke:${aRow.targetType}:${aRow.targetId}`;
                  return (
                    <tr key={aRow.id}>
                      <td style={td}>
                        <Pill label={aRow.status} />
                      </td>
                      <td style={td}>
                        <code>{aRow.discountCode}</code>
                      </td>
                      <td style={td}>
                        <Pill label={aRow.targetType} />
                      </td>
                      <td style={td}>
                        <code>{aRow.targetId}</code>
                      </td>
                      <td style={td}>{aRow.planTier}</td>
                      <td style={td}>{aRow.cadence}</td>
                      <td style={td}>{fmt(aRow.appliedAt)}</td>
                      <td style={td}>{aRow.endsAt ? fmt(aRow.endsAt) : "—"}</td>
                      <td style={td}>{aRow.revokedAt ? fmt(aRow.revokedAt) : "—"}</td>
                      <td style={td}>
                        {aRow.status === "ACTIVE" ? (
                          <button
                            type="button"
                            style={btnDanger}
                            onClick={() => revokeApplicationByTarget(aRow.targetType, aRow.targetId)}
                            disabled={!canManage || busyKey}
                          >
                            {busyKey ? "Working…" : "Revoke"}
                          </button>
                        ) : (
                          <span style={{ opacity: 0.65, fontWeight: 900 }}>—</span>
                        )}
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
              <div style={{ fontWeight: 900, fontSize: 14 }}>Edit Discount Code</div>
              <button type="button" style={btnGhost} onClick={closeEdit}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={lbl}>Code</div>
                <input value={editCode} readOnly style={{ ...input, background: "#f8fafc" }} />
                <div style={hint}>Code cannot be changed.</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Type</div>
                  <select value={editType} onChange={(e) => setEditType(e.target.value as any)} style={input} disabled={!canManage}>
                    <option value="PERCENT">PERCENT</option>
                    <option value="FIXED">FIXED</option>
                    <option value="FREE_TRIAL">FREE_TRIAL</option>
                    <option value="OVERRIDE_PRICE">OVERRIDE_PRICE</option>
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Value</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {valueAdornment(editType) === "$" ? <span style={{ fontWeight: 900 }}>$</span> : null}
                    <input
                      value={editType === "FREE_TRIAL" ? "" : onlyDigits(editValueRaw)}
                      onChange={(e) => setEditValueRaw(onlyDigits(e.target.value))}
                      placeholder={editType === "PERCENT" ? "50" : editType === "FREE_TRIAL" ? "—" : "10"}
                      style={{ ...input, flex: 1 }}
                      disabled={!canManage || editType === "FREE_TRIAL"}
                      title={valueTooltip(editType)}
                      inputMode="numeric"
                    />
                    {valueAdornment(editType) === "%" ? <span style={{ fontWeight: 900 }}>%</span> : null}
                  </div>
                  <div style={hint}>{valueTooltip(editType)}</div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Applies To</div>
                  <select value={editAppliesTo} onChange={(e) => setEditAppliesTo(e.target.value as any)} style={input} disabled={!canManage}>
                    <option value="PLAYER">PLAYER</option>
                    <option value="TEAM">TEAM</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Cadence</div>
                  {editAppliesTo === "TEAM" ? (
                    <input value="monthly" readOnly style={{ ...input, background: "#f8fafc" }} />
                  ) : (
                    <select value={editCadence} onChange={(e) => setEditCadence(e.target.value)} style={input} disabled={!canManage}>
                      <option value="monthly">monthly</option>
                      <option value="annual">annual</option>
                      <option value="both">both</option>
                    </select>
                  )}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Duration</div>
                  <select value={editDurationType} onChange={(e) => setEditDurationType(e.target.value as any)} style={input} disabled={!canManage}>
                    <option value="ONCE">ONCE</option>
                    <option value="MONTHS">MONTHS</option>
                    <option value="FOREVER">FOREVER</option>
                  </select>
                  {editDurationType === "MONTHS" ? (
                    <input
                      value={onlyDigits(editDurationMonthsRaw)}
                      onChange={(e) => setEditDurationMonthsRaw(onlyDigits(e.target.value))}
                      placeholder="3"
                      style={input}
                      disabled={!canManage}
                      inputMode="numeric"
                    />
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Expires At (optional)</div>
                  <input type="datetime-local" value={editExpiresAt} onChange={(e) => setEditExpiresAt(e.target.value)} style={input} disabled={!canManage} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={lbl}>Plans Allowed</div>
                  {renderPlanPicker(editPlansAllowed, setEditPlansAllowed)}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={lbl}>Max Redemptions (optional)</div>
                    <input
                      value={onlyDigits(editMaxRedemptionsRaw)}
                      onChange={(e) => setEditMaxRedemptionsRaw(onlyDigits(e.target.value))}
                      placeholder="100"
                      style={input}
                      disabled={!canManage}
                      inputMode="numeric"
                    />
                  </div>

                  <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
                    <input type="checkbox" checked={editOncePerTarget} onChange={(e) => setEditOncePerTarget(e.target.checked)} disabled={!canManage} />
                    Once per target
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" style={btnGhost} onClick={closeEdit} disabled={busy === `edit:${editId}`}>
                  Cancel
                </button>
                <button type="button" style={btnGold} onClick={saveEdit} disabled={!canManage || busy === `edit:${editId}`}>
                  {busy === `edit:${editId}` ? "Saving…" : "Save"}
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
  minHeight: 90,
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

const btnDanger: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
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
  width: "min(980px, 96vw)",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 14,
  boxShadow: "0 14px 40px rgba(15,23,42,0.20)",
};
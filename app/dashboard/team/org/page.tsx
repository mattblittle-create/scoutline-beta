// app/dashboard/team/org/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type OrgProfile = {
  // Admin (User)
  adminFirstName: string;
  adminLastName: string;
  email: string; // username (User.email)
  adminPhone: string;
  adminPhoneExt: string;
  phonePrivate: boolean;

  // Team
  teamType: "HS" | "TRAVEL" | "COLLEGE" | "OTHER";
  name: string;
  city: string;
  state: string;
  websiteUrl: string;

  // Public contact + socials (Team)
  contactEmail: string;
  phone: string;
  phoneExt: string;
  teamPhonePrivate: boolean;
  xUrl: string;
  instagramUrl: string;

  // Branding
  logoUrl: string;

  // ✅ Slug: use DB slug if API returns it (best way to avoid collisions)
  slug: string;
};

function normText(v: any) {
  return String(v ?? "").trim();
}

function normUrl(v: any) {
  return normText(v);
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatUSPhone(raw: string) {
  const digits = digitsOnly(raw).slice(0, 10);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);

  if (digits.length <= 3) return a;
  if (digits.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeTeamType(v: any): "HS" | "TRAVEL" | "COLLEGE" | "OTHER" {
  const s = String(v ?? "").trim().toUpperCase();

  // DB enum values are: TRAVEL | HS | TRAINING | COLLEGE | OTHER
  if (s === "HS" || s === "HIGH_SCHOOL" || s === "HIGHSCHOOL") return "HS";
  if (s === "TRAVEL") return "TRAVEL";
  if (s === "COLLEGE") return "COLLEGE";
  if (s === "OTHER") return "OTHER";

  // default
  return "TRAVEL";
}

function toDbTeamType(v: "HS" | "TRAVEL" | "COLLEGE" | "OTHER") {
  // Prisma TeamType enum expects: "HS" | "TRAVEL" | "COLLEGE" | "OTHER"
  return v;
}

function splitName(full: string) {
  const s = normText(full);
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function safePickOrg(json: any): Partial<OrgProfile> {
  const d = json?.data ?? json ?? {};
  const team = d?.team ?? {};
  const user = d?.user ?? {};

  const email = normText(user?.email) || normText(team?.email) || "";

  const { first, last } = splitName(normText(user?.name));

  const phonePrivate = typeof user?.phonePrivate === "boolean" ? user.phonePrivate : true;

  const teamPhonePrivate = typeof team?.phonePrivate === "boolean" ? team.phonePrivate : true;

  return {
    adminFirstName: normText(user?.adminFirstName) || first,
    adminLastName: normText(user?.adminLastName) || last,
    email,

    adminPhone: normText(user?.workPhone ?? ""),
    adminPhoneExt: normText(user?.workPhoneExt ?? ""),
    phonePrivate,

    teamType: normalizeTeamType(team?.teamType),

    name: normText(team?.name),
    city: normText(team?.city),
    state: normText(team?.state),

    websiteUrl: normUrl(team?.websiteUrl),

    contactEmail: normText(team?.contactEmail),
    phone: normText(team?.phone),
    phoneExt: normText(team?.phoneExt),
    teamPhonePrivate,

    xUrl: normUrl(team?.xUrl),
    instagramUrl: normUrl(team?.instagramUrl),

    logoUrl: normUrl(team?.logoUrl),

    // ✅ if /api/team/org returns team.slug, we use it
    slug: normText(team?.slug),
  };
}

const US_STATE_ABBRS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

/** ✅ create a stable “snapshot” of the fields we consider “saved” */
function buildSnapshot(f: OrgProfile) {
  const snap = {
    adminFirstName: normText(f.adminFirstName),
    adminLastName: normText(f.adminLastName),
    email: normText(f.email).toLowerCase(),
    adminPhone: digitsOnly(f.adminPhone).slice(0, 10),
    adminPhoneExt: digitsOnly(f.adminPhoneExt).slice(0, 6),
    phonePrivate: Boolean(f.phonePrivate),

    teamType: normalizeTeamType(f.teamType),
    name: normText(f.name),
    city: normText(f.city),
    state: normText(f.state).toUpperCase(),
    websiteUrl: normUrl(f.websiteUrl),

    contactEmail: normText(f.contactEmail),
    phone: digitsOnly(f.phone).slice(0, 10),
    phoneExt: digitsOnly(f.phoneExt).slice(0, 6),
    teamPhonePrivate: Boolean(f.teamPhonePrivate),

    xUrl: normUrl(f.xUrl),
    instagramUrl: normUrl(f.instagramUrl),

    logoUrl: normUrl(f.logoUrl),

    slug: normText(f.slug).toLowerCase(),
  };

  return JSON.stringify(snap);
}

export default function TeamOrgProfilePage() {
  const search = useSearchParams();

  // Dev fallback: /dashboard/team/org?email=admin@email.com
  const fallbackEmail = normText(search.get("email") || search.get("username")).toLowerCase();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // ✅ Unsaved changes
  const [baseline, setBaseline] = React.useState<string>(""); // snapshot string
  const [dirty, setDirty] = React.useState(false);
  const [nudgeVisible, setNudgeVisible] = React.useState(false);

  const [form, setForm] = React.useState<OrgProfile>({
    adminFirstName: "",
    adminLastName: "",
    email: fallbackEmail || "",

    adminPhone: "",
    adminPhoneExt: "",
    phonePrivate: true,

    teamType: "TRAVEL",

    name: "",
    city: "",
    state: "",

    websiteUrl: "",

    contactEmail: "",
    phone: "",
    phoneExt: "",
    teamPhonePrivate: true,

    xUrl: "",
    instagramUrl: "",

    logoUrl: "",

    slug: "",
  });

  // ✅ Use DB slug when present (avoid collisions), else fallback to slugify(name)
  const computedSlug = slugify(normText(form.name));
  const effectiveSlug = normText(form.slug).toLowerCase() || computedSlug;
  const publicUrl = effectiveSlug ? `/team/${effectiveSlug}` : "";

  // --- Share Profile ---
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareToast, setShareToast] = React.useState<string | null>(null);

  const shareUrl =
    typeof window !== "undefined" && publicUrl
      ? `${window.location.origin}${publicUrl}`
      : "";

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast("Link copied!");
      window.setTimeout(() => setShareToast(null), 1500);
    } catch {
      setShareToast("Could not copy link.");
      window.setTimeout(() => setShareToast(null), 1500);
    }
  }

  const emailShareHref = shareUrl
    ? `mailto:?subject=${encodeURIComponent("ScoutLine Team Profile")}&body=${encodeURIComponent(
        `Here is our ScoutLine team profile:\n\n${shareUrl}`
      )}`
    : "";

  function buildUrl() {
    const e = normText(form.email || fallbackEmail).toLowerCase();
    let url = "/api/team/org";
    if (e) url += `?email=${encodeURIComponent(e)}`;
    return url;
  }

  async function load() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let res = await fetch("/api/team/org", { cache: "no-store" });

      const e = normText(form.email || fallbackEmail).toLowerCase();
      if ((!res.ok || res.status === 401 || res.status === 400) && e) {
        res = await fetch(`/api/team/org?email=${encodeURIComponent(e)}`, { cache: "no-store" });
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load organization profile.");

      const picked = safePickOrg(json);

      setForm((prev) => {
        const username = picked.email || prev.email || fallbackEmail || "";

        const adminPhoneDigits = digitsOnly(picked.adminPhone ?? prev.adminPhone ?? "").slice(0, 10);
        const teamPhoneDigits = digitsOnly(picked.phone ?? prev.phone ?? "").slice(0, 10);

        // If team public phone isn't set yet, default it from admin phone for convenience
        const effectiveTeamPhone = teamPhoneDigits
          ? formatUSPhone(teamPhoneDigits)
          : (adminPhoneDigits ? formatUSPhone(adminPhoneDigits) : "");

        const adminExt = digitsOnly(picked.adminPhoneExt ?? prev.adminPhoneExt ?? "").slice(0, 6);
        const teamExt = digitsOnly(picked.phoneExt ?? prev.phoneExt ?? "").slice(0, 6);
        const effectiveTeamExt = teamExt || adminExt || "";

        // If contactEmail not set, default it to username
        const contactEmail = normText(picked.contactEmail ?? prev.contactEmail ?? "") || username;

        const nextForm: OrgProfile = {
          ...prev,
          adminFirstName: picked.adminFirstName ?? prev.adminFirstName ?? "",
          adminLastName: picked.adminLastName ?? prev.adminLastName ?? "",
          email: username,

          adminPhone: adminPhoneDigits ? formatUSPhone(adminPhoneDigits) : "",
          adminPhoneExt: adminExt,
          phonePrivate: typeof picked.phonePrivate === "boolean" ? picked.phonePrivate : prev.phonePrivate,

          teamType: normalizeTeamType(picked.teamType ?? prev.teamType),

          name: picked.name ?? prev.name ?? "",
          city: picked.city ?? prev.city ?? "",
          state: (picked.state ?? prev.state ?? "").toUpperCase(),

          websiteUrl: picked.websiteUrl ?? prev.websiteUrl ?? "",

          contactEmail,

          phone: effectiveTeamPhone,
          phoneExt: effectiveTeamExt,
          teamPhonePrivate: typeof picked.teamPhonePrivate === "boolean" ? picked.teamPhonePrivate : prev.teamPhonePrivate,

          xUrl: picked.xUrl ?? prev.xUrl ?? "",
          instagramUrl: picked.instagramUrl ?? prev.instagramUrl ?? "",

          logoUrl: picked.logoUrl ?? prev.logoUrl ?? "",

          // ✅ if API provides it, store it (prevents collisions)
          slug: normText(picked.slug ?? prev.slug ?? ""),
        };

        // ✅ establish baseline snapshot AFTER load
        const snap = buildSnapshot(nextForm);
        setBaseline(snap);
        setDirty(false);
        setNudgeVisible(false);

        return nextForm;
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong loading the org profile.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Dirty tracking (compare snapshot vs baseline)
  React.useEffect(() => {
    if (loading) return;
    if (!baseline) return;

    const now = buildSnapshot(form);
    const isDirty = now !== baseline;
    setDirty(isDirty);

    // show nudge after a tiny delay so it doesn’t flicker while typing
    if (isDirty) {
      const t = window.setTimeout(() => setNudgeVisible(true), 350);
      return () => window.clearTimeout(t);
    } else {
      setNudgeVisible(false);
    }
  }, [form, baseline, loading]);

  // ✅ Browser unload warning if dirty
  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function canAutoSave() {
    const email = normText(form.email).toLowerCase();
    if (!email || !isEmail(email)) return false;

    if (!normText(form.adminFirstName)) return false;
    if (!normText(form.adminLastName)) return false;

    if (!normText(form.name)) return false;

    if (!normText(form.city)) return false;
    if (!normText(form.state)) return false;

    const phoneDigits = digitsOnly(form.adminPhone).slice(0, 10);
    if (!phoneDigits || phoneDigits.length !== 10) return false;

    const contactEmail = normText(form.contactEmail);
    if (contactEmail && !isEmail(contactEmail)) return false;

    return true;
  }

  async function saveToApi(next: Partial<OrgProfile>) {
    if (saving) return false;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        // Admin/user
        adminFirstName: normText(next.adminFirstName ?? form.adminFirstName) || null,
        adminLastName: normText(next.adminLastName ?? form.adminLastName) || null,
        adminPhone: digitsOnly(next.adminPhone ?? form.adminPhone).slice(0, 10) || null,
        adminPhoneExt: digitsOnly(next.adminPhoneExt ?? form.adminPhoneExt).slice(0, 6) || null,
        phonePrivate:
          typeof (next.phonePrivate ?? form.phonePrivate) === "boolean"
            ? (next.phonePrivate ?? form.phonePrivate)
            : true,

        // Team/org
        teamType: toDbTeamType(normalizeTeamType(next.teamType ?? form.teamType)),
        name: normText(next.name ?? form.name) || null,
        city: normText(next.city ?? form.city) || null,
        state: normText(next.state ?? form.state).toUpperCase() || null,
        websiteUrl: normUrl(next.websiteUrl ?? form.websiteUrl) || null,

        // Public fields
        contactEmail: normText(next.contactEmail ?? form.contactEmail) || null,
        phone: digitsOnly(next.phone ?? form.phone).slice(0, 10) || null,
        phoneExt: digitsOnly(next.phoneExt ?? form.phoneExt).slice(0, 6) || null,
        teamPhonePrivate:
          typeof (next.teamPhonePrivate ?? form.teamPhonePrivate) === "boolean"
            ? (next.teamPhonePrivate ?? form.teamPhonePrivate)
            : true,

        xUrl: normUrl(next.xUrl ?? form.xUrl) || null,
        instagramUrl: normUrl(next.instagramUrl ?? form.instagramUrl) || null,

        logoUrl: normUrl(next.logoUrl ?? form.logoUrl) || null,
      };

      const res = await fetch(buildUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to save organization profile.");

      // ✅ baseline reset on save success
      setSuccess("Saved!");
      setBaseline(buildSnapshot({ ...form, ...next } as OrgProfile));
      setDirty(false);
      setNudgeVisible(false);

      return true;
    } catch (e: any) {
      setError(e?.message || "Something went wrong saving.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!normText(form.adminFirstName)) return setError("Admin first name is required.");
    if (!normText(form.adminLastName)) return setError("Admin last name is required.");

    const email = normText(form.email).toLowerCase();
    if (!email || !isEmail(email)) return setError("Username (email) looks invalid.");

    if (!normText(form.name)) return setError("Team / Organization name is required.");
    if (!normText(form.city)) return setError("City is required.");
    if (!normText(form.state)) return setError("State is required.");

    const phoneDigits = digitsOnly(form.adminPhone).slice(0, 10);
    if (!phoneDigits) return setError("Admin phone is required.");
    if (phoneDigits.length !== 10) return setError("Admin phone must be 10 digits (e.g., (555) 555-5555).");

    const contactEmail = normText(form.contactEmail);
    if (contactEmail && !isEmail(contactEmail)) return setError("Contact email looks invalid.");

    await saveToApi({});
  }

  const website = normUrl(form.websiteUrl);
  const websiteHref = website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : "";

  const slugHint =
    normText(form.slug)
      ? "Public profile link is based on your saved team slug."
      : (computedSlug ? "Public profile link is generated from your team name." : "Enter a team name to generate your public profile link.");

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Team Profile</div>
          <div style={muted}>
            This info is shown to players, families, and coaches. Keep your branding and contact details up to date.
          </div>
        </div>
      </section>

      <section style={card}>
        {loading ? (
          <div style={{ padding: 10, color: "#475569", fontWeight: 800 }}>Loading…</div>
        ) : (
          <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
            {/* ✅ Unsaved changes nudge */}
            {nudgeVisible ? (
              <div style={nudgeBar}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={nudgeDot} />
                  <div style={{ fontWeight: 950 }}>Unsaved changes</div>
                  <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                    Click <span style={{ fontWeight: 950 }}>Save Profile</span> to apply updates.
                  </div>
                </div>

                <button type="submit" style={primaryBtn} disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            ) : null}

            <div style={gridTwoCol}>
              {/* Admin First/Last */}
              <div style={field}>
                <label style={label}>
                  Admin First Name<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  value={form.adminFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                  placeholder="First"
                  required
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Admin Last Name<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  value={form.adminLastName}
                  onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                  placeholder="Last"
                  required
                />
              </div>

              {/* Username */}
              <div style={{ ...field, gridColumn: "1 / -1" }}>
                <label style={label}>
                  Username<span style={req}>*</span>
                </label>
                <input style={{ ...input, background: "#f8fafc" }} value={form.email} disabled readOnly />
                <div style={hint}>This is your Team Admin login username. (Change-username flow comes next.)</div>
              </div>

              {/* Contact Email */}
              <div style={{ ...field, gridColumn: "1 / -1" }}>
                <label style={label}>Contact Email (optional)</label>
                <input
                  style={input}
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="public-contact@yourteam.org"
                  autoComplete="email"
                />
                <div style={hint}>
                  This is what players will see on your public profile. If blank, we’ll use your username.
                </div>
              </div>

              {/* Admin Phone + Ext */}
              <div style={field}>
                <label style={label}>
                  Admin Phone<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  type="tel"
                  value={formatUSPhone(form.adminPhone)}
                  onChange={(e) => setForm((f) => ({ ...f, adminPhone: formatUSPhone(e.target.value) }))}
                  placeholder="(555) 555-5555"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </div>

              <div style={field}>
                <label style={label}>Ext (optional)</label>
                <input
                  style={input}
                  value={form.adminPhoneExt}
                  onChange={(e) => setForm((f) => ({ ...f, adminPhoneExt: digitsOnly(e.target.value).slice(0, 6) }))}
                  placeholder="Ext"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              {/* Privacy checkbox */}
              <div style={{ ...field, gridColumn: "1 / -1", marginTop: -2 }}>
                <label style={checkRow}>
                  <input
                    type="checkbox"
                    checked={form.phonePrivate}
                    onChange={(e) => setForm((f) => ({ ...f, phonePrivate: e.target.checked }))}
                  />
                  Hide my admin phone number from players by default
                </label>
              </div>

              {/* Team Type + Team Name */}
              <div style={field}>
                <label style={label}>
                  Team Type<span style={req}>*</span>
                </label>
                <select
                  style={input}
                  value={form.teamType}
                  onChange={(e) => setForm((f) => ({ ...f, teamType: normalizeTeamType(e.target.value) }))}
                  required
                >
                  <option value="HS">High School</option>
                  <option value="TRAVEL">Travel</option>
                  <option value="COLLEGE">College</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Team / Organization Name<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Team / Organization Name"
                  required
                />
              </div>

              {/* City + State */}
              <div style={field}>
                <label style={label}>
                  City<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                  required
                />
              </div>

              <div style={field}>
                <label style={label}>
                  State<span style={req}>*</span>
                </label>
                <input
                  style={input}
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
                  placeholder="State"
                  list="us-state-abbrs"
                  maxLength={2}
                  required
                />
                <datalist id="us-state-abbrs">
                  {US_STATE_ABBRS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Website */}
              <div style={{ ...field, gridColumn: "1 / -1" }}>
                <label style={label}>Website URL (optional)</label>
                <input
                  style={input}
                  value={form.websiteUrl}
                  onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://yourteam.com"
                />
                {websiteHref ? (
                  <div style={hint}>
                    Preview:{" "}
                    <a href={websiteHref} target="_blank" rel="noreferrer" style={linkInline}>
                      {websiteHref}
                    </a>
                  </div>
                ) : null}
              </div>

              {/* X + Instagram */}
              <div style={field}>
                <label style={label}>Team X Account (optional)</label>
                <input
                  style={input}
                  value={form.xUrl}
                  onChange={(e) => setForm((f) => ({ ...f, xUrl: e.target.value }))}
                  placeholder="https://x.com/yourteam"
                />
              </div>

              <div style={field}>
                <label style={label}>Team Instagram Account (optional)</label>
                <input
                  style={input}
                  value={form.instagramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/yourteam"
                />
              </div>

              {/* Logo */}
              <div style={{ ...field, gridColumn: "1 / -1" }}>
                <div style={sectionTitle}>Logo (optional)</div>

                <div style={logoRow}>
                  <input
                    style={{ ...input, flex: 1 }}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const inputEl = e.currentTarget;
                      const file = inputEl.files?.[0];
                      if (!file) return;

                      setError(null);
                      setSuccess(null);

                      try {
                        const dataUrl = await fileToDataUrl(file);
                        setForm((f) => ({ ...f, logoUrl: dataUrl }));

                        if (!canAutoSave()) {
                          setSuccess("Logo loaded. Finish required fields and click Save Profile to store it.");
                          return;
                        }

                        await saveToApi({ logoUrl: dataUrl });
                      } catch (err: any) {
                        setError(err?.message || "Failed to load logo file.");
                      } finally {
                        if (inputEl) inputEl.value = "";
                      }
                    }}
                  />

                  <input
                    style={{ ...input, flex: 1 }}
                    value={form.logoUrl.startsWith("data:") ? "" : form.logoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="…or paste a logo URL"
                  />
                </div>

                <div style={hint}>Uploading here updates your team branding everywhere (header + public profile).</div>

                {form.logoUrl ? (
                  <div style={logoPreviewWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoUrl}
                      alt="Team logo preview"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        objectFit: "cover",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>Logo Preview</div>
                      <div style={hint}>{form.logoUrl.startsWith("data:") ? "Uploaded image" : form.logoUrl}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ✅ public link hint */}
            <div style={{ ...hint, marginTop: 2 }}>
              Public link: <span style={{ fontWeight: 900, color: "#0f172a" }}>{publicUrl || "—"}</span>
              <div style={{ marginTop: 4 }}>{slugHint}</div>
            </div>

            {error ? <div style={errorBox}>{error}</div> : null}
            {success ? <div style={successBox}>{success}</div> : null}

            {/* Save + View + Share */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" style={primaryBtn} disabled={saving}>
                {saving ? "Saving…" : "Save Profile"}
              </button>

              {publicUrl ? (
                <Link href={publicUrl} target="_blank" rel="noreferrer" style={btnBlue}>
                  View Profile
                </Link>
              ) : (
                <button type="button" style={{ ...btnBlue, opacity: 0.55, cursor: "not-allowed" }} disabled>
                  View Profile
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareOpen((v) => !v)}
                disabled={!publicUrl}
                style={{
                  ...btnShare,
                  opacity: publicUrl ? 1 : 0.55,
                  cursor: publicUrl ? "pointer" : "not-allowed",
                }}
                title={!publicUrl ? "Enter a Team / Organization Name to generate your public profile link." : "Share your team profile"}
              >
                Share Profile
              </button>
            </div>

            {shareOpen && publicUrl ? (
              <div style={shareCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>Share your Team Profile</div>
                  <button type="button" onClick={() => setShareOpen(false)} style={btnShareClose}>
                    ×
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 220px", gap: 14, alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={hint}>Share this link with players and families or scan the QR code.</div>

                    <div style={shareLinkBox}>
                      <div style={{ fontWeight: 900, fontSize: 12, color: "#64748b" }}>Profile Link</div>
                      <div style={{ marginTop: 6, wordBreak: "break-word", fontWeight: 900 }}>{shareUrl}</div>

                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={copyShareLink} style={btnShare}>
                          Copy Link
                        </button>

                        <a href={emailShareHref} style={btnShare} title="Open your email app">
                          Email Link
                        </a>
                      </div>

                      {shareToast ? (
                        <div style={{ marginTop: 8, ...hint, color: "#047857", fontWeight: 900 }}>{shareToast}</div>
                      ) : null}
                    </div>
                  </div>

                  <div style={qrWrap}>
                    <QRCodeSVG value={shareUrl} size={180} />
                    <div style={{ marginTop: 8, ...hint, textAlign: "center" }}>Scan to view</div>
                  </div>
                </div>
              </div>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}

/* ---------------- Styles ---------------- */

const topRow: React.CSSProperties = {
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

const pageTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 28,
  letterSpacing: "-0.01em",
  lineHeight: 1.15,
};

const muted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const hint: React.CSSProperties = { fontSize: 11, color: "#94a3b8" };

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const nudgeBar: React.CSSProperties = {
  position: "sticky",
  top: 10,
  zIndex: 5,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 12,
  boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const nudgeDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "#f59e0b",
  display: "inline-block",
};

const gridTwoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  alignItems: "start",
};

const field: React.CSSProperties = { display: "grid", gap: 6 };

const label: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  color: "#0f172a",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  color: "#0f172a",
  marginBottom: 2,
};

const req: React.CSSProperties = { color: "#b91c1c", marginLeft: 4 };

const input: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 400,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const checkRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
  color: "#0f172a",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnBlue: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const btnShare: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};

const shareCard: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const btnShareClose: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: "28px",
};

const shareLinkBox: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f8fafc",
  padding: 12,
};

const qrWrap: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  display: "grid",
  placeItems: "center",
};

const errorBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
};

const successBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  borderRadius: 12,
  fontWeight: 900,
};

const linkInline: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  textDecoration: "none",
  borderBottom: "1px solid rgba(14,165,233,0.35)",
};

const logoRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const logoPreviewWrap: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  display: "flex",
  gap: 12,
  alignItems: "center",
};

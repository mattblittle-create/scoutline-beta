// app/dashboard/parent/player/[playerProfileId]/edit/ParentPlayerEditForm.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  playerProfileId: string;
  initialData: Record<string, any>;
  playerEmail: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  gradYear: string;
  school: string;
  travelTeam: string;
  hometown: string;
  state: string;
  gpa: string;
  primaryPosition: string;
  secondaryPosition: string;
  bats: string;
  throws: string;
  height: string;
  weight: string;
  bio: string;
  instagramUrl: string;
  xUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  highlightVideoUrl: string;
};

function pick(data: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export default function ParentPlayerEditForm({
  playerProfileId,
  initialData,
  playerEmail,
}: Props) {
  const router = useRouter();

  const [form, setForm] = React.useState<FormState>({
    firstName: pick(initialData, "firstName", "playerFirstName", "nameFirst"),
    lastName: pick(initialData, "lastName", "playerLastName", "nameLast"),
    gradYear: pick(initialData, "gradYear", "graduationYear", "classYear"),
    school: pick(initialData, "school", "highSchool", "hsName"),
    travelTeam: pick(initialData, "travelTeam", "teamName"),
    hometown: pick(initialData, "hometown", "city"),
    state: pick(initialData, "state"),
    gpa: pick(initialData, "gpa", "GPA"),
    primaryPosition: pick(initialData, "primaryPosition", "primaryPos", "position"),
    secondaryPosition: pick(initialData, "secondaryPosition", "secondaryPos"),
    bats: pick(initialData, "bats"),
    throws: pick(initialData, "throws", "throwingHand"),
    height: pick(initialData, "height", "heightDisplay"),
    weight: pick(initialData, "weight", "weightDisplay"),
    bio: pick(initialData, "bio", "playerBio", "summary"),
    instagramUrl: pick(initialData, "instagramUrl"),
    xUrl: pick(initialData, "xUrl", "twitterUrl"),
    youtubeUrl: pick(initialData, "youtubeUrl"),
    tiktokUrl: pick(initialData, "tiktokUrl"),
    highlightVideoUrl: pick(initialData, "highlightVideoUrl", "videoUrl", "primaryVideoUrl"),
  });

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/parent/player/${encodeURIComponent(playerProfileId)}/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to save player profile.");
      }

      setSuccess("Player profile updated successfully.");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
      <section style={card}>
        <div style={cardTitle}>Core Information</div>

        <div style={grid2}>
          <Field
            label="Player Email"
            value={playerEmail}
            disabled
            onChange={() => {}}
          />
          <Field
            label="Graduation Year"
            value={form.gradYear}
            onChange={(v) => update("gradYear", v)}
            placeholder="2028"
          />
          <Field
            label="First Name"
            value={form.firstName}
            onChange={(v) => update("firstName", v)}
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChange={(v) => update("lastName", v)}
          />
          <Field
            label="School"
            value={form.school}
            onChange={(v) => update("school", v)}
          />
          <Field
            label="Travel Team"
            value={form.travelTeam}
            onChange={(v) => update("travelTeam", v)}
          />
          <Field
            label="Hometown"
            value={form.hometown}
            onChange={(v) => update("hometown", v)}
          />
          <Field
            label="State"
            value={form.state}
            onChange={(v) => update("state", v)}
          />
          <Field
            label="GPA"
            value={form.gpa}
            onChange={(v) => update("gpa", v)}
            placeholder="4.00"
          />
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Athletics</div>

        <div style={grid2}>
          <Field
            label="Primary Position"
            value={form.primaryPosition}
            onChange={(v) => update("primaryPosition", v)}
          />
          <Field
            label="Secondary Position"
            value={form.secondaryPosition}
            onChange={(v) => update("secondaryPosition", v)}
          />
          <Field
            label="Bats"
            value={form.bats}
            onChange={(v) => update("bats", v)}
            placeholder="R / L / Switch"
          />
          <Field
            label="Throws"
            value={form.throws}
            onChange={(v) => update("throws", v)}
            placeholder="R / L"
          />
          <Field
            label="Height"
            value={form.height}
            onChange={(v) => update("height", v)}
            placeholder={`6'0"`}
          />
          <Field
            label="Weight"
            value={form.weight}
            onChange={(v) => update("weight", v)}
            placeholder="180"
          />
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Player Summary</div>

        <label style={label}>Bio / Summary</label>
        <textarea
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          rows={6}
          style={textarea}
          placeholder="Write a short player summary."
        />
      </section>

      <section style={card}>
        <div style={cardTitle}>Social / Video</div>

        <div style={grid2}>
          <Field
            label="Highlight Video URL"
            value={form.highlightVideoUrl}
            onChange={(v) => update("highlightVideoUrl", v)}
            placeholder="https://..."
          />
          <Field
            label="Instagram URL"
            value={form.instagramUrl}
            onChange={(v) => update("instagramUrl", v)}
            placeholder="https://..."
          />
          <Field
            label="X URL"
            value={form.xUrl}
            onChange={(v) => update("xUrl", v)}
            placeholder="https://..."
          />
          <Field
            label="YouTube URL"
            value={form.youtubeUrl}
            onChange={(v) => update("youtubeUrl", v)}
            placeholder="https://..."
          />
          <Field
            label="TikTok URL"
            value={form.tiktokUrl}
            onChange={(v) => update("tiktokUrl", v)}
            placeholder="https://..."
          />
        </div>
      </section>

      {error ? <div style={errorBox}>{error}</div> : null}
      {success ? <div style={successBox}>{success}</div> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" disabled={saving} style={goldBtn}>
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/parent/player/${encodeURIComponent(playerProfileId)}`
            )
          }
          style={ghostBtn}
        >
          Back to Player Overview
        </button>
      </div>
    </form>
  );
}

function Field({
  label: fieldLabel,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={label}>{fieldLabel}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={input}
      />
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  display: "grid",
  gap: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#0f172a",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const label: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 13,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  outline: "none",
};

const textarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  outline: "none",
  resize: "vertical",
};

const goldBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  boxShadow: "0 8px 18px rgba(202,160,66,0.22)",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 800,
};

const successBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  borderRadius: 12,
  fontWeight: 800,
};
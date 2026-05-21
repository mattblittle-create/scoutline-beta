// app/dashboard/coach/program-verification/ProgramVerificationClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type FormState = {
  nickname: string;
  logoUrl: string;
  baseballWebsiteUrl: string;
  rosterUrl: string;
  scheduleUrl: string;
  campsUrl: string;
  questionnaireUrl: string;
  generalContactUrl: string;
  generalContactEmail: string;
  currentRosterSize: string;
  averageGpa: string;
  scholarshipNotes: string;
  scholarshipInfoUrl: string;
  transferHeavy: boolean;
  jucoFriendly: boolean;
  recruitingAggressiveness: string;
  regionalRecruitingBias: string;
  rosterTurnoverLevel: string;
  playerDevelopmentNotes: string;
};

const emptyForm: FormState = {
  nickname: "",
  logoUrl: "",
  baseballWebsiteUrl: "",
  rosterUrl: "",
  scheduleUrl: "",
  campsUrl: "",
  questionnaireUrl: "",
  generalContactUrl: "",
  generalContactEmail: "",
  currentRosterSize: "",
  averageGpa: "",
  scholarshipNotes: "",
  scholarshipInfoUrl: "",
  transferHeavy: false,
  jucoFriendly: false,
  recruitingAggressiveness: "",
  regionalRecruitingBias: "",
  rosterTurnoverLevel: "",
  playerDevelopmentNotes: "",
};

export default function ProgramVerificationClient() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [collegeName, setCollegeName] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/coach/program-verification", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not load program verification.");
      }

      const college = json.data.college;
      const program = college?.baseballProgram || {};

      setCollegeName(college?.name || "Your Program");
      setSubmissions(college?.programVerificationSubmissions || []);

      setForm({
        ...emptyForm,
        nickname: program?.nickname || "",
        logoUrl: program?.logoUrl || college?.logoUrl || "",
        baseballWebsiteUrl:
          program?.baseballWebsiteUrl || college?.programWebsiteUrl || "",
        rosterUrl: program?.rosterUrl || "",
        scheduleUrl: program?.scheduleUrl || "",
        campsUrl: program?.campsUrl || "",
        questionnaireUrl:
          program?.questionnaireUrl ||
          college?.recruitingQuestionnaireUrl ||
          "",
        generalContactUrl: program?.generalContactUrl || "",
        generalContactEmail: program?.generalContactEmail || "",
        currentRosterSize:
          program?.currentRosterSize == null
            ? ""
            : String(program.currentRosterSize),
        averageGpa:
          program?.averageGpa == null ? "" : String(program.averageGpa),
        scholarshipNotes: program?.scholarshipNotes || "",
        scholarshipInfoUrl: program?.scholarshipInfoUrl || "",
        transferHeavy: Boolean(program?.transferHeavy),
        jucoFriendly: Boolean(program?.jucoFriendly),
        recruitingAggressiveness: program?.recruitingAggressiveness || "",
        regionalRecruitingBias: program?.regionalRecruitingBias || "",
        rosterTurnoverLevel: program?.rosterTurnoverLevel || "",
        playerDevelopmentNotes: program?.playerDevelopmentNotes || "",
      });
    } catch (err: any) {
      setMsg(err?.message || "Could not load program verification.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/coach/program-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not submit program verification.");
      }

      setMsg("Program verification submitted for ScoutLine review.");
      await load();
    } catch (err: any) {
      setMsg(err?.message || "Could not submit program verification.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main style={page}>
        <p style={muted}>Loading program verification...</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={topbar}>
        <div>
          <Link href="/dashboard/coach" style={backLink}>
            ← Back to Coach Dashboard
          </Link>
          <h1 style={title}>Program Verification</h1>
          <p style={subtitle}>
            Confirm baseball-specific details for {collegeName}. These updates
            are submitted for ScoutLine review before becoming official.
          </p>
        </div>
      </div>

      {msg ? (
        <div
          style={{
            ...notice,
            borderColor: msg.includes("Could not") ? "#fecaca" : "#bbf7d0",
            background: msg.includes("Could not") ? "#fef2f2" : "#f0fdf4",
            color: msg.includes("Could not") ? "#991b1b" : "#166534",
          }}
        >
          {msg}
        </div>
      ) : null}

      <section style={card}>
        <h2 style={sectionTitle}>Program Identity</h2>
        <div style={grid}>
          <Field label="Nickname" value={form.nickname} onChange={(v) => update("nickname", v)} />
          <Field label="Logo URL" value={form.logoUrl} onChange={(v) => update("logoUrl", v)} />
          <Field label="Baseball Website URL" value={form.baseballWebsiteUrl} onChange={(v) => update("baseballWebsiteUrl", v)} />
          <Field label="Roster URL" value={form.rosterUrl} onChange={(v) => update("rosterUrl", v)} />
          <Field label="Schedule URL" value={form.scheduleUrl} onChange={(v) => update("scheduleUrl", v)} />
          <Field label="Camps URL" value={form.campsUrl} onChange={(v) => update("campsUrl", v)} />
          <Field label="Recruiting Questionnaire URL" value={form.questionnaireUrl} onChange={(v) => update("questionnaireUrl", v)} />
          <Field label="General Contact URL" value={form.generalContactUrl} onChange={(v) => update("generalContactUrl", v)} />
          <Field label="General Contact Email" value={form.generalContactEmail} onChange={(v) => update("generalContactEmail", v)} />
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Recruiting Intelligence</h2>
        <div style={grid}>
          <Field label="Current Roster Size" value={form.currentRosterSize} onChange={(v) => update("currentRosterSize", v)} />
          <Field label="Average GPA" value={form.averageGpa} onChange={(v) => update("averageGpa", v)} />
          <Field label="Recruiting Aggressiveness" value={form.recruitingAggressiveness} onChange={(v) => update("recruitingAggressiveness", v)} />
          <Field label="Regional Recruiting Bias" value={form.regionalRecruitingBias} onChange={(v) => update("regionalRecruitingBias", v)} />
          <Field label="Roster Turnover Level" value={form.rosterTurnoverLevel} onChange={(v) => update("rosterTurnoverLevel", v)} />
          <Toggle label="Transfer Heavy" checked={form.transferHeavy} onChange={(v) => update("transferHeavy", v)} />
          <Toggle label="JUCO Friendly" checked={form.jucoFriendly} onChange={(v) => update("jucoFriendly", v)} />
        </div>

        <TextArea label="Scholarship Notes" value={form.scholarshipNotes} onChange={(v) => update("scholarshipNotes", v)} />
        <Field label="Scholarship Info URL" value={form.scholarshipInfoUrl} onChange={(v) => update("scholarshipInfoUrl", v)} />
        <TextArea label="Player Development Notes" value={form.playerDevelopmentNotes} onChange={(v) => update("playerDevelopmentNotes", v)} />
      </section>

      <button type="button" onClick={submit} disabled={saving} style={submitBtn}>
        {saving ? "Submitting..." : "Submit Program Verification"}
      </button>

      <section style={card}>
        <h2 style={sectionTitle}>Recent Submissions</h2>
        {submissions.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {submissions.map((s) => (
              <div key={s.id} style={submissionRow}>
                <strong>{s.status}</strong>
                <span style={muted}>
                  Submitted {new Date(s.createdAt).toLocaleString()}
                </span>
                {s.adminNotes ? <span>{s.adminNotes}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <p style={muted}>No program verification submissions yet.</p>
        )}
      </section>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={field}>
      <span style={label}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={input}
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ ...field, gridColumn: "1 / -1" }}>
      <span style={label}>{props.label}</span>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={4}
        style={{ ...input, resize: "vertical" }}
      />
    </label>
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={toggleRow}>
      <span style={label}>{props.label}</span>
      <button
        type="button"
        onClick={() => props.onChange(!props.checked)}
        style={{
          ...toggleBtn,
          background: props.checked ? "#0f172a" : "#e2e8f0",
          color: props.checked ? "#fff" : "#334155",
        }}
      >
        {props.checked ? "YES" : "NO"}
      </button>
    </label>
  );
}

const page: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const topbar: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 20,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const backLink: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  textDecoration: "none",
  fontSize: 13,
};

const title: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 28,
  color: "#0f172a",
};

const subtitle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.45,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 20,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  color: "#0f172a",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#334155",
};

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#0f172a",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
};

const toggleBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const submitBtn: React.CSSProperties = {
  justifySelf: "start",
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  borderRadius: 12,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const notice: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 14,
  padding: 12,
  fontWeight: 800,
};

const muted: React.CSSProperties = {
  color: "#64748b",
};

const submissionRow: React.CSSProperties = {
  display: "grid",
  gap: 4,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
};
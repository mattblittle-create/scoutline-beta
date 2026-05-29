// app/dashboard/coach/program-verification/ProgramVerificationClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type RosterNeed = {
  gradYear: string;
  position: string;
  needLevel: string;
  notes: string;
};

type CoachContact = {
  name: string;
  title: string;
  email: string;
  phone: string;
  isRecruitingContact: boolean;
};

type ProgramMetric = {
  position: string;
  metricKey: string;
  metricLabel: string;
  averageValue: string;
  minValue: string;
  maxValue: string;
  unit: string;
};

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

  recruitingCoordinatorName: string;
  recruitingCoordinatorEmail: string;
  recruitingCoordinatorPhone: string;

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

  academicAreas: string[];
  rosterNeeds: RosterNeed[];
  coachContacts: CoachContact[];
  programMetrics: ProgramMetric[];

  nilAvailable: boolean;
  baseballNilStrength: string;
  nilSummary: string;
  nilNotes: string;
  collectiveName: string;
  collectiveWebsiteUrl: string;
};

const ACADEMIC_OPTIONS = [
  "Business",
  "Finance",
  "Marketing",
  "Sports Management",
  "Kinesiology",
  "Exercise Science",
  "Sports Medicine",
  "Education",
  "Engineering",
  "Computer Science",
  "Communications",
  "Criminal Justice",
  "Biology",
  "Pre-Med",
  "Nursing",
  "Psychology",
];

const POSITION_OPTIONS = ["P", "RHP", "LHP", "C", "1B", "2B", "SS", "3B", "OF", "UTL", "Two-Way"];
const NEED_LEVELS = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"];

const PERCENT_BUCKETS = [
  "LOW_0_25",
  "MODERATE_26_50",
  "HIGH_51_75",
  "VERY_HIGH_76_100",
  "UNKNOWN",
];

const REGIONAL_BUCKETS = [
  "LOCAL_0_25",
  "REGIONAL_26_50",
  "HEAVY_REGIONAL_51_75",
  "MOSTLY_REGIONAL_76_100",
  "UNKNOWN",
];

const METRIC_OPTIONS = [
  { key: "homeToFirst", label: "Home to 1B", unit: "sec" },
  { key: "sixtyYdDash", label: "60 Yard Dash", unit: "sec" },
  { key: "exitVelo", label: "Exit Velocity", unit: "mph" },
  { key: "rawThrowVelo", label: "Raw Throwing Velocity", unit: "mph" },
  { key: "infieldThrowVelo", label: "Infield Throwing Velocity", unit: "mph" },
  { key: "outfieldThrowVelo", label: "Outfield Throwing Velocity", unit: "mph" },
  { key: "catcherThrowVelo", label: "Catcher Throwing Velocity", unit: "mph" },
  { key: "avgFbVelo", label: "Avg Fastball Velocity", unit: "mph" },
  { key: "avgChVelo", label: "Avg Changeup Velocity", unit: "mph" },
  { key: "avgBbVelo", label: "Avg Breaking Ball Velocity", unit: "mph" },
  { key: "popTime", label: "Catcher Pop Time", unit: "sec" },
  { key: "benchPress", label: "Bench Press", unit: "lbs" },
  { key: "squat", label: "Squat", unit: "lbs" },
  { key: "deadLift", label: "Dead Lift", unit: "lbs" },
];

const emptyRosterNeed: RosterNeed = {
  gradYear: "",
  position: "",
  needLevel: "UNKNOWN",
  notes: "",
};

const emptyCoachContact: CoachContact = {
  name: "",
  title: "",
  email: "",
  phone: "",
  isRecruitingContact: false,
};

const emptyProgramMetric: ProgramMetric = {
  position: "",
  metricKey: "",
  metricLabel: "",
  averageValue: "",
  minValue: "",
  maxValue: "",
  unit: "",
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

  recruitingCoordinatorName: "",
  recruitingCoordinatorEmail: "",
  recruitingCoordinatorPhone: "",

  currentRosterSize: "",
  averageGpa: "",
  scholarshipNotes: "",
  scholarshipInfoUrl: "",
  transferHeavy: false,
  jucoFriendly: false,
  recruitingAggressiveness: "UNKNOWN",
  regionalRecruitingBias: "UNKNOWN",
  rosterTurnoverLevel: "UNKNOWN",
  playerDevelopmentNotes: "",

  academicAreas: [],
  rosterNeeds: [{ ...emptyRosterNeed }],
  coachContacts: [{ ...emptyCoachContact }],
  programMetrics: [{ ...emptyProgramMetric }],

  nilAvailable: false,
  baseballNilStrength: "UNKNOWN",
  nilSummary: "",
  nilNotes: "",
  collectiveName: "",
  collectiveWebsiteUrl: "",
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

  function toggleAcademicArea(area: string) {
    setForm((current) => {
      const exists = current.academicAreas.includes(area);
      return {
        ...current,
        academicAreas: exists
          ? current.academicAreas.filter((a) => a !== area)
          : [...current.academicAreas, area],
      };
    });
  }

  function updateRosterNeed(index: number, key: keyof RosterNeed, value: string) {
    setForm((current) => ({
      ...current,
      rosterNeeds: current.rosterNeeds.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function addRosterNeed() {
    setForm((current) => ({
      ...current,
      rosterNeeds: [...current.rosterNeeds, { ...emptyRosterNeed }],
    }));
  }

  function removeRosterNeed(index: number) {
    setForm((current) => ({
      ...current,
      rosterNeeds:
        current.rosterNeeds.length <= 1
          ? [{ ...emptyRosterNeed }]
          : current.rosterNeeds.filter((_, i) => i !== index),
    }));
  }

  function updateCoachContact(index: number, key: keyof CoachContact, value: string | boolean) {
    setForm((current) => ({
      ...current,
      coachContacts: current.coachContacts.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function addCoachContact() {
    setForm((current) => ({
      ...current,
      coachContacts: [...current.coachContacts, { ...emptyCoachContact }],
    }));
  }

  function removeCoachContact(index: number) {
    setForm((current) => ({
      ...current,
      coachContacts:
        current.coachContacts.length <= 1
          ? [{ ...emptyCoachContact }]
          : current.coachContacts.filter((_, i) => i !== index),
    }));
  }

  function updateProgramMetric(index: number, key: keyof ProgramMetric, value: string) {
    setForm((current) => ({
      ...current,
      programMetrics: current.programMetrics.map((item, i) => {
        if (i !== index) return item;

        const next = { ...item, [key]: value };

        if (key === "metricKey") {
          const meta = METRIC_OPTIONS.find((m) => m.key === value);
          next.metricLabel = meta?.label || "";
          next.unit = meta?.unit || "";
        }

        return next;
      }),
    }));
  }

  function addProgramMetric() {
    setForm((current) => ({
      ...current,
      programMetrics: [...current.programMetrics, { ...emptyProgramMetric }],
    }));
  }

  function removeProgramMetric(index: number) {
    setForm((current) => ({
      ...current,
      programMetrics:
        current.programMetrics.length <= 1
          ? [{ ...emptyProgramMetric }]
          : current.programMetrics.filter((_, i) => i !== index),
    }));
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
      const nilProfile = college?.nilProfile || {};
      const firstCollective = Array.isArray(nilProfile?.collectives)
        ? nilProfile.collectives[0]
        : null;

      const existingAcademicAreas = Array.isArray(college?.academicAreas)
        ? college.academicAreas.map((a: any) => String(a?.name || "").trim()).filter(Boolean)
        : [];

      const existingRosterNeeds =
        Array.isArray(program?.rosterNeeds) && program.rosterNeeds.length
          ? program.rosterNeeds.map((r: any) => ({
              gradYear: r?.gradYear == null ? "" : String(r.gradYear),
              position: r?.position || "",
              needLevel: r?.needLevel || "UNKNOWN",
              notes: r?.notes || "",
            }))
          : [{ ...emptyRosterNeed }];

      const existingCoachContacts =
        Array.isArray(program?.coaches) && program.coaches.length
          ? program.coaches.map((c: any) => ({
              name: c?.name || "",
              title: c?.title || "",
              email: c?.email || "",
              phone: c?.phone || "",
              isRecruitingContact: Boolean(
                String(c?.title || "").toLowerCase().includes("recruit")
              ),
            }))
          : [{ ...emptyCoachContact }];

      const existingProgramMetrics =
        Array.isArray(program?.metricAverages) && program.metricAverages.length
          ? program.metricAverages.map((m: any) => ({
              position: m?.position || "",
              metricKey: m?.metricKey || "",
              metricLabel: m?.metricLabel || "",
              averageValue: m?.averageValue == null ? "" : String(m.averageValue),
              minValue: m?.minValue == null ? "" : String(m.minValue),
              maxValue: m?.maxValue == null ? "" : String(m.maxValue),
              unit: m?.unit || "",
            }))
          : [{ ...emptyProgramMetric }];

      setCollegeName(college?.name || "Your Program");
      setSubmissions(college?.programVerificationSubmissions || []);

      setForm({
        ...emptyForm,
        nickname: program?.nickname || "",
        logoUrl: program?.logoUrl || college?.logoUrl || "",
        baseballWebsiteUrl: program?.baseballWebsiteUrl || college?.programWebsiteUrl || "",
        rosterUrl: program?.rosterUrl || "",
        scheduleUrl: program?.scheduleUrl || "",
        campsUrl: program?.campsUrl || "",
        questionnaireUrl: program?.questionnaireUrl || college?.recruitingQuestionnaireUrl || "",
        generalContactUrl: program?.generalContactUrl || "",
        generalContactEmail: program?.generalContactEmail || "",

        recruitingCoordinatorName: "",
        recruitingCoordinatorEmail: "",
        recruitingCoordinatorPhone: "",

        currentRosterSize:
          program?.currentRosterSize == null ? "" : String(program.currentRosterSize),
        averageGpa: program?.averageGpa == null ? "" : String(program.averageGpa),
        scholarshipNotes: program?.scholarshipNotes || "",
        scholarshipInfoUrl: program?.scholarshipInfoUrl || "",
        transferHeavy: Boolean(program?.transferHeavy),
        jucoFriendly: Boolean(program?.jucoFriendly),
        recruitingAggressiveness: program?.recruitingAggressiveness || "UNKNOWN",
        regionalRecruitingBias: program?.regionalRecruitingBias || "UNKNOWN",
        rosterTurnoverLevel: program?.rosterTurnoverLevel || "UNKNOWN",
        playerDevelopmentNotes: program?.playerDevelopmentNotes || "",

        academicAreas: existingAcademicAreas,
        rosterNeeds: existingRosterNeeds,
        coachContacts: existingCoachContacts,
        programMetrics: existingProgramMetrics,

        nilAvailable: Boolean(nilProfile?.nilAvailable),
        baseballNilStrength: nilProfile?.baseballNilStrength || "UNKNOWN",
        nilSummary: nilProfile?.nilSummary || "",
        nilNotes: nilProfile?.nilNotes || "",
        collectiveName: firstCollective?.name || "",
        collectiveWebsiteUrl: firstCollective?.websiteUrl || "",
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
            Confirm baseball-specific details for {collegeName}. These updates are submitted for
            review before becoming official.
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
        <h2 style={sectionTitle}>Recruiting Coordinator</h2>
        <div style={grid}>
          <Field label="Name" value={form.recruitingCoordinatorName} onChange={(v) => update("recruitingCoordinatorName", v)} />
          <Field label="Email" value={form.recruitingCoordinatorEmail} onChange={(v) => update("recruitingCoordinatorEmail", v)} />
          <Field label="Phone" value={form.recruitingCoordinatorPhone} onChange={(v) => update("recruitingCoordinatorPhone", v)} />
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Coach Contacts</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {form.coachContacts.map((coach, index) => (
            <div key={index} style={nestedCard}>
              <div style={grid}>
                <Field label="Name" value={coach.name} onChange={(v) => updateCoachContact(index, "name", v)} />
                <Field label="Title" value={coach.title} onChange={(v) => updateCoachContact(index, "title", v)} />
                <Field label="Email" value={coach.email} onChange={(v) => updateCoachContact(index, "email", v)} />
                <Field label="Phone" value={coach.phone} onChange={(v) => updateCoachContact(index, "phone", v)} />
                <Toggle label="Recruiting Contact" checked={coach.isRecruitingContact} onChange={(v) => updateCoachContact(index, "isRecruitingContact", v)} />
              </div>

              <button type="button" onClick={() => removeCoachContact(index)} style={secondaryBtn}>
                Remove Contact
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addCoachContact} style={{ ...secondaryBtn, marginTop: 12 }}>
          + Add Coach Contact
        </button>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Recruiting Intelligence</h2>
        <div style={grid}>
          <Field label="Current Roster Size" value={form.currentRosterSize} onChange={(v) => update("currentRosterSize", v)} />
          <Field label="Average Team GPA" value={form.averageGpa} onChange={(v) => update("averageGpa", v)} />
          <SelectField label="Recruiting Aggressiveness" value={form.recruitingAggressiveness} options={PERCENT_BUCKETS} onChange={(v) => update("recruitingAggressiveness", v)} />
          <SelectField label="Regional Recruiting Bias" value={form.regionalRecruitingBias} options={REGIONAL_BUCKETS} onChange={(v) => update("regionalRecruitingBias", v)} />
          <SelectField label="Roster Turnover Level" value={form.rosterTurnoverLevel} options={PERCENT_BUCKETS} onChange={(v) => update("rosterTurnoverLevel", v)} />
          <Toggle label="Transfer Heavy" checked={form.transferHeavy} onChange={(v) => update("transferHeavy", v)} />
          <Toggle label="JUCO Friendly" checked={form.jucoFriendly} onChange={(v) => update("jucoFriendly", v)} />
        </div>

        <TextArea label="Scholarship Notes" value={form.scholarshipNotes} onChange={(v) => update("scholarshipNotes", v)} />
        <Field label="Scholarship Info URL" value={form.scholarshipInfoUrl} onChange={(v) => update("scholarshipInfoUrl", v)} />
        <TextArea label="Player Development Notes" value={form.playerDevelopmentNotes} onChange={(v) => update("playerDevelopmentNotes", v)} />
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Program Benchmarks / Metrics</h2>
        <p style={muted}>
          Confirm division benchmark expectations or enter your own program-specific benchmark ranges.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {form.programMetrics.map((metric, index) => (
            <div key={index} style={nestedCard}>
              <div style={grid}>
                <SelectField label="Position" value={metric.position} options={POSITION_OPTIONS} onChange={(v) => updateProgramMetric(index, "position", v)} />
                <SelectField label="Metric" value={metric.metricKey} options={METRIC_OPTIONS.map((m) => m.key)} onChange={(v) => updateProgramMetric(index, "metricKey", v)} />
                <Field label="Metric Label" value={metric.metricLabel} onChange={(v) => updateProgramMetric(index, "metricLabel", v)} />
                <Field label="Average Value" value={metric.averageValue} onChange={(v) => updateProgramMetric(index, "averageValue", v)} />
                <Field label="Minimum Value" value={metric.minValue} onChange={(v) => updateProgramMetric(index, "minValue", v)} />
                <Field label="Maximum Value" value={metric.maxValue} onChange={(v) => updateProgramMetric(index, "maxValue", v)} />
                <Field label="Unit" value={metric.unit} onChange={(v) => updateProgramMetric(index, "unit", v)} />
              </div>

              <button type="button" onClick={() => removeProgramMetric(index)} style={secondaryBtn}>
                Remove Metric
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addProgramMetric} style={{ ...secondaryBtn, marginTop: 12 }}>
          + Add Program Metric
        </button>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Roster Needs</h2>
        <p style={muted}>
          Add positional needs by graduating class. This helps ScoutLine understand actual recruiting opportunity.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {form.rosterNeeds.map((need, index) => (
            <div key={index} style={nestedCard}>
              <div style={grid}>
                <Field label="Grad Year" value={need.gradYear} onChange={(v) => updateRosterNeed(index, "gradYear", v)} />
                <SelectField label="Position" value={need.position} options={POSITION_OPTIONS} onChange={(v) => updateRosterNeed(index, "position", v)} />
                <SelectField label="Need Level" value={need.needLevel} options={NEED_LEVELS} onChange={(v) => updateRosterNeed(index, "needLevel", v)} />
              </div>

              <TextArea label="Need Notes" value={need.notes} onChange={(v) => updateRosterNeed(index, "notes", v)} />

              <button type="button" onClick={() => removeRosterNeed(index)} style={secondaryBtn}>
                Remove Need
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addRosterNeed} style={{ ...secondaryBtn, marginTop: 12 }}>
          + Add Roster Need
        </button>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Academic Areas / Majors</h2>
        <p style={muted}>
          Select academic areas your school offers or is especially known for. This will power recruit filters.
        </p>

        <div style={chipGrid}>
          {ACADEMIC_OPTIONS.map((area) => {
            const selected = form.academicAreas.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleAcademicArea(area)}
                style={{
                  ...chip,
                  background: selected ? "#0f172a" : "#fff",
                  color: selected ? "#fff" : "#334155",
                  borderColor: selected ? "#0f172a" : "#cbd5e1",
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>NIL</h2>
        <div style={grid}>
          <Toggle label="NIL Opportunities Available" checked={form.nilAvailable} onChange={(v) => update("nilAvailable", v)} />
          <SelectField
            label="Baseball NIL Strength"
            value={form.baseballNilStrength}
            options={["ELITE", "STRONG", "COMPETITIVE", "EMERGING", "LIMITED", "UNKNOWN"]}
            onChange={(v) => update("baseballNilStrength", v)}
          />
          <Field label="Collective Name" value={form.collectiveName} onChange={(v) => update("collectiveName", v)} />
          <Field label="Collective Website URL" value={form.collectiveWebsiteUrl} onChange={(v) => update("collectiveWebsiteUrl", v)} />
        </div>

        <TextArea label="NIL Summary" value={form.nilSummary} onChange={(v) => update("nilSummary", v)} />
        <TextArea label="NIL Notes" value={form.nilNotes} onChange={(v) => update("nilNotes", v)} />
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
                <span style={muted}>Submitted {new Date(s.createdAt).toLocaleString()}</span>
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

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={field}>
      <span style={label}>{props.label}</span>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)} style={input} />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={field}>
      <span style={label}>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)} style={input}>
        <option value="">Select...</option>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea(props: { label: string; value: string; onChange: (value: string) => void }) {
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

function Toggle(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
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

const page: React.CSSProperties = { display: "grid", gap: 16 };

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

const nestedCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
  display: "grid",
  gap: 12,
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

const chipGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const chip: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "8px 12px",
  fontWeight: 900,
  cursor: "pointer",
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
  background: "#fff",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
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

const secondaryBtn: React.CSSProperties = {
  justifySelf: "start",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "9px 12px",
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
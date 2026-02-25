// app/dashboard/player/profile/CoreForm.tsx
"use client";

import * as React from "react";

type Props = {
  email: string; // TEMP until auth
  initial?: {
    gradYear: number | null;
    primaryPos: string | null;
    secondaryPos: string | null;
    throws: string | null; // "R" | "L" | "S"
    bats: string | null;   // "R" | "L" | "S"
    heightFt: number | null;
    heightIn: number | null; // 0..11
    weightLb: number | null;

    // additions (optional)
    age?: number | null;
    dob?: string | null;          // "mm/dd/yyyy"
    dobPrivate?: boolean | null;  // default true if missing
    gender?: string | null;       // "Male" | "Female"
  };
};

const POSITIONS = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "Utility"] as const;
const SECONDARY_POSITIONS = [...POSITIONS, "none"] as const; // "none" → null

// Helpers for DOB/age
function parseDob(dob: string): Date | null {
  const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return dt;
}
function computeAgeFromDob(dob: string, ref: Date = new Date()): number | null {
  const d = parseDob(dob);
  if (!d) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const hadBirthday =
    ref.getMonth() > d.getMonth() ||
    (ref.getMonth() === d.getMonth() && ref.getDate() >= d.getDate());
  if (!hadBirthday) age--;
  return age;
}

export default function CoreForm({ email, initial }: Props) {
  const [status, setStatus] = React.useState<null | string>(null);
  const [busy, setBusy] = React.useState(false);

  // Fade-out for Saved!
  const [savedVisible, setSavedVisible] = React.useState(false);
  const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearMsgTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to sync after save / focus errors
  const ageRef = React.useRef<HTMLInputElement>(null);
  const dobRef = React.useRef<HTMLInputElement>(null);
  const dobPrivateRef = React.useRef<HTMLInputElement>(null);
  const genderRef = React.useRef<HTMLSelectElement>(null);
  const gradYearRef = React.useRef<HTMLInputElement>(null);
  const heightInRef = React.useRef<HTMLInputElement>(null);

  // Validation errors
  const [fieldErr, setFieldErr] = React.useState<Record<string, string>>({});
  const [dobValid, setDobValid] = React.useState<boolean>(false);

  // On mount: compute age from initial DOB if present
  React.useEffect(() => {
    const dobStr = initial?.dob ?? "";
    const age = computeAgeFromDob(dobStr);
    setDobValid(!!parseDob(dobStr));
    if (age != null && ageRef.current) {
      ageRef.current.value = String(age);
    }
  }, [initial?.dob]);

  // Clear "Saved!" whenever the user edits anything in this form (event delegation works too)
  function clearSaved() {
    if (status) setStatus(null);
  }

  React.useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearMsgTimerRef.current) clearTimeout(clearMsgTimerRef.current);
    };
  }, []);

  function onDobInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearSaved();
    const v = e.currentTarget.value;
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const m = digits.slice(0, 2);
    const d = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    const masked = [m, d, y].filter(Boolean).join("/");
    e.currentTarget.value = masked;

    const age = computeAgeFromDob(masked);
    setDobValid(!!parseDob(masked));
    if (age != null && ageRef.current) {
      ageRef.current.value = String(age);
    }
  }

  // Focus first invalid field helper
  function focusFirstError(errors: Record<string, string>) {
    const order = ["dob", "age", "gender", "gradYear", "heightIn"] as const;
    for (const key of order) {
      if (errors[key]) {
        if (key === "dob") dobRef.current?.focus();
        else if (key === "age") ageRef.current?.focus();
        else if (key === "gender") genderRef.current?.focus();
        else if (key === "gradYear") gradYearRef.current?.focus();
        else if (key === "heightIn") heightInRef.current?.focus();
        break;
      }
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Guard: if we already have field errors, don't resubmit until they’re fixed
    if (Object.keys(fieldErr).length > 0) {
      setStatus("Please fix the highlighted fields.");
      focusFirstError(fieldErr);
      return;
    }

    setBusy(true);
    setStatus(null);
    setFieldErr({});

    const fd = new FormData(e.currentTarget);

    // Convert "none" for secondaryPos to empty string so API turns it into null
    const sec = (fd.get("secondaryPos") as string) || "";
    const secondaryPos = sec === "none" ? "" : sec;

    // Ensure age is consistent with DOB at submit time
    const dobStr = ((fd.get("dob") as string) || "").trim();
    const computed = computeAgeFromDob(dobStr);
    let ageOut = (fd.get("age") as string) || "";
    if (computed != null) ageOut = String(computed);

    const payload = {
      email,
      gradYear: (fd.get("gradYear") as string) || "",
      primaryPos: (fd.get("primaryPos") as string) || "",
      secondaryPos,
      throws: (fd.get("throws") as string) || "", // R/L
      bats: (fd.get("bats") as string) || "",     // R/L/S
      heightFt: (fd.get("heightFt") as string) || "",
      heightIn: (fd.get("heightIn") as string) || "",
      weightLb: (fd.get("weightLb") as string) || "",

      // additions
      age: ageOut,
      dob: dobStr,
      dobPrivate: !!fd.get("dobPrivate"),
      gender: (fd.get("gender") as string) || "",
    };

    try {
      const res = await fetch("/api/player/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json?.errors && typeof json.errors === "object") {
          setFieldErr(json.errors);
          setStatus("Please fix the highlighted fields.");
          focusFirstError(json.errors);
        } else {
          setStatus(json?.error || "Save failed");
        }
        return;
      }

      // --- sync UI with server-normalized truth
      const norm = json.normalized || {};
      if (typeof norm.dob !== "undefined" && dobRef.current) {
        dobRef.current.value = norm.dob ?? "";
        setDobValid(!!parseDob(norm.dob ?? ""));
      }
      if (ageRef.current) {
        const fromServer = typeof norm.age === "number" ? String(norm.age) : "";
        if (fromServer) {
          ageRef.current.value = fromServer;
        } else if (dobRef.current?.value) {
          const a = computeAgeFromDob(dobRef.current.value);
          if (a != null) ageRef.current.value = String(a);
        }
      }
      if (typeof norm.dobPrivate !== "undefined" && dobPrivateRef.current) {
        dobPrivateRef.current.checked = !!norm.dobPrivate;
      }
      if (typeof norm.gender !== "undefined" && genderRef.current) {
        genderRef.current.value = norm.gender ?? "";
      }

      // Clear field errors on success
      setFieldErr({});

      // Transient "Saved!" with fade
      setStatus("Saved!");
      setSavedVisible(true);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (clearMsgTimerRef.current) clearTimeout(clearMsgTimerRef.current);

      fadeTimerRef.current = setTimeout(() => {
        setSavedVisible(false);
        clearMsgTimerRef.current = setTimeout(() => setStatus(null), 400);
      }, 1800);
    } catch (err: any) {
      setStatus(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} onChange={clearSaved} style={wrap}>
      <h2 style={{ margin: 0 }}>Core Info</h2>
      <p style={{ marginTop: 6, color: "#475569" }}>
        TEMP editing for <strong>{email}</strong>
      </p>

      <div style={grid}>
        <label style={label}>
          Grad Year
          <input
            ref={gradYearRef}
            name="gradYear"
            type="number"
            defaultValue={initial?.gradYear ?? ""}
            style={input}
            aria-invalid={!!fieldErr.gradYear}
          />
          {fieldErr.gradYear && <div style={errText}>{fieldErr.gradYear}</div>}
        </label>

        <label style={label}>
          Primary Pos
          <select name="primaryPos" defaultValue={initial?.primaryPos ?? ""} style={input}>
            <option value="">— select —</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label style={label}>
          Secondary Pos
          <select
            name="secondaryPos"
            defaultValue={initial?.secondaryPos ?? "none"}
            style={input}
          >
            {SECONDARY_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p === "none" ? "None" : p}
              </option>
            ))}
          </select>
        </label>

        <label style={label}>
          Throws
          <select name="throws" defaultValue={initial?.throws ?? ""} style={input}>
            <option value="">— select —</option>
            <option value="R">R</option>
            <option value="L">L</option>
            <option value="S">S</option>
          </select>
        </label>

        <label style={label}>
          Bats
          <select name="bats" defaultValue={initial?.bats ?? ""} style={input}>
            <option value="">— select —</option>
            <option value="R">R</option>
            <option value="L">L</option>
            <option value="S">S</option>
          </select>
        </label>

        <label style={label}>
          Height (ft)
          <input
            name="heightFt"
            type="number"
            min={0}
            max={8}
            defaultValue={initial?.heightFt ?? ""}
            style={input}
          />
        </label>

        <label style={label}>
          Height (in)
          <input
            ref={heightInRef}
            name="heightIn"
            type="number"
            min={0}
            max={11}
            defaultValue={initial?.heightIn ?? ""}
            style={input}
            aria-invalid={!!fieldErr.heightIn}
          />
          {fieldErr.heightIn && <div style={errText}>{fieldErr.heightIn}</div>}
        </label>

        <label style={label}>
          Weight (lb)
          <input
            name="weightLb"
            type="number"
            min={0}
            max={600}
            defaultValue={initial?.weightLb ?? ""}
            style={input}
          />
        </label>

        {/* Age */}
        <label style={label}>
          Age
          <input
            ref={ageRef}
            name="age"
            type="number"
            min={0}
            max={120}
            defaultValue={initial?.age ?? ""}
            readOnly={dobValid}
            style={input}
            aria-invalid={!!fieldErr.age}
          />
          {fieldErr.age && <div style={errText}>{fieldErr.age}</div>}
        </label>

        {/* DOB + Private */}
        <label style={label}>
          Date of Birth
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={dobRef}
              name="dob"
              type="text"
              placeholder="mm/dd/yyyy"
              defaultValue={initial?.dob ?? ""}
              onChange={onDobInputChange}
              style={{ ...input, flex: "1 1 auto" }}
              aria-invalid={!!fieldErr.dob}
            />
            <label
              title="By checking Private, this information will not be viewable on your public profile page."
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <input
                name="dobPrivate"
                type="checkbox"
                defaultChecked={initial?.dobPrivate ?? true}
                ref={dobPrivateRef}
              />{" "}
              <span>Private</span>
            </label>
          </div>
          {fieldErr.dob && <div style={errText}>{fieldErr.dob}</div>}
        </label>

        {/* Gender (Male/Female only) */}
        <label style={label}>
          Gender
          <select
            name="gender"
            defaultValue={initial?.gender ?? ""}
            ref={genderRef}
            style={input}
            aria-invalid={!!fieldErr.gender}
          >
            <option value="">— select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {fieldErr.gender && <div style={errText}>{fieldErr.gender}</div>}
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={busy} style={button}>
          {busy ? "Saving..." : "Save"}
        </button>
        {status && (
          <span
            style={{
              marginTop: 8,
              color: status === "Saved!" ? "green" : "crimson",
              fontWeight: 700,
              opacity: status === "Saved!" ? (savedVisible ? 1 : 0) : 1,
              transition: status === "Saved!" ? "opacity 400ms ease" : undefined,
            }}
          >
            {status}
          </span>
        )}
      </div>
    </form>
  );
}

const wrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  maxWidth: 700,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 12,
};

const label: React.CSSProperties = { fontSize: 14, color: "#0f172a", display: "grid", gap: 6 };
const input: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
};
const button: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 700,
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
};
const errText: React.CSSProperties = {
  marginTop: 4,
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 600,
};

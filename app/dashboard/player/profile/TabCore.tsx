// app/dashboard/player/profile/TabCore.tsx
"use client";

import React from "react";

export type CorePayload = {
  firstName: string;
  lastName: string;
  email: string;
  emailPrivate: boolean;
  phone: string;
  phonePrivate: boolean;

  hometownCity: string;
  hometownState: string;

  heightFt: string;
  heightIn: string;
  weightLb: string;
  age: string;
  dob: string;
  dobPrivate: boolean;
  gender: string;
  photoPreview: string | null; // persisted preview/permanent URL managed by parent
};

export type CoreHandle = { getPayload: () => CorePayload };

type FieldErr = {
  phone?: string;
  age?: string;
  dob?: string;
  heightIn?: string;
  gender?: string;
};

type Props = {
  /** Needed for upload route (server saves to User.photoUrl by slug or email-local) */
  userSlug: string;
    readOnlyTeamAdmin?: boolean;

  // values
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  emailPrivate: boolean;
  phonePrivate: boolean;

  hometownCity: string;
  hometownState: string;

  /** Selected file (from file input) */
  photoFile: File | null;
  /** Current preview/permanent URL (shown in the preview box) */
  photoPreview: string | null;

  /** Whole-form submitting state */
  submitting: boolean;
  /** Optional scoped busy state for the upload button (if you track it separately) */
  uploadingPhoto?: boolean;
  /** True while a large image is being compressed client-side */
  optimizingPhoto?: boolean;
  /** Friendly message after optimization completes */
  photoInfoMsg?: string | null;

  /** Provided by the parent (compute with useEffect in page.tsx) */
  isMobile: boolean;

  // height/weight
  heightFt: string;
  heightIn: string;
  weightLb: string;

  // age/dob/gender
  age: string;
  dob: string;
  dobPrivate: boolean;
  gender: string;

  fieldErr: FieldErr;
  GENDER_OPTIONS: readonly ("Male" | "Female")[];
  US_STATE_ABBRS: readonly string[];

  // handlers
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;

  setEmailPrivate: (v: boolean) => void;
  onPhoneChange: (v: string) => void;
  setPhonePrivate: (v: boolean) => void;

  setHometownCity: (v: string) => void;
  setHometownState: (v: string) => void;

  onPickPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPhoto: (userSlug: string) => void | Promise<void>;
  onRemovePhoto: () => void | Promise<void>;

  setHeightFt: (v: string) => void;
  setHeightIn: (v: string) => void;
  setWeightLb: (v: string) => void;

  setAge: (v: string) => void;
  onDobChange: (v: string) => void;
  isDobValid: (dob: string) => boolean;
  setDobPrivate: (v: boolean) => void;
  setGender: (v: string) => void;

  // refs
  phoneRef: React.RefObject<HTMLInputElement | null>;
  heightInRef: React.RefObject<HTMLInputElement | null>;
  ageRef: React.RefObject<HTMLInputElement | null>;
  dobRef: React.RefObject<HTMLInputElement | null>;
  genderRef: React.RefObject<HTMLSelectElement | null>;

  // styles (reuse the exact objects you already have in page.tsx)
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  inputStyle: React.CSSProperties;
  hrStyle: React.CSSProperties;
  errText: React.CSSProperties;
  qMark: React.CSSProperties;
};

const TabCore = React.forwardRef<CoreHandle, Props>(function TabCore(props, ref) {
  // expose payload for atomic save
  React.useImperativeHandle(ref, () => ({
    getPayload: () => ({
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      emailPrivate: props.emailPrivate,
      phone: props.phone,
      phonePrivate: props.phonePrivate,
      hometownCity: props.hometownCity,
      hometownState: props.hometownState,
      heightFt: props.heightFt,
      heightIn: props.heightIn,
      weightLb: props.weightLb,
      age: props.age,
      dob: props.dob,
      dobPrivate: props.dobPrivate,
      gender: props.gender,
      photoPreview: props.photoPreview ?? null,
    }),
  }));

  const {
      // NEW
      userSlug,
      readOnlyTeamAdmin = false,

    // values
    firstName,
    lastName,
    email,
    emailPrivate,
    phone,
    phonePrivate,
    hometownCity,
    hometownState,
    photoPreview,
    photoFile,
    submitting,
    uploadingPhoto,
    optimizingPhoto,
    photoInfoMsg,
    isMobile,
    heightFt,
    heightIn,
    weightLb,
    age,
    dob,
    dobPrivate,
    gender,
    fieldErr,
    GENDER_OPTIONS,
    US_STATE_ABBRS,

    // handlers
    setFirstName,
    setLastName,
    setEmail,
    setEmailPrivate,
    onPhoneChange,
    setPhonePrivate,
    setHometownCity,
    setHometownState,
    onRemovePhoto,
    onPickPhoto,
    onUploadPhoto,
    setHeightFt,
    setHeightIn,
    setWeightLb,
    setAge,
    onDobChange,
    isDobValid,
    setDobPrivate,
    setGender,

    // refs
    phoneRef,
    heightInRef,
    ageRef,
    dobRef,
    genderRef,

    // styles
    labelStyle,
    labelText,
    inputStyle,
    hrStyle,
    errText,
    qMark,
  } = props;

  const coreLocked = readOnlyTeamAdmin;
  const uploadBusy = Boolean(uploadingPhoto || submitting);
  const uploadDisabled = !photoFile || uploadBusy;
  const removeDisabled = !photoPreview || uploadBusy;

  return (
    <>
      {/* Email + Phone (top row) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Email</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="email"
              disabled={coreLocked}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...inputStyle, flex: "1 1 auto" }}
              autoComplete="email"
            />
            <label title="By checking Private, this information will not be viewable on your public profile page.">
              <input
                type="checkbox"
                checked={!!emailPrivate}
                disabled={coreLocked}
                onChange={(e) => setEmailPrivate(e.target.checked)}
              />{" "}
              Private <span style={qMark}>?</span>
            </label>
          </div>
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Phone</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={phoneRef}
              disabled={coreLocked}
              inputMode="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              style={{ ...inputStyle, flex: "1 1 auto" }}
              aria-invalid={!!fieldErr.phone}
              autoComplete="tel"
            />
            <label title="By checking Private, this information will not be viewable on your public profile page.">
              <input
                type="checkbox"
                checked={!!phonePrivate}
                disabled={coreLocked}
                onChange={(e) => setPhonePrivate(e.target.checked)}
              />{" "}
              Private <span style={qMark}>?</span>
            </label>
          </div>
          {fieldErr.phone && <div style={errText}>{fieldErr.phone}</div>}
        </label>
      </div>

      <hr style={hrStyle} />

      {/* First + Last name */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>First Name</span>
          <input
            value={firstName}
            disabled={coreLocked}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            style={{ ...inputStyle, flex: "1 1 auto" }}
            autoComplete="given-name"
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Last Name</span>
          <input
            value={lastName}
            disabled={coreLocked}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            style={{ ...inputStyle, flex: "1 1 auto" }}
            autoComplete="family-name"
          />
        </label>
      </div>

      <hr style={hrStyle} />

      {/* Hometown City / State */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Hometown City</span>
          <input
            value={hometownCity}
            disabled={coreLocked}
            onChange={(e) => setHometownCity(e.target.value)}
            placeholder="Hometown City"
            style={{ ...inputStyle, flex: "1 1 auto" }}
            autoComplete="address-level2"
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Hometown State</span>
          <select
            value={hometownState}
            disabled={coreLocked}
            onChange={(e) => setHometownState(e.target.value)}
            style={inputStyle}
          >
            <option value="">State</option>
            {US_STATE_ABBRS.map((abbr) => (
              <option key={abbr} value={abbr}>
                {abbr}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr style={hrStyle} />

      {/* Profile Photo */}
      <section>
        <h2 style={{ ...labelText, margin: "0 0 8px 0" }}>Profile Photo</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 140,
              height: 140,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#94a3b8",
            }}
          >
            {photoPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Selected profile preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  disabled={coreLocked || removeDisabled}
                  title="Remove photo"
                  aria-label="Remove photo"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: "1px solid #0ea5e9",
                    background: "#ffffff",
                    lineHeight: 1,
                    fontWeight: 800,
                    color: "#b91c1c",
                    cursor: removeDisabled ? "not-allowed" : "pointer",
                    opacity: removeDisabled ? 0.6 : 1,
                  }}
                >
                  ×
                </button>
              </>
            ) : (
              "No Photo"
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              disabled={coreLocked}
              // Mobile can open camera roll easily with image/*; desktop constrains to common web formats
              accept={isMobile ? "image/*" : "image/png,image/jpeg,image/webp"}
              onChange={onPickPhoto}
              style={{ maxWidth: 320 }}
            />
            <button
              type="button"
              disabled={coreLocked || uploadDisabled}
              onClick={() => onUploadPhoto(userSlug)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #0ea5e9",
                background: "#e0f2fe",
                color: "#083344",
                fontWeight: 800,
                cursor: uploadDisabled ? "not-allowed" : "pointer",
              }}
            >
              {uploadBusy ? "Uploading…" : "Upload Photo"}
            </button>

            {/* Secondary remove action (for accessibility / no preview) */}
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={coreLocked || removeDisabled}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #0ea5e9",
                background: "#ffffff",
                color: "#b91c1c",
                fontWeight: 800,
                cursor: removeDisabled ? "not-allowed" : "pointer",
              }}
            >
              Remove Photo
            </button>

            <span style={{ color: "#64748b", fontSize: 12 }}>
              JPG, PNG, or WEBP up to 75MB.
            </span>
          </div>

          <div style={{ gridColumn: "2 / 3" }}>
            {optimizingPhoto && (
              <div style={{ color: "#0f766e", fontWeight: 600, marginTop: 8 }}>
                Optimizing image…
              </div>
            )}

            {photoInfoMsg && (
              <div style={{ color: "#059669", fontWeight: 600, marginTop: 6 }}>
                {photoInfoMsg}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr style={hrStyle} />

      {/* Height / Weight */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          <span style={labelText}>Height (ft)</span>
          <input
            inputMode="numeric"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value)}
            placeholder="6"
            style={inputStyle}
            autoComplete="off"
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Height (in)</span>
          <input
            ref={heightInRef}
            inputMode="numeric"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
            placeholder="1"
            style={inputStyle}
            aria-invalid={!!fieldErr.heightIn}
            autoComplete="off"
          />
          {fieldErr.heightIn && <div style={errText}>{fieldErr.heightIn}</div>}
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Weight (lb)</span>
          <input
            inputMode="numeric"
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
            placeholder="185"
            style={inputStyle}
            autoComplete="off"
          />
        </label>
      </div>

      {/* Date of Birth / Age / Gender */}
      <hr style={hrStyle} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
        }}
      >
        {/* Date of Birth (with Private) */}
        <label style={labelStyle}>
          <span style={labelText}>Date of Birth</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={dobRef}
              disabled={coreLocked}
              inputMode="numeric"
              value={dob}
              onChange={(e) => onDobChange(e.target.value)}
              placeholder="mm/dd/yyyy"
              style={{ ...inputStyle, flex: "1 1 auto" }}
              aria-invalid={!!fieldErr.dob}
              autoComplete="off"
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                const digits = target.value.replace(/\D/g, "").slice(0, 8);
                const m = digits.slice(0, 2);
                const d = digits.slice(2, 4);
                const y = digits.slice(4, 8);
                let out = m;
                if (d) out += `/${d}`;
                if (y) out += `/${y}`;
                onDobChange(out);
              }}
            />
            <label title="By checking Private, this information will not be viewable on your public profile page.">
              <input
                type="checkbox"
                checked={!!dobPrivate}
                onChange={(e) => setDobPrivate(e.target.checked)}
              />{" "}
              Private <span style={qMark}>?</span>
            </label>
          </div>
          {fieldErr.dob && <div style={errText}>{fieldErr.dob}</div>}
        </label>

        {/* Age (readOnly if DOB valid) */}
        <label style={labelStyle}>
          <span style={labelText}>Age</span>
          <input
            ref={ageRef}
            inputMode="numeric"
            value={age}
            readOnly={coreLocked || isDobValid(dob)}
            onChange={(e) => setAge(e.target.value)}
            placeholder="15"
            style={inputStyle}
            aria-invalid={!!fieldErr.age}
            autoComplete="off"
          />
          {fieldErr.age && <div style={errText}>{fieldErr.age}</div>}
        </label>

        {/* Gender */}
        <label style={labelStyle}>
          <span style={labelText}>Gender</span>
          <select
            ref={genderRef}
            disabled={coreLocked}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={inputStyle}
            aria-invalid={!!fieldErr.gender}
          >
            <option value="">Select…</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {fieldErr.gender && <div style={errText}>{fieldErr.gender}</div>}
        </label>
      </div>
    </>
  );
});

export default TabCore;

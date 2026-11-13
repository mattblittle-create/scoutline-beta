// app/components/college/CollegeSaveStar.tsx

"use client";

import React, { useEffect, useState } from "react";

type Props = {
  collegeId: string;
};

export default function CollegeSaveStar({ collegeId }: Props) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedCollegeIds, setSavedCollegeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isSaved = savedCollegeIds.includes(collegeId);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthAndSaved() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json().catch(() => null);

        const email =
          meData?.email ||
          meData?.user?.email ||
          meData?.data?.email ||
          "";

        const loggedIn = meRes.ok && !!email;

        if (!cancelled) {
          setIsLoggedIn(loggedIn);
          setAuthChecked(true);
        }

        if (!loggedIn) return;

        const savedRes = await fetch("/api/player/target-programs", {
          cache: "no-store",
        });

        const savedData = await savedRes.json().catch(() => null);

        if (!cancelled && savedRes.ok && savedData?.ok) {
          const ids = (savedData.saved || [])
            .map((item: any) => item?.collegeId)
            .filter(Boolean);

          setSavedCollegeIds(ids);
        }
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false);
          setAuthChecked(true);
        }
      }
    }

    checkAuthAndSaved();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleSaved() {
    if (!isLoggedIn || saving) return;

    try {
      setSaving(true);

      const res = await fetch("/api/player/target-programs", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collegeId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      setSavedCollegeIds((prev) =>
        isSaved ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
      );
    } catch (err) {
      console.error("COLLEGE_DETAIL_SAVE_ERROR", err);
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked || !isLoggedIn) return null;

  return (
    <button
      type="button"
      title="Click the star icon and save this school to your Target Programs list."
      onClick={toggleSaved}
      disabled={saving}
      style={{
        ...starButtonStyle,
        background: isSaved ? "#caa042" : "transparent",
        borderColor: isSaved ? "#caa042" : "#0ea5e9",
        color: isSaved ? "#0f172a" : "#0ea5e9",
        opacity: saving ? 0.6 : 1,
        cursor: saving ? "not-allowed" : "pointer",
      }}
      aria-label={isSaved ? "Remove from Target Programs" : "Save to Target Programs"}
    >
      ★
    </button>
  );
}

const starButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "2px solid #0ea5e9",
  background: "transparent",
  color: "#0ea5e9",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
  fontWeight: 900,
  lineHeight: 1,
  padding: 0,
};
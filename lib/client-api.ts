// lib/client-api.ts
export async function sendVerification(email: string) {
  const res = await fetch("/api/auth/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Please wait a bit and try again.");
  }
  if (!res.ok) throw new Error("Failed to send verification.");
  return res.json();
}

export async function inviteCoach(payload: {
  program: string;
  inviterName: string;
  emails: string[];
}) {
  const res = await fetch("/api/onboarding/coach/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Too many invites. Please try again later.");
  }
  if (!res.ok) throw new Error("Failed to send invites.");
  return res.json();
}

// NEW: load profile by email
export async function getProfile(email: string) {
  const url = `/api/account/profile?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load profile.");
  return res.json() as Promise<{ ok: boolean; user?: any; error?: string }>;
}

// NEW: save profile
export async function saveProfile(input: {
  email: string;
  name?: string;
  role?: string;
  program?: string;
  workPhone?: string | null;
  phonePrivate?: boolean;
}) {
  const res = await fetch("/api/account/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Failed to save profile.");
  }
  return data as { ok: true; user: any };
}

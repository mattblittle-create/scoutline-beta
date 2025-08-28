// lib/client-api.ts

// --- Verify email ---
export async function sendVerification(email: string) {
  const res = await fetch("/api/auth/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Too many requests.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send verification.");
  }
  return (await res.json()) as { ok: boolean };
}

// --- Coach invites ---
export type SendCoachInvitesInput = {
  program: string;
  inviterName: string;
  emails: string[];
};

export async function sendCoachInvites(input: SendCoachInvitesInput) {
  const res = await fetch("/api/onboarding/coach/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Too many invites. Please try later.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send invites.");
  }
  return (await res.json()) as { ok: boolean };
}

// --- Save onboarding (basic profile fields) ---
export type SaveCoachOnboardingInput = {
  email: string;
  name?: string;
  role?: string;
  collegeProgram?: string;
};

export async function saveCoachOnboarding(input: SaveCoachOnboardingInput) {
  const res = await fetch("/api/account/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    // server route expects { email, ...fields }, including slug later if you pass it
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      role: input.role,
      program: input.collegeProgram,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to save onboarding.");
  }
  return (await res.json()) as { ok: boolean };
}

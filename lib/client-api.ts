// lib/client-api.ts

export type SaveCoachOnboardingInput = {
  email: string;
  name?: string;
  role?: string;
  collegeProgram?: string;
};

export async function sendVerification(email: string) {
  const res = await fetch("/api/auth/send-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Too many requests. Please try again later.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send verification email.");
  }
  return (await res.json()) as { ok: true };
}

export async function sendCoachInvites(program: string, inviterName: string, emails: string[]) {
  const res = await fetch("/api/onboarding/coach/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program, inviterName, emails }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Too many invites. Please try again later.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send invites.");
  }
  return (await res.json()) as { ok: true };
}

export async function saveCoachOnboarding(input: SaveCoachOnboardingInput) {
  const res = await fetch("/api/onboarding/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to save onboarding.");
  }
  return (await res.json()) as { ok: true };
}

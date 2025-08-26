// lib/client-api.ts
export type CoachFormPayload = {
  name: string;
  role: string;
  collegeProgram: string;
  workEmail: string;
  workPhone?: string;
  phonePrivate: boolean;
  inviteEmails: string[];
};

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export function saveCoachOnboarding(payload: CoachFormPayload) {
  return postJSON<{ ok: true }>("/api/onboarding/coach", payload);
}

export function sendVerification(email: string) {
  return postJSON<{ ok: true }>("/api/auth/send-verification", { email });
}

export function sendInvites(program: string, inviterName: string, emails: string[]) {
  return postJSON<{ ok: true } | { ok: false }>(
    "/api/onboarding/coach/invite",
    { program, inviterName, emails }
  );
}

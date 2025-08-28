// lib/client-api.ts
export type ApiOk = { ok: true; [k: string]: any };
export type ApiErr = { ok: false; error: string; [k: string]: any };

async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // friendlier 429 UX where applicable
  if (res.status === 429) {
    let msg = "Please wait a minute and try again.";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

/** Send verification email */
export async function sendVerification(email: string): Promise<ApiOk> {
  const data = await postJSON<ApiOk | ApiErr>("/api/auth/send-verification", { email });
  if (!("ok" in data) || !data.ok) throw new Error((data as ApiErr).error || "Failed to send verification");
  return data;
}

/** Invite coaches to a program */
export async function sendCoachInvites(opts: {
  program: string;
  inviterName: string;
  emails: string[];
}): Promise<ApiOk> {
  const data = await postJSON<ApiOk | ApiErr>("/api/onboarding/coach/invite", opts);
  if (!("ok" in data) || !data.ok) throw new Error((data as ApiErr).error || "Failed to send invites");
  return data;
}

/** Back-compat alias some pages may import */
export const sendInvites = sendCoachInvites;

/** Save coach onboarding payload (calls your /api/onboarding/coach route when added) */
export async function saveCoachOnboarding(payload: any): Promise<ApiOk> {
  const data = await postJSON<ApiOk | ApiErr>("/api/onboarding/coach", payload);
  if (!("ok" in data) || !data.ok) throw new Error((data as ApiErr).error || "Failed to save onboarding");
  return data;
}

// lib/client-api.ts

//
// Shared types
//
export type SaveCoachOnboardingInput = {
  email: string;
  name: string;
  role: string;
  collegeProgram: string;
  workPhone?: string;
  phonePrivate?: boolean;
};

type JsonOK = { ok: true };
type JsonErr = { ok: false; error?: string };

//
// Small fetch helper so all calls behave consistently
//
async function postJSON<T = any>(
  url: string,
  body: unknown,
  opts?: { handle429Msg?: string; defaultErr?: string }
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Try to parse JSON either way
  const data = (await res.json().catch(() => ({}))) as Record<string, any>;

  if (res.status === 429) {
    // Friendly rate-limit message
    const msg =
      data?.error ||
      opts?.handle429Msg ||
      "Too many requests. Please try again later.";
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = data?.error || opts?.defaultErr || "Request failed.";
    throw new Error(msg);
  }

  return data as T;
}

//
// API wrappers
//

/**
 * Send a verification email to a single address.
 * Throws on failure (including 429).
 */
export async function sendVerification(email: string): Promise<JsonOK> {
  return await postJSON<JsonOK>("/api/auth/send-verification", { email }, {
    handle429Msg: "Too many requests. Please try again in a minute.",
    defaultErr: "Failed to send verification email.",
  });
}

/**
 * Send coach invites (rate-limited server-side).
 * Expects program name, inviter name, and an array of emails.
 * Throws on failure (including 429).
 */
export async function sendCoachInvites(
  program: string,
  inviterName: string,
  emails: string[]
): Promise<JsonOK> {
  return await postJSON<JsonOK>("/api/onboarding/coach/invite", {
    program,
    inviterName,
    emails,
  }, {
    handle429Msg: "Too many invites. Please wait a bit and retry.",
    defaultErr: "Failed to send invites.",
  });
}

/**
 * Save the coach onboarding payload.
 * Throws on failure.
 */
export async function saveCoachOnboarding(
  input: SaveCoachOnboardingInput
): Promise<JsonOK> {
  return await postJSON<JsonOK>("/api/onboarding/coach", input, {
    defaultErr: "Failed to save onboarding.",
  });
}

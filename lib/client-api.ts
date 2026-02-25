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

export type SaveTeamOnboardingInput = {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string; // digits only (10) preferred
  adminPhoneExt?: string; // digits only (<=6)
  phonePrivate?: boolean;

  teamName: string;
  city: string;
  state: string;
  website?: string | null;
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
  return await postJSON<JsonOK>(
    "/api/auth/send-verification",
    { email },
    {
      handle429Msg: "Too many requests. Please try again in a minute.",
      defaultErr: "Failed to send verification email.",
    }
  );
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
  return await postJSON<JsonOK>(
    "/api/onboarding/coach/invite",
    { program, inviterName, emails },
    {
      handle429Msg: "Too many invites. Please wait a bit and retry.",
      defaultErr: "Failed to send invites.",
    }
  );
}

/**
 * Save the coach onboarding payload.
 * Throws on failure.
 */
export async function saveCoachOnboarding(
  input: SaveCoachOnboardingInput
): Promise<JsonOK> {
  // NOTE: This endpoint is correct and should remain:
  // - /api/onboarding/coach returns set-password token/link as needed
  return await postJSON<JsonOK>("/api/onboarding/coach", input, {
    defaultErr: "Failed to save onboarding.",
  });
}

/**
 * Save the team onboarding payload.
 * Throws on failure.
 *
 * This aligns with the new Teams onboarding flow:
 * - POST /api/onboarding/team creates the TEAM_ADMIN user + team and returns set-password token/link
 */
export async function saveTeamOnboarding(
  input: SaveTeamOnboardingInput
): Promise<{ ok: true; data: any } & Record<string, any>> {
  return await postJSON<{ ok: true; data: any }>("/api/onboarding/team", input, {
    defaultErr: "Failed to save team onboarding.",
  });
}

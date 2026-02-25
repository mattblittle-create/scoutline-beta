import { NextResponse } from "next/server";

type Body = {
  plan?: string | null;          // "redshirt" | "walk-on" | "all-american"
  username?: string | null;      // legacy: player email prefilled into "username"
  email?: string | null;         // preferred
  password?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function normalizeText(v: any): string {
  return String(v || "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePassword(pw: string): string | null {
  if (!pw || typeof pw !== "string") return "Password is required.";
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  // symbol = anything not letter/number/space (tolerant)
  if (!/[^A-Za-z0-9\s]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json().catch(() => ({} as any));

    const plan = normalizeText(body?.plan);
    const email = normalizeEmail(body?.email ?? body?.username);
    const password = normalizeText(body?.password);

    // Plan guard (player only)
    const allowedPlans = new Set(["redshirt", "walk-on", "all-american"]);
    if (!allowedPlans.has(plan)) {
      return jsonError("Invalid player plan.");
    }

    if (!email) return jsonError("Email is required.");
    if (!isEmail(email)) return jsonError("Email is invalid.");

    const pwErr = validatePassword(password);
    if (pwErr) return jsonError(pwErr);

    // DO NOT log passwords
    console.log("[onboarding] player password accepted", {
      plan,
      email,
      passwordLen: password.length,
    });

    // Optional: mark onboarding draft as passwordSet=true (never store the password)
    try {
      const mod = await import("@/lib/prisma").catch(() => null);
      const prisma: any = (mod as any)?.prisma ?? (mod as any)?.default ?? null;

      if (prisma?.onboardingDraft?.upsert) {
        await prisma.onboardingDraft.upsert({
          where: { email },
          create: {
            email,
            kind: "PLAYER",
            plan,
            payload: { email, plan, passwordSet: true },
          },
          update: {
            plan,
            payload: { email, plan, passwordSet: true },
          },
        });
      }
    } catch {
      // swallow — onboarding should still work while schema is evolving
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[onboarding] player password error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

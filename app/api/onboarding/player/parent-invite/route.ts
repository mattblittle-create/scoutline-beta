// app/api/onboarding/player/parent-invite/route.ts
import { NextResponse } from "next/server";

function isEmail(v: any) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const plan = body?.plan ?? null;
    const playerEmail = body?.playerEmail ?? null;
    const parentEmail = body?.parentEmail ?? null;

    // NOTE: Stub only. Later: send parent setup email + create pending parent user record.
    console.log("[onboarding] parent invite stub", {
      plan,
      playerEmail,
      parentEmail,
      valid: isEmail(playerEmail) && isEmail(parentEmail),
    });

    // Keep it permissive for testing; still return ok:true.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[onboarding] parent invite stub error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

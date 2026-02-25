// app/api/onboarding/player/payment/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // NOTE: Stub only. Later: tokenize + create subscription in Valor Pay/NMI, apply 3% card fee, etc.
    console.log("[onboarding] player payment stub", {
      plan: body?.plan ?? null,
      username: body?.username ?? null,
      cadence: body?.cadence ?? null, // monthly | annual
      method: body?.method ?? null,   // card | ach
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[onboarding] player payment stub error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

// app/api/onboarding/player/parent-invite/route.ts
import { NextResponse } from "next/server";
import { sendPlayerParentInvite } from "@/lib/email/sendPlayerParentInvite";

function isEmail(v: any) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normalize(v: any) {
  return String(v ?? "").trim();
}

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeBilling(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "annual" || s === "yearly") return "annual";
  return "monthly";
}

function normalizeInternalishUrl(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const plan = normalize(body?.plan);
    const billing = normalizeBilling(body?.billing ?? body?.cadence);
    const playerEmail = normalizeEmail(body?.playerEmail);
    const parentEmail = normalizeEmail(body?.parentEmail);
    const playerFirstName = normalize(body?.playerFirstName ?? body?.firstName);
    const playerLastName = normalize(body?.playerLastName ?? body?.lastName);
    const incomingSetupUrl = normalizeInternalishUrl(body?.setupUrl);
    const teamName = normalize(body?.teamName);

    if (!isEmail(playerEmail)) {
      return NextResponse.json(
        { ok: false, error: "Valid player email is required." },
        { status: 400 }
      );
    }

    if (!isEmail(parentEmail)) {
      return NextResponse.json(
        { ok: false, error: "Valid parent email is required." },
        { status: 400 }
      );
    }

    if (playerEmail === parentEmail) {
  return NextResponse.json(
    { ok: false, error: "Parent email must be different from player email." },
    { status: 400 }
  );
}

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const fallbackSetupUrl =
      `${baseUrl}/onboarding/parent/password` +
      `?email=${encodeURIComponent(parentEmail)}` +
      `&playerEmail=${encodeURIComponent(playerEmail)}` +
      `&playerFirstName=${encodeURIComponent(playerFirstName)}` +
      `&playerLastName=${encodeURIComponent(playerLastName)}` +
      `&plan=${encodeURIComponent(plan || "")}` +
      `&billing=${encodeURIComponent(billing)}`;

    const setupUrl = incomingSetupUrl || fallbackSetupUrl;

    const result = await sendPlayerParentInvite({
      to: parentEmail,
      playerFirstName,
      playerLastName,
      playerEmail,
      plan,
      billing,
      teamName,
      setupUrl,
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      id: (result as any)?.data?.id ?? null,
      setupUrl,
    });
  } catch (err: any) {
    console.error("[onboarding] parent invite error", {
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
    });

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}
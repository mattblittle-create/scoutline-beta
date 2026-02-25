import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const plan = String(body?.plan || "").trim().toLowerCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const parentEmail = String(body?.parentEmail || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Player email is required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone is required." }, { status: 400 });
    }
    if (!firstName) {
      return NextResponse.json({ ok: false, error: "First name is required." }, { status: 400 });
    }
    if (!lastName) {
      return NextResponse.json({ ok: false, error: "Last name is required." }, { status: 400 });
    }
    if (!parentEmail) {
      return NextResponse.json({ ok: false, error: "Parent email is required." }, { status: 400 });
    }

    // Minimal plan validation (optional)
    const allowedPlans = new Set(["redshirt", "walk-on", "all-american"]);
    if (plan && !allowedPlans.has(plan)) {
      return NextResponse.json({ ok: false, error: "Invalid player plan." }, { status: 400 });
    }

    // STUB: later you’ll persist this into your DB (Prisma) and/or user onboarding table
    console.log("[onboarding] player core stub", {
      plan: plan || null,
      email,
      phone,
      firstName,
      lastName,
      parentEmail,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[onboarding] player core stub error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}

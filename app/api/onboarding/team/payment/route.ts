import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "This endpoint has been retired. Teams onboarding no longer posts payment selections to /api/onboarding/team/payment.",
      hint: {
        current: "Teams onboarding uses /api/onboarding/team for account setup + password link.",
        payment: "When billing is wired for Teams, route payment to the active billing endpoints (e.g., /api/billing/*) or your team onboarding payment endpoint.",
      },
    },
    { status: 410 }
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}

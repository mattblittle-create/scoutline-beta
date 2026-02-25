import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "This endpoint has been retired. Teams onboarding now uses the email set-password flow (/auth/set-password) and does not accept passwords via /api/onboarding/team/password.",
      hint: {
        use: "/api/onboarding/team (creates set-password token/link)",
        then: "/auth/set-password?token=... (user sets password)",
        login: "/login?role=team",
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

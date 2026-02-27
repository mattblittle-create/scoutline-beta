// app/api/player/billing/update/cancel/route.ts
import { NextResponse } from "next/server";

/**
 * Legacy endpoint shim.
 * Prefer: /api/player/billing/cancel
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Deprecated endpoint. Use /api/player/billing/cancel." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Use POST. Deprecated endpoint." },
    { status: 405 }
  );
}
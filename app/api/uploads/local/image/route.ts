// app/api/uploads/local/image/route.ts
import { NextResponse } from "next/server";

/**
 * Legacy/local-only shim.
 * In production we use blob/remote routes; this endpoint is disabled.
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Local upload image route is disabled in production." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Local upload image route is disabled in production." },
    { status: 410 }
  );
}
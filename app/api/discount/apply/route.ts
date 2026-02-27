// app/api/discount/apply/route.ts
import { NextResponse } from "next/server";

/**
 * Deprecated endpoint shim.
 * Use /api/billing/discount/apply instead.
 *
 * Keeping this file as a real module prevents TS "not a module" failures in Vercel builds.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Deprecated endpoint. Use /api/billing/discount/apply.",
    },
    { status: 410 }
  );
}
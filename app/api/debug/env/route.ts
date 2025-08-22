// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

// Force Node runtime and no prerender
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    has_RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: process.env.EMAIL_FROM || null,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || null,
    runtime: "nodejs",
  });
}

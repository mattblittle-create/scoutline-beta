// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasKey = !!process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || null;

  const dbUrl = process.env.DATABASE_URL || "";
  const hasDb = !!dbUrl;
  let dbKind: string | null = null;

  try {
    if (dbUrl) {
      // Handles postgres://..., mysql://..., file:./prisma/dev.db, etc.
      if (dbUrl.startsWith("file:")) {
        dbKind = "sqlite";
      } else {
        const u = new URL(dbUrl);
        dbKind = u.protocol.replace(":", "") || null;
      }
    }
  } catch {
    dbKind = null;
  }

  return NextResponse.json({
    has_RESEND_API_KEY: hasKey,
    EMAIL_FROM: emailFrom,
    NEXT_PUBLIC_BASE_URL: base,
    has_DATABASE_URL: hasDb,
    DATABASE_KIND: postgres,
    runtime: "nodejs",
    vercel_env: process.env.VERCEL_ENV || null,
  });
}

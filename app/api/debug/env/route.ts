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
  if (hasDb) {
    try {
      const u = new URL(dbUrl);
      // Normalize protocol (“postgres:” -> “postgres”, “file:” -> “file”)
      const proto = (u.protocol || "").replace(":", "");
      // Map “file” to sqlite, otherwise use protocol (postgres, postgresql, mysql, etc.)
      dbKind = proto === "file" ? "sqlite" : proto || null;
    } catch {
      // Fallback if DATABASE_URL can’t be parsed as a URL
      dbKind = dbUrl.startsWith("file:") ? "sqlite" : null;
    }
  }

  return NextResponse.json({
    has_RESEND_API_KEY: hasKey,
    EMAIL_FROM: emailFrom,
    NEXT_PUBLIC_BASE_URL: base,
    has_DATABASE_URL: hasDb,
    DATABASE_KIND: dbKind, // <- string like "postgres", "sqlite", etc.
    runtime: "nodejs",
    vercel_env: process.env.VERCEL_ENV || null,
  });
}

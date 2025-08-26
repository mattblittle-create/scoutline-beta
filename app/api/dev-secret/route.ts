// app/api/debug/dev-secret/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const val = process.env.DEV_ISSUE_TOKEN_SECRET || "";
  return NextResponse.json({
    present: !!val,
    length: val.length,
    start: val.slice(0, 3),
    end: val.slice(-3),
  });
}

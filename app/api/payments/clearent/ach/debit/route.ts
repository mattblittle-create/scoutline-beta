import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Retain historical ACH webhooks and records; never create another bank debit.
export async function POST() {
  return NextResponse.json({ ok: false, code: "ACH_RETIRED", error: "Bank-account payments are no longer available. Use a debit or credit card." }, { status: 410 });
}

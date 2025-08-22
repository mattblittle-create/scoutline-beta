// app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { sendEmail, wrapHtml } from "@/lib/email";

export async function GET() {
  const to = process.env.TEST_EMAIL_TO || process.env.EMAIL_FROM!;
  try {
    await sendEmail(
      to,
      "ScoutLine test",
      wrapHtml(`<p>Hello from /api/test-email</p>`)
    );
    return NextResponse.json({ ok: true, to });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "send failed" }, { status: 500 });
  }
}

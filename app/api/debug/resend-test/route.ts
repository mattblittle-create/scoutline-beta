// app/api/debug/resend-test/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const payload = {
      from: "ScoutLine <onboarding@myscoutline.com>",
      to: ["delivered@resend.dev"],
      subject: "ScoutLine Resend Raw API Test",
      html: "<strong>This is a raw Resend API test from ScoutLine.</strong>",
      text: "ScoutLine raw Resend API test",
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "ScoutLine-Debug/1.0",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    console.log("RESEND RAW STATUS:", response.status);
    console.log("RESEND RAW BODY:", parsed);

    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        payload,
        result: parsed,
      },
      { status: response.ok ? 200 : 500 }
    );
  } catch (err: any) {
    console.error("RESEND RAW ERROR FULL:", err);
    console.error("RESEND RAW ERROR MESSAGE:", err?.message);
    console.error("RESEND RAW ERROR CAUSE:", err?.cause);
    console.error("RESEND RAW ERROR STACK:", err?.stack);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
        cause:
          err?.cause && typeof err.cause === "object"
            ? {
                name: err.cause.name,
                message: err.cause.message,
                code: err.cause.code,
                errno: err.cause.errno,
                syscall: err.cause.syscall,
                hostname: err.cause.hostname,
              }
            : err?.cause ?? null,
      },
      { status: 500 }
    );
  }
}
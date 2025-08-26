// app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";
import { limitOrThrow } from "@/lib/limiter";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // ✅ Rate limit by IP + email combo
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await limitOrThrow(`verify:${ip}:${email.toLowerCase()}`);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // ✅ Generate verification link
    const link = `${baseUrl}/auth/verify?email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email",
      html: `
        <p>Click below to verify your email:</p>
        <p><a href="${link}">${link}</a></p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.status === 429) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 429 });
    }
    console.error("send-verification error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

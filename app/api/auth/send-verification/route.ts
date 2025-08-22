// app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    // Ensure required env vars
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const appSecret = process.env.APP_SECRET;
    if (!appSecret) {
      return NextResponse.json({ ok: false, error: "Missing APP_SECRET" }, { status: 500 });
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    // Create a short-lived JWT containing the email
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(appSecret);
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(secret);

    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

    // Send the email via Resend (lazy import)
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email for ScoutLine",
      html: `
        <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 8px;">Verify your email</h2>
          <p>Click the button below to verify your email and continue.</p>
          <p>
            <a href="${verifyUrl}"
               style="display:inline-block;background:#caa042;color:#0f172a;text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;border:1px solid #caa042">
               Verify Email
            </a>
          </p>
          <p style="font-size:14px;color:#64748b">This link expires in 30 minutes.</p>
          <p style="font-size:12px;color:#64748b;word-break:break-all">${verifyUrl}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send-verification error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

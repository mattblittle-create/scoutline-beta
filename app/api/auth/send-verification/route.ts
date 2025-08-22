// app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { email: string };

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as Body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const secretB64 = process.env.APP_SECRET;
    if (!secretB64) {
      return NextResponse.json({ ok: false, error: "Missing APP_SECRET" }, { status: 500 });
    }
    const secret = Buffer.from(secretB64, "base64url"); // we’ve been storing base64 in .env

    // Build the token with purpose "set-password"
    const { SignJWT } = await import("jose");
    const token = await new SignJWT({
      email: normalizedEmail,
      purpose: "set-password",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const verifyUrl = `${baseUrl}/set-password?token=${encodeURIComponent(token)}`;

    // Send the email
    const { Resend } = await import("resend");
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from,
      to: normalizedEmail,
      subject: "Verify your email to set your ScoutLine password",
      html: `
        <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 8px;">Set your password</h2>
          <p>Click the button below to set your password:</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#caa042;color:#0f172a;
              text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;border:1px solid #caa042">
              Set Password
            </a>
          </p>
          <p style="color:#64748b;font-size:14px">This link expires in 1 hour.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send-verification error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

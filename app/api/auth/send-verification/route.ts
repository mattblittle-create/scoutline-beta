// app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/hash";

// Ensure Node runtime for crypto & prisma
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email?: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as Body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ ok: false, error: "Email service not configured" }, { status: 500 });
    }

    // 1) Build JWT
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60; // 1 hour
    const token = await new SignJWT({ email, purpose: "set-password" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(getSecret());

    // 2) Persist a hashed, single-use record
    const tokenHash = sha256(token);
    const id = crypto.randomUUID(); // primary key for VerificationToken
    await prisma.verificationToken.create({
      data: {
        id,
        email,
        tokenHash,
        purpose: "SET_PASSWORD",      // Prisma enum
        expiresAt: new Date(exp * 1000),
      },
    });

    // 3) Send the email with Resend
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const verifyUrl = `${baseUrl}/set-password?token=${encodeURIComponent(token)}`;

    await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email to set your ScoutLine password",
      html: `
        <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 8px;">Set your password</h2>
          <p>Click the button below to verify your email and set your password.</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#caa042;color:#0f172a;text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;border:1px solid #caa042">Set Password</a>
          </p>
          <p style="color:#64748b;font-size:14px">This link expires in 1 hour and can be used only once.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("send-verification error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

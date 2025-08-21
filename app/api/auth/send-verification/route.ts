// /app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";
import { signVerifyToken } from "@/lib/auth-tokens";
import { sendEmail, wrapHtml } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const token = signVerifyToken(email); // 30 minutes by default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

  const html = wrapHtml(`
    <p>Confirm your email to finish setting up your ScoutLine account.</p>
    <p><a href="${verifyUrl}">Verify Email</a></p>
    <p style="color:#64748b">This link expires in 30 minutes.</p>
  `);

  await sendEmail(email, "Verify your email", html);

  return NextResponse.json({ ok: true });
}

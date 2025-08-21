import { NextResponse } from "next/server";
import { signVerifyTokenAsync } from "@/lib/auth-tokens";
import { sendEmail, wrapHtml } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const token = await signVerifyTokenAsync(email); // 30 mins default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify?token=${encodeURIComponent(token)}`;

  const html = wrapHtml(`
    <p>Confirm your email to finish setting up your ScoutLine account.</p>
    <p><a href="${verifyUrl}">Verify Email</a></p>
    <p>This link expires in 30 minutes.</p>
  `);

  await sendEmail(email, "Verify your email", html);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { sendEmail, wrapHtml } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const token = createEmailVerificationToken(email, 60 * 30); // 30 min
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

    const html = wrapHtml(`
      <p>Confirm your email to finish setting up your ScoutLine account.</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p style="color:#64748b;font-size:14px;margin-top:12px;">This link expires in 30 minutes.</p>
    `);

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to send verification email" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("RESEND_API_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Email service not configured" },
        { status: 500 }
      );
    }

    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const resend = new Resend(key);

    // TODO: put your real verification link here
    const html = `<p>Click to verify: <a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/verify?email=${encodeURIComponent(
      email
    )}">Verify</a></p>`;

    await resend.emails.send({ from, to: email, subject: "Verify your email", html });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}

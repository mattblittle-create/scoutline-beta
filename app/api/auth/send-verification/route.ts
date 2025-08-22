// app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      // Helpful error for logs without crashing the build
      console.error("RESEND_API_KEY is missing");
      return NextResponse.json({ ok: false, error: "Email service not configured" }, { status: 500 });
    }

    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const resend = new Resend(key); // ✅ instantiate here

    // send the email
    await resend.emails.send({
      from,
      to: email,
      subject: "Verify your email",
      html: `<p>Click the link we sent to verify your email.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}

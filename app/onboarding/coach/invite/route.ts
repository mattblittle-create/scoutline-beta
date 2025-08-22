import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { emails, programName, inviterName, inviterEmail } = await req.json() as {
      emails: string[];
      programName?: string;
      inviterName?: string;
      inviterEmail?: string;
    };

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No invite emails provided" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Send invites, one email at a time
    for (const email of emails) {
      // Build CTA that PREFILLS email + program for the onboarding form
      const search = new URLSearchParams({
        prefillEmail: email,
        prefillCollege: programName || "",
      });
      const ctaUrl = `${baseUrl}/onboarding/coach?plan=coach${search.toString()}`;

      const subject = `You're invited to join ${programName || "a program"} on ScoutLine`;
      const bodyHtml = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a">
          <div style="max-width:560px;margin:24px auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
            <h1 style="margin:0 0 12px;font-size:18px">ScoutLine</h1>
            <p style="margin:0 0 10px">
              ${inviterName ? `<strong>${inviterName}</strong>` : "A colleague"} ${inviterEmail ? `(${inviterEmail})` : ""} has invited you
              to join ${programName ? `<strong>${programName}</strong>` : "their program"} on ScoutLine.
            </p>
            <p style="margin:0 0 18px">
              Click below to create your account. Your <em>work email</em> and <em>program</em> will be prefilled.
            </p>
            <p style="margin:0 0 18px">
              <a href="${ctaUrl}" style="display:inline-block;background:#caa042;color:#0f172a;text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;border:1px solid #caa042">
                Join ${programName || "on ScoutLine"}
              </a>
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#64748b">
              If you weren’t expecting this, you can ignore this email.
            </p>
          </div>
        </div>
      `;

      if (!process.env.RESEND_API_KEY) {
        console.info("[invite:devlog]", { to: email, subject, preview: bodyHtml.slice(0, 180) + "…" });
      } else {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "no-reply@myscoutline.com",
          to: email,
          subject,
          html: bodyHtml,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}

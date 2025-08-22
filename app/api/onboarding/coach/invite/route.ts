import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { program, inviterName, emails } = await req.json();

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("RESEND_API_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Email service not configured" },
        { status: 500 }
      );
    }

    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const resend = new Resend(key); // <-- instantiate inside the handler

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ ok: true, queued: false });
    }

    const subject = `You're invited to ScoutLine (${program})`;
    const html = `
      <p>${inviterName || "A coach"} invited you to ScoutLine for ${program}.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/onboarding/coach">Finish your onboarding</a></p>
    `;

    // Send in parallel (simple fan-out)
    await Promise.all(
      emails.map((to: string) =>
        resend.emails.send({ from, to, subject, html }).catch((e) => {
          console.error("Invite send failed:", to, e);
        })
      )
    );

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Invite error" }, { status: 500 });
  }
}

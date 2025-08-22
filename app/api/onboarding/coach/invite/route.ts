// app/api/onboarding/coach/invite/route.ts
import { NextResponse } from "next/server";
import { sendEmail, wrapHtml } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { inviterName, program, emails } = await req.json() as {
      inviterName: string;
      program: string;
      emails: string[];
    };

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No invite emails" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const joinUrl = `${baseUrl}/onboarding/coach`; // or a special invite link if you add tokens

    const subject = `You're invited to ${program} on ScoutLine`;
    const html = wrapHtml(`
      <p>${inviterName} invited you to join <strong>${program}</strong> on ScoutLine.</p>
      <p><a href="${joinUrl}">Create your account</a></p>
    `);

    // send one by one (simple + clear logs)
    for (const to of emails) {
      await sendEmail(to, subject, html);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invite failed" }, { status: 400 });
  }
}

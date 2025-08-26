// app/api/onboarding/coach/invite/route.ts
import { NextResponse } from "next/server";
import { limitOrThrow } from "@/lib/limiter";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  program: string;
  inviterName: string;
  emails: string[];
};

export async function POST(req: Request) {
  try {
    const { program, inviterName, emails } = (await req.json()) as Body;

    if (!program || !inviterName || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing program, inviterName, or emails." },
        { status: 400 }
      );
    }

    // ✅ Rate limit: IP + inviter + program
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await limitOrThrow(`invite:${ip}:${inviterName}:${program}`);

    // ✅ Email sender
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || "support@myscoutline.com";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Send in parallel
    const sends = emails.map((to) =>
      resend.emails.send({
        from,
        to,
        subject: `${inviterName} invited you to ScoutLine`,
        html: `
          <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6">
            <h2 style="margin:0 0 8px;">You've been invited to ScoutLine</h2>
            <p><strong>${escapeHtml(inviterName)}</strong> invited you to join the
               <strong>${escapeHtml(program)}</strong> program on ScoutLine.</p>
            <p>Click below to start onboarding. We’ll prefill your college/program and email:</p>
            <p>
              <a href="${baseUrl}/onboarding/coach?prefillEmail=${encodeURIComponent(
                to
              )}&prefillCollege=${encodeURIComponent(
                program
              )}" style="display:inline-block;background:#caa042;color:#0f172a;text-decoration:none;font-weight:800;padding:10px 14px;border-radius:10px;border:1px solid #caa042">
                Start Onboarding
              </a>
            </p>
            <p style="color:#64748b;font-size:14px">If you didn’t expect this, you can safely ignore.</p>
          </div>
        `,
      })
    );

    const results = await Promise.allSettled(sends);
    const failures = results
      .map((r, i) => ({ r, email: emails[i] }))
      .filter((x) => x.r.status === "rejected");

    if (failures.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Some invites failed",
          failures: failures.map((f) => f.email),
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Bubble nice 429 if limiter threw
    const msg = String(err?.message || "");
    if (msg.startsWith("Too many")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 429 });
    }
    console.error("invite route error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Minimal HTML escape for the few interpolated strings
function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}

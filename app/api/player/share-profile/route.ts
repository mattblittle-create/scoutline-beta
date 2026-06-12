// app/api/player/share-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const slug = cleanString(body?.slug);
    const coachEmail = cleanString(body?.coachEmail).toLowerCase();
    const message = cleanString(body?.message);
    const profileUrl = cleanString(body?.profileUrl);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile." },
        { status: 400 }
      );
    }

    if (!coachEmail || !isValidEmail(coachEmail)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid coach email address." },
        { status: 400 }
      );
    }

    const profile = await prisma.playerProfile.findFirst({
where: {
  data: {
    path: ["profile", "slug"],
    equals: slug,
  },
},
      select: {
        id: true,
        email: true,
        data: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found." },
        { status: 404 }
      );
    }

    const data = (profile.data || {}) as any;
    const profileData = data?.profile || {};
    const normalized = data?.normalized || {};

    const firstName =
      cleanString(profileData?.firstName) ||
      cleanString(normalized?.firstName);

    const lastName =
      cleanString(profileData?.lastName) ||
      cleanString(normalized?.lastName);

    const playerName =
      [firstName, lastName].filter(Boolean).join(" ") || "ScoutLine Player";

    const gradYear =
      cleanString(profileData?.gradYear) ||
      cleanString(normalized?.gradYear);

    const primaryPos =
      cleanString(profileData?.primaryPos) ||
      cleanString(profileData?.primaryPosition) ||
      cleanString(normalized?.primaryPos) ||
      cleanString(normalized?.primaryPosition);

    const highSchool =
      cleanString(profileData?.highSchool) ||
      cleanString(normalized?.highSchool);

    const safeProfileUrl =
      profileUrl ||
      `https://www.myscoutline.com/player/${encodeURIComponent(slug)}`;

    const optionalMessage = message
      ? `<p style="margin:16px 0;padding:12px;border-left:4px solid #caa042;background:#fffaf0;color:#334155;">${escapeHtml(
          message
        )}</p>`
      : "";

    const subject = `${playerName} ScoutLine Profile`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <h2 style="margin:0 0 12px;">${escapeHtml(playerName)} shared a ScoutLine profile with you</h2>

        <p style="margin:0 0 12px;">
          A player profile has been shared with you through ScoutLine.
        </p>

        ${optionalMessage}

        <div style="margin:16px 0;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;">
          <div><strong>Player:</strong> ${escapeHtml(playerName)}</div>
          ${gradYear ? `<div><strong>Grad Year:</strong> ${escapeHtml(gradYear)}</div>` : ""}
          ${primaryPos ? `<div><strong>Position:</strong> ${escapeHtml(primaryPos)}</div>` : ""}
          ${highSchool ? `<div><strong>School:</strong> ${escapeHtml(highSchool)}</div>` : ""}
        </div>

        <p style="margin:20px 0;">
          <a href="${escapeHtml(
            safeProfileUrl
          )}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:bold;">
            View Full Player Profile
          </a>
        </p>

        <p style="font-size:13px;color:#64748b;margin-top:18px;">
          Coach accounts are free. Create an account to save players, build recruiting boards, add notes, share with staff, message players, and access verified program tools.
        </p>
      </div>
    `;

    /**
     * IMPORTANT:
     * Swap this section to your existing email utility if you already have one.
     *
     * Search your app for sendEmail, mailer, resend, nodemailer, or sendgrid.
     */
    if (!process.env.RESEND_API_KEY) {
      console.log("SHARE_PROFILE_EMAIL_DEV_ONLY", {
        to: coachEmail,
        subject,
        profileUrl: safeProfileUrl,
        playerName,
      });

      return NextResponse.json({
        ok: true,
        devOnly: true,
        message: "Profile share prepared. Configure email provider to send live emails.",
      });
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "ScoutLine <noreply@myscoutline.com>",
        to: coachEmail,
        subject,
        html,
      }),
    });

    const resendJson = await resendRes.json().catch(() => null);

    if (!resendRes.ok) {
      console.error("SHARE_PROFILE_RESEND_ERROR", resendJson);
      return NextResponse.json(
        { ok: false, error: "Could not send profile email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailId: resendJson?.id || null,
    });
  } catch (err: any) {
    console.error("SHARE_PROFILE_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not share profile." },
      { status: 500 }
    );
  }
}
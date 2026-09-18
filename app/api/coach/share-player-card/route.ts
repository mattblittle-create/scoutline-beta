// app/api/coach/share-player-card/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function jsonErr(error: string, status = 400) {
  return NextResponse.json<Err>({ ok: false, error }, { status });
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.myscoutline.com"
  ).replace(/\/+$/, "");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) {
    return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };
  }

  if (process.env.NODE_ENV === "production") {
    const type = user?.coachProfile?.coachAccountType ?? null;
    if (type !== "COLLEGE_COACH") {
      return { ok: false as const, status: 403 as const, error: "College Coach access required." };
    }
  }

  return { ok: true as const, collegeId: user.collegeId as string, userId: user.id as string };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return jsonErr(gate.error, gate.status);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonErr("Missing RESEND_API_KEY.", 500);

  const body = await req.json().catch(() => ({} as any));

  const playerProfileId = String(body?.playerProfileId || "").trim();
  const recipientMode = String(body?.recipientMode || "selected").trim(); // selected | all
  const recipientUserIds = Array.isArray(body?.recipientUserIds)
    ? body.recipientUserIds.map((v: any) => String(v || "").trim()).filter(Boolean)
    : [];
  const message = String(body?.message || "").trim();

  if (!playerProfileId) return jsonErr("playerProfileId is required.", 400);

  const playerProfile = await prisma.playerProfile.findUnique({
    where: { id: playerProfileId },
    select: {
      id: true,
      email: true,
      data: true,
      user: {
        select: {
          name: true,
          slug: true,
          Player: {
            select: {
              gradYear: true,
              primaryPos: true,
              secondaryPos: true,
            },
          },
        },
      },
    },
  });

  if (!playerProfile) return jsonErr("Player profile not found.", 404);

  const staffWhere =
    recipientMode === "all"
      ? {
          collegeId: gate.collegeId,
          id: { not: gate.userId },
        }
      : {
          collegeId: gate.collegeId,
          id: { in: recipientUserIds },
        };

  const recipients = await prisma.user.findMany({
    where: staffWhere,
    select: {
      id: true,
      email: true,
      name: true,
      coachProfile: {
        select: {
          coachAccountType: true,
        },
      },
    },
  });

  const coachRecipients = recipients.filter((r) => {
    if (!r.email) return false;
    if (process.env.NODE_ENV !== "production") return true;
    return r.coachProfile?.coachAccountType === "COLLEGE_COACH";
  });

  if (coachRecipients.length === 0) {
    return jsonErr("No valid staff recipients found.", 400);
  }

  const playerName =
    playerProfile.user?.name ||
    (typeof (playerProfile.data as any)?.firstName === "string" || typeof (playerProfile.data as any)?.lastName === "string"
      ? `${(playerProfile.data as any)?.firstName ?? ""} ${(playerProfile.data as any)?.lastName ?? ""}`.trim()
      : "") ||
    playerProfile.email.split("@")[0] ||
    "ScoutLine Player";

  const p = playerProfile.user?.Player;
  const positionLine = [p?.primaryPos, p?.secondaryPos].filter(Boolean).join(" / ") || "Position not listed";
  const gradYear = p?.gradYear ? String(p.gradYear) : "Grad year not listed";
  const slug = playerProfile.user?.slug || "";
  const playerUrl = slug
    ? `${appBaseUrl()}/player/${encodeURIComponent(slug)}?source=staff-share`
    : `${appBaseUrl()}/dashboard/coach/player/${encodeURIComponent(playerProfileId)}`;

  const sharedBy = user?.name || user?.email || "A coach on your staff";

  const subject = `ScoutLine Player Shared: ${playerName}`;

  const safeMessageHtml = message
    ? `<p style="margin:16px 0;padding:12px;border-left:4px solid #caa042;background:#f8fafc;"><strong>Note from ${escapeHtml(
        sharedBy
      )}:</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`
    : "";

  const html = `
    <div style="font-family:Arial,Verdana,sans-serif;color:#0f172a;line-height:1.5;">
      <h2 style="margin:0 0 8px;">${escapeHtml(sharedBy)} shared a ScoutLine player with you</h2>
      <p style="margin:0 0 16px;color:#475569;">Review this player profile from your program’s recruiting workflow.</p>

      <div style="border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#ffffff;">
        <div style="font-size:18px;font-weight:900;margin-bottom:6px;">${escapeHtml(playerName)}</div>
        <div style="font-size:14px;color:#475569;">${escapeHtml(gradYear)} • ${escapeHtml(positionLine)}</div>
      </div>

      ${safeMessageHtml}

      <p style="margin:18px 0;">
        <a href="${escapeHtml(playerUrl)}" style="display:inline-block;background:#caa042;color:#0f182a;font-weight:900;text-decoration:none;padding:10px 14px;border-radius:10px;">
          View Player Profile
        </a>
      </p>

      <p style="font-size:12px;color:#64748b;margin-top:22px;">
        This internal share is only intended for coaches connected to your ScoutLine program.
      </p>
    </div>
  `;

  const text = `${sharedBy} shared a ScoutLine player with you.

${playerName}
${gradYear} • ${positionLine}

${message ? `Note from ${sharedBy}:\n${message}\n\n` : ""}View Player Profile:
${playerUrl}

This internal share is only intended for coaches connected to your ScoutLine program.`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "ScoutLine/1.0",
    },
    body: JSON.stringify({
      from: "ScoutLine <onboarding@myscoutline.com>",
      to: coachRecipients.map((r) => r.email),
      subject,
      html,
      text,
    }),
    cache: "no-store",
  });

  const responseText = await response.text();
  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = responseText;
  }

  if (!response.ok) {
    console.error("Share player card email failed:", result);
    return jsonErr("Failed to send staff share email.", 500);
  }

  return NextResponse.json({
    ok: true,
    data: {
      sentTo: coachRecipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name ?? null,
      })),
      result,
    },
  });
}
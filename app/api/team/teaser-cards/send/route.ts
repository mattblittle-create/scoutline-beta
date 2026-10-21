// app/api/team/teaser-cards/send/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function normText(v: unknown) {
  return String(v ?? "").trim();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser().catch(() => null);

    if (!currentUser?.id) {
      return jsonError("You must be logged in.", 401);
    }

    const body = await req.json().catch(() => ({}));

    const coachEmail = normText(body?.coachEmail).toLowerCase();
    const coachName = normText(body?.coachName);
    const note = normText(body?.note);

    const playerProfileIds = Array.isArray(body?.playerProfileIds)
      ? body.playerProfileIds.map(normText).filter(Boolean)
      : [];

    if (!coachEmail || !isEmail(coachEmail)) {
      return jsonError("Valid coach email is required.", 400);
    }

    if (note.length < 20) {
      return jsonError(
        "Personal note must be at least 20 characters.",
        400
      );
    }

    if (!playerProfileIds.length) {
      return jsonError("At least one player is required.", 400);
    }

    if (playerProfileIds.length > 5) {
      return jsonError(
        "You can send up to 5 teaser cards at a time.",
        400
      );
    }

    const adminMembership = await prisma.teamMembership.findFirst({
      where: {
        userId: currentUser.id,
        role: "TEAM_ADMIN" as any,
        isActive: true,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!adminMembership?.teamId) {
      return jsonError(
        "No active Team Admin membership found.",
        403
      );
    }

    const memberships = await prisma.teamMembership.findMany({
      where: {
        teamId: adminMembership.teamId,
        role: "PLAYER" as any,
        isActive: true,
        playerProfileId: {
          in: playerProfileIds,
        },
      },
      include: {
        playerProfile: {
          select: {
            id: true,
            email: true,
            userId: true,
            data: true,
            user: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    if (memberships.length !== playerProfileIds.length) {
      return jsonError(
        "One or more selected players are not active on this roster.",
        403
      );
    }

    const players = memberships
      .map((m) => {
        const data = (m.playerProfile?.data || {}) as any;
        const normalized = data?.normalized || data || {};

        const firstName = normText(
          normalized.firstName ||
            normalized?.core?.firstName ||
            ""
        );

        const lastName = normText(
          normalized.lastName ||
            normalized?.core?.lastName ||
            ""
        );

        const fullName =
          [firstName, lastName]
            .filter(Boolean)
            .join(" ") ||
          m.playerProfile?.email ||
          "Player";

        const publicSlug =
          normText(normalized.publicSlug) ||
          normText(data.publicSlug) ||
          normText(m.playerProfile?.user?.slug);

        return {
          id: m.playerProfile!.id,
          name: fullName,
          publicSlug,
          teaserUrl: publicSlug
            ? `${
                process.env.NEXT_PUBLIC_APP_URL ||
                "https://www.myscoutline.com"
              }/player/${encodeURIComponent(
                publicSlug
              )}/card?from=teaser`
            : null,
        };
      })
      .filter((p) => p.teaserUrl);

    if (!players.length) {
      return jsonError(
        "Selected players do not have public teaser cards.",
        400
      );
    }

    const subject =
      players.length === 1
        ? `${players[0].name} | ScoutLine Recruiting Profile`
        : `${adminMembership.team.name} Players | ScoutLine Recruiting Profiles`;

    const playerHtml = players
      .map(
        (p) => `
          <div style="margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">
              ${p.name}
            </div>

            <a
              href="${p.teaserUrl}"
              style="
                display:inline-block;
                padding:10px 14px;
                background:#caa042;
                color:#0f172a;
                text-decoration:none;
                border-radius:10px;
                font-weight:700;
              "
            >
              View Teaser Card
            </a>
          </div>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;">
        <p>
          ${coachName ? `Coach ${coachName},` : "Coach,"}
        </p>

        <p>${note}</p>

        <div style="margin-top:24px;margin-bottom:24px;">
          ${playerHtml}
        </div>

        <p>
          Sent by ${adminMembership.team.name} through ScoutLine.
        </p>
      </div>
    `;

const sentEmail = await resend.emails.send({
  from: "ScoutLine <noreply@myscoutline.com>",
  to: coachEmail,
  subject,
  html,
});

const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  null;

const userAgent = req.headers.get("user-agent") || null;

await prisma.adminAuditLog
  .create({
    data: {
      actingUserId: currentUser.id,
      action: "TEAM_ADMIN_TEASER_CARDS_SENT",
      entityType: "Team",
      entityId: adminMembership.team.id,
      ip,
      userAgent,
      beforeJson: {
        coachEmail,
        coachName: coachName || null,
        playerProfileIds,
      } as any,
      afterJson: {
        teamId: adminMembership.team.id,
        teamName: adminMembership.team.name,
        playersSent: players.length,
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          publicSlug: p.publicSlug,
          teaserUrl: p.teaserUrl,
        })),
        resendResponse: sentEmail,
      } as any,
    },
  })
  .catch(() => null);

    return NextResponse.json({
      ok: true,
      data: {
        sent: true,
        coachEmail,
        playersSent: players.length,
      },
    });
  } catch (e: any) {
    return jsonError(
      e?.message || "Failed to send teaser cards.",
      500
    );
  }
}
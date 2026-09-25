// app/api/chat/conversations/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function buildPlayerPositionLine(player: any): string {
  if (!player) return "";

  const primaryRaw = String(player?.primaryPos || "").trim();
  const secondaryRaw = String(player?.secondaryPos || "").trim();
  const pitcherHandRaw = String(player?.pitcherHand || "").trim().toUpperCase();

  const normalizePos = (pos: string) => {
    const p = String(pos || "").trim().toUpperCase();
    if (!p) return "";
    if (p === "P") {
      if (pitcherHandRaw === "RHP" || pitcherHandRaw === "LHP") return pitcherHandRaw;
      return "P";
    }
    return pos;
  };

  const primary = normalizePos(primaryRaw);
  const secondary =
    secondaryRaw && secondaryRaw.toUpperCase() !== primaryRaw.toUpperCase()
      ? normalizePos(secondaryRaw)
      : "";

  const pieces = [primary, secondary].filter(Boolean);
  return pieces.join(" / ");
}

function buildPlayerMetaLine(player: any): string {
  if (!player) return "";

  const gradYear = player?.gradYear ? String(player.gradYear) : "";
  const positions = buildPlayerPositionLine(player);

  const hsName = String(player?.hsName || "").trim();
  const hometown = String(player?.hometown || "").trim();
  const state = String(player?.state || "").trim();

  const location =
    hsName ||
    [hometown, state].filter(Boolean).join(", ");

  return [gradYear, positions, location].filter(Boolean).join(" | ");
}

function buildCoachMetaLine(user: any): string {
  if (!user) return "";

  const staffTitle = String(user?.coachProfile?.staffTitle || "").trim();
  const collegeName = String(user?.college?.name || "").trim();

  return [staffTitle, collegeName].filter(Boolean).join(" | ");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const rows = await prisma.chatConversationParticipant.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                    role: true,
                    coachProfile: {
                      select: {
                        staffTitle: true,
                      },
                    },
                    college: {
                      select: {
                        name: true,
                      },
                    },
                    Player: {
                      select: {
                        gradYear: true,
                        primaryPos: true,
                        secondaryPos: true,
                        pitcherHand: true,
                        hsName: true,
                        hometown: true,
                        state: true,
                      },
                    },
                    PlayerProfile: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
            messages: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                body: true,
                createdAt: true,
                senderUserId: true,
              },
            },
          },
        },
      },
    });

    const conversations = rows
      .map((row) => {
        const convo = row.conversation;

        const otherParticipants = convo.participants.filter(
          (p) => p.userId !== user.id
        );

        const primaryOther = otherParticipants[0]?.user ?? null;
        const lastMessage = convo.messages[0] ?? null;

        const unreadCount = lastMessage?.createdAt && row.lastReadAt
          ? lastMessage.createdAt > row.lastReadAt
            ? 1
            : 0
          : lastMessage?.createdAt && !row.lastReadAt
          ? 1
          : 0;

        return {
          id: convo.id,
          subject: convo.subject,
          lastMessageAt: convo.lastMessageAt?.toISOString() ?? null,
          unreadCount,
          preview: lastMessage?.body ?? "",
          lastMessageCreatedAt: lastMessage?.createdAt?.toISOString() ?? null,
        otherParticipant: primaryOther
          ? {
              id: primaryOther.id,
              name:
                primaryOther.name ||
                primaryOther.email ||
                "Coach",
              email: primaryOther.email ?? "",
              photoUrl: primaryOther.photoUrl ?? "",
              role: primaryOther.role ?? "",
              staffTitle: primaryOther.coachProfile?.staffTitle ?? "",
              collegeName: primaryOther.college?.name ?? "",

              playerGradYear: primaryOther.Player?.gradYear ?? null,
              playerPrimaryPos: primaryOther.Player?.primaryPos ?? "",
              playerSecondaryPos: primaryOther.Player?.secondaryPos ?? "",
              playerPitcherHand: primaryOther.Player?.pitcherHand ?? "",
              playerHsName: primaryOther.Player?.hsName ?? "",
              playerHometown: primaryOther.Player?.hometown ?? "",
              playerState: primaryOther.Player?.state ?? "",

              playerMetaLine: buildPlayerMetaLine(primaryOther.Player),
              coachMetaLine: buildCoachMetaLine(primaryOther),
            }
          : null,
        };
      })
.sort((a, b) => {
  const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  return bTs - aTs;
});

    return NextResponse.json({
      ok: true,
      data: {
        conversations,
      },
    });
  } catch (err) {
    console.error("chat conversations GET error", err);
    return NextResponse.json<Err>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
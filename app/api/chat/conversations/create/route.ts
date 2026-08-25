// app/api/chat/conversations/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

type ChatParticipantRole =
  | "PLAYER"
  | "COACH"
  | "TEAM_ADMIN"
  | "PARENT"
  | "SCOUTLINE_ADMIN";

function inferChatParticipantRole(row: any): ChatParticipantRole {
  const legacyRole = String(row?.role || "").trim().toUpperCase();

  const membershipRoles = Array.isArray(row?.teamMemberships)
    ? row.teamMemberships.map((m: any) => String(m?.role || "").toUpperCase())
    : [];

  if (row?.adminProfile?.id && row?.adminProfile?.isActive) {
    return "SCOUTLINE_ADMIN";
  }

  if (membershipRoles.includes("TEAM_ADMIN")) {
    return "TEAM_ADMIN";
  }

  if (row?.coachProfile?.id || legacyRole === "COACH") {
    return "COACH";
  }

  if (row?.parentProfile?.id || legacyRole === "PARENT") {
    return "PARENT";
  }

  if (row?.PlayerProfile?.id || row?.Player?.id || legacyRole === "PLAYER") {
    return "PLAYER";
  }

  return "PLAYER";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const otherUserId = String(body?.otherUserId || "").trim();
  const subject = String(body?.subject || "").trim() || null;
  const initialMessage = String(body?.initialMessage || "").trim();

  if (!otherUserId) {
    return NextResponse.json<Err>(
      { ok: false, error: "otherUserId is required." },
      { status: 400 }
    );
  }

  if (otherUserId === user.id) {
    return NextResponse.json<Err>(
      { ok: false, error: "Cannot create a conversation with yourself." },
      { status: 400 }
    );
  }

  if (initialMessage.length > 5000) {
    return NextResponse.json<Err>(
      { ok: false, error: "initialMessage is too long." },
      { status: 400 }
    );
  }

  try {
    const [currentUserRow, otherUserRow] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          coachProfile: { select: { id: true } },
          parentProfile: { select: { id: true } },
          PlayerProfile: { select: { id: true } },
          Player: { select: { id: true } },
          teamMemberships: {
            where: { isActive: true },
            select: { role: true },
          },
          adminProfile: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          coachProfile: { select: { id: true } },
          parentProfile: { select: { id: true } },
          PlayerProfile: { select: { id: true } },
          Player: { select: { id: true } },
          teamMemberships: {
            where: { isActive: true },
            select: { role: true },
          },
          adminProfile: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    if (!currentUserRow || !otherUserRow) {
      return NextResponse.json<Err>(
        { ok: false, error: "User not found." },
        { status: 404 }
      );
    }

    const currentParticipantRole = inferChatParticipantRole(currentUserRow);
    const otherParticipantRole = inferChatParticipantRole(otherUserRow);

    const canInitiateCoachFirst =
      currentParticipantRole === "COACH" ||
      currentParticipantRole === "TEAM_ADMIN" ||
      currentParticipantRole === "SCOUTLINE_ADMIN";

    if (!canInitiateCoachFirst) {
      return NextResponse.json<Err>(
        { ok: false, error: "Only coaches can initiate ScoutLine chat conversations." },
        { status: 403 }
      );
    }

    if (otherParticipantRole !== "PLAYER") {
      return NextResponse.json<Err>(
        { ok: false, error: "ScoutLine coach-first chat can only be initiated to a player." },
        { status: 400 }
      );
    }

    const existing = await prisma.chatConversation.findFirst({
      where: {
        participants: {
          some: { userId: user.id },
        },
        AND: [
          {
            participants: {
              some: { userId: otherUserId },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    const hasExactTwoPartyMatch =
      !!existing &&
      existing.participants.length === 2 &&
      existing.participants.some((p) => p.userId === user.id) &&
      existing.participants.some((p) => p.userId === otherUserId);

    const now = new Date();

    if (hasExactTwoPartyMatch) {
      let createdMessageId: string | null = null;

      if (initialMessage) {
        const created = await prisma.$transaction(async (tx) => {
          const msg = await tx.chatMessage.create({
            data: {
              conversationId: existing.id,
              senderUserId: user.id,
              body: initialMessage,
            },
          });

          await tx.chatConversation.update({
            where: { id: existing.id },
            data: { lastMessageAt: now },
          });

          await tx.chatConversationParticipant.updateMany({
            where: {
              conversationId: existing.id,
              userId: user.id,
            },
            data: {
              lastReadAt: now,
            },
          });

          await tx.notification.create({
            data: {
              userId: otherUserId,
              type: "COACH_MESSAGE",
              message: `${
                currentUserRow.id === user.id ? "New message received" : "New chat message"
              } from ${user.email || "ScoutLine user"}`,
              data: {
                conversationId: existing.id,
                senderUserId: user.id,
                senderEmail: user.email,
              },
            },
          });

          return msg;
        });

        createdMessageId = created.id;
      }

return NextResponse.json({
  ok: true,
  data: {
    conversation: {
      id: existing.id,
    },
    existed: true,
    createdMessageId,
  },
});
    }

    const createdConversation = await prisma.$transaction(async (tx) => {
      const convo = await tx.chatConversation.create({
        data: {
          subject,
          lastMessageAt: initialMessage ? now : null,
          participants: {
            create: [
              {
                userId: user.id,
                role: currentParticipantRole,
                lastReadAt: initialMessage ? now : null,
              },
              {
                userId: otherUserId,
                role: otherParticipantRole,
              },
            ],
          },
        },
      });

      let createdMessageId: string | null = null;

      if (initialMessage) {
        const msg = await tx.chatMessage.create({
          data: {
            conversationId: convo.id,
            senderUserId: user.id,
            body: initialMessage,
          },
        });

        createdMessageId = msg.id;

        await tx.notification.create({
          data: {
            userId: otherUserId,
            type: "COACH_MESSAGE",
            message: `New message from ${user.email || "ScoutLine user"}`,
            data: {
              conversationId: convo.id,
              senderUserId: user.id,
              senderEmail: user.email,
            },
          },
        });
      }

      return {
        conversationId: convo.id,
        createdMessageId,
      };
    });

return NextResponse.json({
  ok: true,
  data: {
    conversation: {
      id: createdConversation.conversationId,
    },
    existed: false,
    createdMessageId: createdConversation.createdMessageId,
  },
});
  } catch (err) {
    console.error("chat conversations create POST error", err);
    return NextResponse.json<Err>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
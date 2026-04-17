// app/api/chat/conversations/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

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
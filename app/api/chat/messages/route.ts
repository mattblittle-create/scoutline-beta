// app/api/chat/messages/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const conversationId = String(searchParams.get("conversationId") || "").trim();

  if (!conversationId) {
    return NextResponse.json<Err>(
      { ok: false, error: "conversationId is required." },
      { status: 400 }
    );
  }

  try {
    const participant = await prisma.chatConversationParticipant.findFirst({
      where: {
        conversationId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      return NextResponse.json<Err>(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        senderUser: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });

    await prisma.chatConversationParticipant.updateMany({
      where: {
        conversationId,
        userId: user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        messages: messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          senderUserId: m.senderUserId,
          senderUser: {
            id: m.senderUser.id,
            name: m.senderUser.name ?? m.senderUser.email ?? "User",
            email: m.senderUser.email ?? "",
            photoUrl: m.senderUser.photoUrl ?? "",
          },
        })),
      },
    });
  } catch (err) {
    console.error("chat messages GET error", err);
    return NextResponse.json<Err>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
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
  const conversationId = String(body?.conversationId || "").trim();
  const message = String(body?.message || "").trim();

  if (!conversationId) {
    return NextResponse.json<Err>(
      { ok: false, error: "conversationId is required." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json<Err>(
      { ok: false, error: "message is required." },
      { status: 400 }
    );
  }

  if (message.length > 5000) {
    return NextResponse.json<Err>(
      { ok: false, error: "message is too long." },
      { status: 400 }
    );
  }

  try {
    const participant = await prisma.chatConversationParticipant.findFirst({
      where: {
        conversationId,
        userId: user.id,
      },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json<Err>(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const now = new Date();

const created = await prisma.$transaction(async (tx) => {
  const msg = await tx.chatMessage.create({
    data: {
      conversationId,
      senderUserId: user.id,
      body: message,
    },
    include: {
      senderUser: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
    },
  });

  await tx.chatConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: now,
    },
  });

  await tx.chatConversationParticipant.updateMany({
    where: {
      conversationId,
      userId: user.id,
    },
    data: {
      lastReadAt: now,
    },
  });

  const recipientParticipants = participant.conversation.participants.filter(
    (p) => p.userId !== user.id
  );

  const senderLabel =
    msg.senderUser.name?.trim() ||
    msg.senderUser.email?.trim() ||
    "ScoutLine user";

  if (recipientParticipants.length > 0) {
    await tx.notification.createMany({
      data: recipientParticipants.map((p) => ({
        userId: p.userId,
        type: "COACH_MESSAGE",
        message: `New message from ${senderLabel}`,
        data: {
          conversationId,
          senderUserId: user.id,
          senderName: msg.senderUser.name ?? null,
          senderEmail: msg.senderUser.email ?? "",
          messageId: msg.id,
        },
      })),
    });
  }

  return msg;
});

    return NextResponse.json({
      ok: true,
      data: {
        message: {
          id: created.id,
          body: created.body,
          createdAt: created.createdAt.toISOString(),
          senderUserId: created.senderUserId,
          senderUser: {
            id: created.senderUser.id,
            name: created.senderUser.name ?? created.senderUser.email ?? "User",
            email: created.senderUser.email ?? "",
            photoUrl: created.senderUser.photoUrl ?? "",
          },
        },
      },
    });
  } catch (err) {
    console.error("chat messages POST error", err);
    return NextResponse.json<Err>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
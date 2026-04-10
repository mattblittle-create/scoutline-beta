// app/api/chat/conversations/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

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

  try {
    const existing = await prisma.chatConversation.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [user.id, otherUserId],
            },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (
      existing &&
      existing.participants.length === 2 &&
      existing.participants.some((p) => p.userId === user.id) &&
      existing.participants.some((p) => p.userId === otherUserId)
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          conversationId: existing.id,
          existed: true,
        },
      });
    }

    const currentUserRow = await prisma.user.findUnique({
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
    });

    const otherUserRow = await prisma.user.findUnique({
      where: { id: otherUserId },
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
    });

    if (!currentUserRow || !otherUserRow) {
      return NextResponse.json<Err>(
        { ok: false, error: "User not found." },
        { status: 404 }
      );
    }

    function inferChatParticipantRole(row: any):
      | "PLAYER"
      | "COACH"
      | "TEAM_ADMIN"
      | "PARENT"
      | "SCOUTLINE_ADMIN" {
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

    const currentParticipantRole = inferChatParticipantRole(currentUserRow);
    const otherParticipantRole = inferChatParticipantRole(otherUserRow);

    const convo = await prisma.chatConversation.create({
      data: {
        subject,
        participants: {
          create: [
            {
              userId: user.id,
              role: currentParticipantRole,
            },
            {
              userId: otherUserId,
              role: otherParticipantRole,
            },
          ],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        conversationId: convo.id,
        existed: false,
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
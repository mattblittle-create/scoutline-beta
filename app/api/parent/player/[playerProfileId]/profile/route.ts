// app/api/parent/player/[playerProfileId]/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type RouteProps = {
  params: {
    playerProfileId: string;
  };
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const playerProfileId = String(params?.playerProfileId || "").trim();

    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile id." },
        { status: 400 }
      );
    }

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!parentProfile?.id) {
      return NextResponse.json(
        { ok: false, error: "Parent profile not found." },
        { status: 404 }
      );
    }

    const link = await prisma.parentPlayerLink.findUnique({
      where: {
        parentProfileId_playerProfileId: {
          parentProfileId: parentProfile.id,
          playerProfileId,
        },
      },
      select: {
        playerProfile: {
          select: {
            id: true,
            email: true,
            data: true,
          },
        },
      },
    });

    if (!link?.playerProfile) {
      return NextResponse.json(
        { ok: false, error: "Linked player profile not found." },
        { status: 404 }
      );
    }

    const incoming = asRecord(await req.json().catch(() => ({})));
    const existing = asRecord(link.playerProfile.data);

    /**
     * Parent permission boundary:
     * Parents can maintain profile information, metrics, stats, video/social,
     * references, academics, athletics, and billing support details.
     *
     * Parents cannot change commitment status/program. Those fields remain
     * player/admin controlled.
     */
    const protectedPlayerVoiceFields = {
      // Commitment: player/admin controlled
      isCommitted: existing.isCommitted ?? false,
      committedProgram: existing.committedProgram ?? null,
      committedProgramId: existing.committedProgramId ?? null,
      committedCollege: existing.committedCollege ?? null,
      committedSchool: existing.committedSchool ?? null,
      committedProgramName: existing.committedProgramName ?? null,

      // Player voice: player-only editable
      academicBio: existing.academicBio ?? null,
      academicBioPrivate: existing.academicBioPrivate ?? false,
      areasOfStudyInput: existing.areasOfStudyInput ?? null,
      areasOfStudy: existing.areasOfStudy ?? [],
      playerBio: existing.playerBio ?? null,
      playerBioPrivate: existing.playerBioPrivate ?? false,
    };

    const nextData = {
      ...existing,
      ...incoming,

      // Always preserve canonical identity.
      email: link.playerProfile.email,

      // Preserve player-only / player-admin-controlled fields.
      ...protectedPlayerVoiceFields,

      // Helpful audit-style metadata inside JSON payload.
      lastEditedByRole: "PARENT",
      lastEditedByUserId: user.id,
      lastEditedAt: new Date().toISOString(),
    };

    const updated = await prisma.playerProfile.update({
      where: { id: link.playerProfile.id },
      data: {
        data: nextData,
      },
      select: {
        id: true,
        email: true,
        data: true,
        updatedAt: true,
      },
    });

    await prisma.profileChangeLog.create({
      data: {
        playerProfileId: updated.id,
        actorUserId: user.id,
        actorRole: "PARENT",
        changeSummary: "Parent updated player profile.",
        diff: {
          source: "parent-profile-editor",
          protectedFields: Object.keys(protectedPlayerVoiceFields),
        },
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      playerProfile: updated,
      normalized: updated.data,
    });
  } catch (err: any) {
    console.error("Parent profile update failed:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to update player profile.",
      },
      { status: 500 }
    );
  }
}
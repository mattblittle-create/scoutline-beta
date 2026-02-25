// app/api/player/profile/[email]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Audience = "public" | "team" | "owner";

function applyPrivacyMask(data: any, audience: Audience) {
  if (audience === "owner") return data;

  const clone = JSON.parse(JSON.stringify(data));

  // 1) Contact masking
  // Hide top-level email for public views
  if (audience === "public") {
    clone.email = undefined;
    // Also hide any nested profile.email if you stored it there
    if (clone.profile && "email" in clone.profile) {
      clone.profile.email = undefined;
    }
  }

  const privacy = clone.profile?.privacy ?? {};

  // 2) Metrics / Stats masking based on flags (customize as you add flags)
  if (privacy.metricsPrivate && audience === "public") {
    clone.metrics = undefined;
  }
  if (privacy.statsPrivate && audience === "public") {
    clone.stats = undefined;
  }

  // 3) Strip any future/internal-only fields here if needed

  return clone;
}

export async function GET(
  req: Request,
  { params }: { params: { email: string } }
) {
  try {
    const url = new URL(req.url);
    const audience = (url.searchParams.get("audience") as Audience) ?? "owner";
    const idParam = url.searchParams.get("id"); // optional: prefer exact id when present
    const emailParam = decodeURIComponent(params.email || "").trim();

    let row:
      | {
          id: string;
          email: string;
          schemaVersion: number;
          updatedAt: Date;
          data: any;
        }
      | null = null;

    if (idParam) {
      // Prefer explicit id when provided
      row = await prisma.playerProfile.findUnique({
        where: { id: idParam },
        select: { id: true, email: true, schemaVersion: true, updatedAt: true, data: true },
      });
    } else if (emailParam) {
      // Case-insensitive match for email in path
      row = await prisma.playerProfile.findFirst({
        where: { email: { equals: emailParam, mode: "insensitive" } },
        select: { id: true, email: true, schemaVersion: true, updatedAt: true, data: true },
      });
    }

    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Build a payload that always includes a stable profileId so the client can persist it
    // (We tuck these into the top-level and also mirror inside profile.* for convenience.)
    const base = row.data ?? {};
    const withIds = {
      ...base,
      profile: {
        ...(base.profile ?? {}),
        profileId: row.id,
        // echo the canonical email for owner/team; it will be masked for public in applyPrivacyMask
        email: row.email,
      },
      profileId: row.id, // top-level copy for easy access
      email: row.email,  // top-level email (masked for public)
    };

    const masked = applyPrivacyMask(withIds, audience);

    return NextResponse.json({
      ok: true,
      data: masked,
      meta: {
        schemaVersion: row.schemaVersion,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// app/api/coach/join-link/resolve/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = String(searchParams.get("code") || "").trim();

  if (!code) {
    return NextResponse.json<Err>({ ok: false, error: "Missing join code." }, { status: 400 });
  }

  const link = await prisma.coachJoinLink.findUnique({
    where: { code },
    include: {
      college: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          logoUrl: true,
          division: true,
          conference: true,
        },
      },
    },
  });

  if (!link || !link.isActive) {
    return NextResponse.json<Err>({ ok: false, error: "This coach join link is no longer active." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      link: {
        id: link.id,
        code: link.code,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      },
      college: link.college,
    },
  });
}
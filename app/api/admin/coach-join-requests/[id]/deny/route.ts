// app/api/admin/coach-join-requests/[id]/deny/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireScoutLineAdmin(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (String(user.role || "").toUpperCase() !== "SCOUTLINE_ADMIN") {
    return { ok: false as const, status: 403 as const, error: "ScoutLine admin access required." };
  }
  return { ok: true as const };
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const user = await getCurrentUser();
  const gate = requireScoutLineAdmin(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  // ✅ TS narrowing (same pattern as approve route)
  const adminUser = user as NonNullable<typeof user>;

  const id = ctx.params.id;

  const reqRow = await prisma.coachJoinRequest.findUnique({
    where: { id },
    include: {
      requestedByUser: { select: { id: true, email: true } },
      college: { select: { id: true, name: true } },
    },
  });

  if (!reqRow) return NextResponse.json<Err>({ ok: false, error: "Join request not found." }, { status: 404 });
  if (reqRow.status !== ("PENDING" as any)) {
    return NextResponse.json<Err>({ ok: false, error: `Request is ${reqRow.status}.` }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachJoinRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "DENIED" as any,
        decidedAt: new Date(),
        decidedByUserId: adminUser.id,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: reqRow.id,
      status: "DENIED",
      collegeId: reqRow.collegeId,
    },
  });
}
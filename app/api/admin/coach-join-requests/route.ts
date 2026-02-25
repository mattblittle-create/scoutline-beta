// app/api/admin/coach-join-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireScoutLineAdmin(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  // We’ll use User.role string for now
  if (String(user.role || "").toUpperCase() !== "SCOUTLINE_ADMIN") {
    return { ok: false as const, status: 403 as const, error: "ScoutLine admin access required." };
  }
  return { ok: true as const };
}

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  const gate = requireScoutLineAdmin(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const pending = await prisma.coachJoinRequest.findMany({
    where: { status: "PENDING" as any },
    orderBy: { createdAt: "asc" },
    include: {
      college: { select: { id: true, name: true } },
      requestedByUser: { select: { id: true, email: true, name: true, role: true, collegeId: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      requests: pending.map((r) => ({
        id: r.id,
        status: r.status,
        requestedRole: r.requestedRole,
        proofUrl: r.proofUrl,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        college: r.college ? { id: r.college.id, name: r.college.name } : null,
        requestedByUser: r.requestedByUser
          ? { id: r.requestedByUser.id, email: r.requestedByUser.email, name: r.requestedByUser.name ?? null }
          : null,
      })),
    },
  });
}

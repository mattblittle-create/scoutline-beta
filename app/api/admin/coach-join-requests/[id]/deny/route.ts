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

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const user = await getCurrentUser();
  const gate = requireScoutLineAdmin(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const id = ctx.params.id;
  const body = await req.json().catch(() => ({} as any));
  const notes = String(body?.notes || "").trim();

  const reqRow = await prisma.coachJoinRequest.findUnique({ where: { id } });
  if (!reqRow) return NextResponse.json<Err>({ ok: false, error: "Join request not found." }, { status: 404 });
  if (reqRow.status !== ("PENDING" as any)) {
    return NextResponse.json<Err>({ ok: false, error: `Request is ${reqRow.status}.` }, { status: 400 });
  }

  await prisma.coachJoinRequest.update({
    where: { id },
    data: {
      status: "DENIED" as any,
      decidedAt: new Date(),
      decidedByUserId: user.id,
      notes: notes || reqRow.notes,
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const id = String(ctx.params.id || "").trim();
  if (!id) return NextResponse.json<Err>({ ok: false, error: "Missing id" }, { status: 400 });

  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row) return NextResponse.json<Err>({ ok: false, error: "Not found." }, { status: 404 });
  if (row.userId !== user.id) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

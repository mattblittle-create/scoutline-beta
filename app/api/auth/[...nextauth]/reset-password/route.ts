import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { hash } from "bcrypt";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const rec = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!rec || rec.used || rec.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: rec.userId },
    data: { hashedPassword: await hash(password, 10) },
  });

  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  // TODO (optional): Invalidate active sessions for this user if you store them server-side.

  return NextResponse.json({ ok: true });
}

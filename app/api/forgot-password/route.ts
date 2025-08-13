import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    // Always return ok to avoid email enumeration
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any prior active tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });

      const base = process.env.EMAIL_BASE_URL!;
      const url = `${base}/reset-password?token=${token}`;

      // Send the email (swallow errors to avoid leaking info)
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: "Reset your ScoutLine password",
          html: `
            <p>Hi,</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <p><a href="${url}">Reset Password</a></p>
            <p>If you didn't request this, you can ignore this email.</p>
          `,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Still return ok (no info leak)
    return NextResponse.json({ ok: true });
  }
}

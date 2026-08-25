// app/api/coach/invites/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";
import { sha256 } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeEmail(e: any) {
  return String(e ?? "").trim().toLowerCase();
}

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

async function makeSetPasswordJwt(email: string) {
  const jwt = await new SignJWT({ email, purpose: "set-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());

  return jwt;
}

async function notifyProgramAdminsOfStaffInviteAccepted(params: {
  collegeId: string;
  acceptedUserId: string;
  acceptedEmail: string;
  staffTitle: string;
}) {
  const acceptedUser = await prisma.user.findUnique({
    where: { id: params.acceptedUserId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const displayName =
    acceptedUser?.name || acceptedUser?.email || params.acceptedEmail || "A staff member";

  const admins = await prisma.user.findMany({
    where: {
      collegeId: params.collegeId,
      id: { not: params.acceptedUserId },
      coachProfile: {
        isProgramAdmin: true,
      },
    },
    select: {
      id: true,
      notificationPreference: {
        select: {
          instantStaffActivity: true,
        },
      },
    },
  });

  const adminIds = admins
    .filter((admin) => admin.notificationPreference?.instantStaffActivity !== false)
    .map((admin) => admin.id);

  if (!adminIds.length) return;

  await prisma.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      type: "COACH_STAFF_INVITE_ACCEPTED",
      message: `${displayName} accepted their ScoutLine staff invite as ${params.staffTitle}.`,
      data: {
        collegeId: params.collegeId,
        acceptedUserId: params.acceptedUserId,
        acceptedEmail: params.acceptedEmail,
        staffTitle: params.staffTitle,
        event: "COACH_STAFF_INVITE_ACCEPTED",
      },
    })),
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = String(searchParams.get("token") || "").trim();
    const email = normalizeEmail(searchParams.get("email"));

    if (!token || !email) {
      return NextResponse.json<Err>({ ok: false, error: "Missing token or email." }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);

    const invite: any = await prisma.coachInvite.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return NextResponse.json<Err>({ ok: false, error: "Invite not found." }, { status: 404 });
    }

    if (normalizeEmail(invite.invitedEmail) !== email) {
      return NextResponse.json<Err>({ ok: false, error: "Invite email mismatch." }, { status: 403 });
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json<Err>({ ok: false, error: `Invite is ${invite.status}.` }, { status: 400 });
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      await prisma.coachInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" as any },
      });
      return NextResponse.json<Err>({ ok: false, error: "Invite expired." }, { status: 400 });
    }

    // ✅ Coach job title comes from invite.staffTitle (string)
    const staffTitle = String(invite.staffTitle || "").trim() || "Assistant Coach";

    // Create or find user by email (may or may not have passwordHash yet)
    // IMPORTANT: do NOT overwrite User.role here (system role)
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        collegeId: invite.collegeId,
      },
      create: {
        email,
        collegeId: invite.collegeId,
        phonePrivate: true,
        emailPrivate: true,
      },
      select: { id: true, email: true, collegeId: true, passwordHash: true },
    });

    // ✅ First coach in program becomes admin by default (unless an admin already exists)
    const adminCount = await prisma.coachProfile.count({
      where: {
        isProgramAdmin: true,
        user: { collegeId: invite.collegeId },
      },
    });
    const shouldBeAdmin = adminCount === 0;

    // Ensure coach profile exists (free/no billing) + persist staffTitle + optional admin flag
    await prisma.coachProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        staffTitle,
        isProgramAdmin: shouldBeAdmin,
        coachAccountType: "COLLEGE_COACH" as any,
        coachBillingStatus: "NONE" as any,
        recruitingTargets: [],
      },
      update: {
        staffTitle,
        // only set true on bootstrap; don't auto-unset if later invites come in
        ...(shouldBeAdmin ? { isProgramAdmin: true } : {}),
        coachAccountType: "COLLEGE_COACH" as any,
        coachBillingStatus: "NONE" as any,
      } as any,
    });

// Mark invite accepted
await prisma.coachInvite.update({
  where: { id: invite.id },
  data: {
    status: "ACCEPTED" as any,
    acceptedUserId: user.id,
    acceptedAt: new Date(),
  },
});

await notifyProgramAdminsOfStaffInviteAccepted({
  collegeId: invite.collegeId,
  acceptedUserId: user.id,
  acceptedEmail: user.email,
  staffTitle,
});

    // If user has no password yet, create a SET_PASSWORD JWT + DB token row
    let setPasswordToken: string | null = null;

    if (!user.passwordHash) {
      const jwt = await makeSetPasswordJwt(user.email);

      const tokenHashDb = sha256(jwt);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.verificationToken.create({
        data: {
          id: crypto.randomUUID(),
          email: user.email,
          tokenHash: tokenHashDb,
          purpose: "SET_PASSWORD" as any,
          expiresAt,
        },
      });

      setPasswordToken = jwt;
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: "Invite accepted.",
        email: user.email,
        staffTitle,
        isProgramAdmin: shouldBeAdmin,
        needsSetPassword: !user.passwordHash,
        setPasswordToken,
      },
    });
  } catch (e: any) {
    console.error("coach invite accept error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

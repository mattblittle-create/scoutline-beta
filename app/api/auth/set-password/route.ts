import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { sha256 } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  token?: string;
  password?: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function asString(v: any) {
  return String(v ?? "").trim();
}

type AccountType = "TEAM" | "COACH" | "PLAYER" | "UNKNOWN";

function loginRedirectFor(accountType: AccountType) {
  if (accountType === "TEAM") return "/login?role=team";
  if (accountType === "COACH") return "/login?role=coach";
  if (accountType === "PLAYER") return "/login?role=player";
  return "/login";
}

export async function POST(req: Request) {
  try {
    const { token, password } = (await req.json()) as Body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // 1) Verify JWT (integrity/expiry/purpose/email)
    let email = "";
    let purpose = "";
    let hintedAccount = "";

    try {
      const { payload } = await jwtVerify(token, getSecret());
      email = normalizeEmail((payload as any).email);
      purpose = asString((payload as any).purpose);
      hintedAccount = asString((payload as any).account); // optional future use
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email in token" }, { status: 400 });
    }

    if (purpose !== "set-password") {
      return NextResponse.json({ ok: false, error: "Invalid token purpose" }, { status: 400 });
    }

    // 2) Enforce single-use via DB row (atomic consume)
    const tokenHash = sha256(token);
    const now = new Date();

    // 3) Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 4) Transaction:
    //    - consume this exact token if valid
    //    - set passwordHash ONLY (do NOT touch role)
    //    - invalidate sibling tokens
    const result = await prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationToken.updateMany({
        where: {
          tokenHash,
          purpose: "SET_PASSWORD",
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        return { ok: false as const, reason: "Token already used or expired" };
      }

      // IMPORTANT:
      // - Do NOT create CoachProfile / Team / Player here
      // - Do NOT clobber user.role
      // - If user doesn't exist, create the bare minimum user row
      await tx.user.upsert({
        where: { email },
        create: {
          email,
          passwordHash,
          // Keep defaults consistent
          phonePrivate: true,
          emailPrivate: true,
          // role intentionally NOT set here (role is assigned by onboarding flows)
        },
        update: { passwordHash },
      });

      await tx.verificationToken.updateMany({
        where: { email, purpose: "SET_PASSWORD", consumedAt: null },
        data: { consumedAt: now },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    }

    // After password set, determine what this account actually is (DB truth > token hint)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        Player: { select: { id: true } },
        coachProfile: { select: { id: true } },
        teamMemberships: {
          select: { id: true, role: true, team: { select: { id: true, slug: true, name: true } } },
        },
      },
    });

    let accountType: AccountType = "UNKNOWN";

    const hasTeamAdminMembership =
      !!user?.teamMemberships?.some((m: any) => String(m.role) === "TEAM_ADMIN");

    if (hasTeamAdminMembership) accountType = "TEAM";
    else if (user?.coachProfile?.id) accountType = "COACH";
    else if (user?.Player?.id) accountType = "PLAYER";
    else {
      // As a fallback, use role string if present (but DB relations win)
      const r = String(user?.role || "").toUpperCase();
      if (r.includes("TEAM")) accountType = "TEAM";
      else if (r.includes("COACH")) accountType = "COACH";
      else if (r.includes("PLAYER")) accountType = "PLAYER";
      else if (hintedAccount) {
        const h = hintedAccount.toUpperCase();
        if (h === "TEAM" || h === "COACH" || h === "PLAYER") accountType = h as AccountType;
      }
    }

    const redirectTo = loginRedirectFor(accountType);

    return NextResponse.json({
      ok: true,
      data: {
        email,
        accountType,
        redirectTo,
      },
    });
  } catch (err: any) {
    console.error("set-password error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

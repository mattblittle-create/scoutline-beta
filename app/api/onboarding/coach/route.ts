// app/api/onboarding/coach/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";
import crypto from "crypto";
import { SignJWT } from "jose";
import { sha256 } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name: string;
  role: string; // coach staff title (preset string)
  collegeProgram: string;
  workEmail: string;
  workPhone?: string;
  workPhoneExt?: string;
  phonePrivate?: boolean;
};

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

async function makeSetPasswordJwt(email: string) {
  // purpose must match /api/auth/set-password expectation: "set-password"
  return new SignJWT({ email, purpose: "set-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

function getOriginFromHeaders(req: Request) {
  const h = req.headers;
  const proto = (h.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const reqBody = (await req.json().catch(() => ({}))) as Partial<Body>;

    const name = String(reqBody?.name || "").trim();
    const staffTitle = String(reqBody?.role || "").trim(); // ✅ store on CoachProfile
    const collegeProgram = String(reqBody?.collegeProgram || "").trim();

    const workEmail = normalizeEmail(reqBody?.workEmail);
    const workPhone = digitsOnly(reqBody?.workPhone || "").slice(0, 10);
    const workPhoneExt = digitsOnly(reqBody?.workPhoneExt || "").slice(0, 6);
    const phonePrivate = reqBody?.phonePrivate === false ? false : true;

    if (!workEmail) {
      return NextResponse.json({ ok: false, error: "Work email is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: "Coach name is required." }, { status: 400 });
    }
    if (!staffTitle) {
      return NextResponse.json({ ok: false, error: "Role is required." }, { status: 400 });
    }
    if (!collegeProgram) {
      return NextResponse.json({ ok: false, error: "College / University is required." }, { status: 400 });
    }

    // Determine slug only if missing
    const existing = await prisma.user.findUnique({
      where: { email: workEmail },
      select: { id: true, slug: true, passwordHash: true },
    });

    let slugToSet: string | undefined;
    if (!existing?.slug && name) {
      const base = slugifyName(name);
      slugToSet = await generateUniqueSlug(prisma, base);
    }

    // We'll mint a set-password token ONLY if user currently has no passwordHash
    const shouldMintSetPassword = !existing?.passwordHash;

    // Do everything in a transaction so the token matches the persisted user
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: workEmail },
        update: {
          name,
          program: collegeProgram,
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
          ...(slugToSet ? { slug: slugToSet } : {}),
        },
        create: {
          email: workEmail,
          name,
          program: collegeProgram,
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
          slug: slugToSet,
          // emailPrivate/phonePrivate already default; phonePrivate overridden above
        },
        select: { id: true, email: true, name: true, slug: true, passwordHash: true },
      });

      // Ensure CoachProfile exists + persist staffTitle (free/no billing)
      await tx.coachProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          staffTitle,
          coachAccountType: "COLLEGE_COACH" as any,
          coachBillingStatus: "NONE" as any,
          recruitingTargets: [],
        },
        update: {
          staffTitle,
          coachAccountType: "COLLEGE_COACH" as any,
          coachBillingStatus: "NONE" as any,
        },
      });

      let setPasswordToken: string | null = null;

      if (!user.passwordHash) {
        const jwt = await makeSetPasswordJwt(user.email);
        const tokenHashDb = sha256(jwt);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // invalidate any older outstanding SET_PASSWORD tokens for this email
        await tx.verificationToken.updateMany({
          where: { email: user.email, purpose: "SET_PASSWORD" as any, consumedAt: null },
          data: { consumedAt: new Date() },
        });

        await tx.verificationToken.create({
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

      return { user, setPasswordToken };
    });

    // Build a link that works in dev + prod behind proxies
    const origin = getOriginFromHeaders(req);
    const setPasswordLink =
      result.setPasswordToken && origin
        ? `${origin}/auth/set-password?token=${encodeURIComponent(result.setPasswordToken)}`
        : null;

    // In prod you’ll email the setPasswordLink. In dev, returning it is convenient.
    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? null,
          slug: result.user.slug ?? null,
          staffTitle,
          program: collegeProgram,
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
        },
        needsSetPassword: !result.user.passwordHash,
        setPasswordToken: result.setPasswordToken, // keep for UI flow
        setPasswordLink, // dev-friendly
        emailDispatch: {
          // placeholder for later (SendGrid/Postmark/etc.)
          sent: false,
          to: workEmail,
        },
      },
    });
  } catch (err: any) {
    console.error("coach onboarding error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

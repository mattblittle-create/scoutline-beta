// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { email?: string; password?: string };

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing email or password" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const redirectTo = await getPostLoginRedirect(user.id);

    const res = NextResponse.json({
      ok: true,
      redirectTo,
    });

    res.cookies.set("scoutline_uid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    if (process.env.NODE_ENV !== "production") {
      res.cookies.set("scoutline_uid_dbg", user.id, {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }

    return res;
  } catch (err: any) {
    console.error("login error:", err?.stack || err);

    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV !== "production"
            ? String(err?.message || err || "Server error")
            : "Server error",
      },
      { status: 500 }
    );
  }
}
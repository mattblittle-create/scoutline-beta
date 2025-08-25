// app/api/auth/dev-issue-token/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Force node runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  purpose: "set-password" | "verify-email" | "reset-password";
};

export async function POST(req: Request) {
  try {
    // 🔐 Check secret header
    const provided = req.headers.get("x-dev-secret");
    if (!provided || provided !== process.env.DEV_ISSUE_TOKEN_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { email, purpose } = (await req.json()) as Body;
    if (!email || !purpose) {
      return NextResponse.json(
        { ok: false, error: "Missing email or purpose" },
        { status: 400 }
      );
    }

    const secret = process.env.APP_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing APP_SECRET" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { email, purpose },
      secret,
      { expiresIn: "1h" } // good enough for testing
    );

    return NextResponse.json({ ok: true, token });
  } catch (err: any) {
    console.error("dev-issue-token error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}


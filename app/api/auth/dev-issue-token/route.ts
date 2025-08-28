// app/api/auth/dev-issue-token/route.ts
import { NextResponse } from "next/server";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  purpose: "set-password" | "reset-password" | "verify-email";
  expiresIn?: string; // e.g. "1h" or "900" (seconds)
};

export async function POST(req: Request) {
  try {
    // Gate behind a shared secret header so this isn't publicly usable
    const headerSecret = req.headers.get("x-dev-secret") || "";
    const expected = process.env.DEV_ISSUE_TOKEN_SECRET || "";
    if (!expected || headerSecret !== expected) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized (bad dev secret)" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const purpose = body.purpose;
    const expiresIn = body.expiresIn || "1h";

    if (!email || !purpose) {
      return NextResponse.json(
        { ok: false, error: "Missing email or purpose" },
        { status: 400 }
      );
    }

    const secretEnv = process.env.APP_SECRET;
    if (!secretEnv) {
      return NextResponse.json(
        { ok: false, error: "Missing APP_SECRET" },
        { status: 500 }
      );
    }

    // ✅ Make TS happy: cast to the proper jsonwebtoken types
    const secret: Secret = secretEnv;
    const signOpts: SignOptions = { expiresIn }; // string | number is allowed

    // Sign a short-lived JWT
    const token = jwt.sign({ email, purpose }, secret, signOpts);

    return NextResponse.json({ ok: true, token });
  } catch (err: any) {
    console.error("dev-issue-token error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}


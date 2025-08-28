// app/api/auth/dev-issue-token/route.ts
import { NextResponse } from "next/server";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  purpose: "set-password" | "reset-password" | "verify-email";
  // Accept strings like "1h" or numeric seconds "3600"
  expiresIn?: string;
};

export async function POST(req: Request) {
  try {
    // Protect with shared secret header so this isn't publicly usable
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
    const rawExpiresIn = body.expiresIn || "1h";

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

    // jsonwebtoken’s typings sometimes require a stricter union.
    // Normalize: if it’s all digits, use a number; otherwise keep string.
    const normalizedExpiresIn: number | string = /^\d+$/.test(rawExpiresIn)
      ? Number(rawExpiresIn)
      : (rawExpiresIn as string);

    const secret: Secret = secretEnv;
    const signOpts: SignOptions = { expiresIn: normalizedExpiresIn as any };

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


// app/api/auth/dev-issue-token/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  purpose: "set-password" | "reset-password" | "verify-email";
  expiresIn?: string; // e.g. "1h"
};

export async function POST(req: Request) {
  try {
    // ---- Dev secret checks with helpful diagnostics ----
    const provided = req.headers.get("x-dev-secret") || "";
    const configured = process.env.DEV_ISSUE_TOKEN_SECRET || "";

    if (!configured) {
      return NextResponse.json(
        { ok: false, error: "Missing DEV_ISSUE_TOKEN_SECRET on server" },
        { status: 500 }
      );
    }

    if (!provided) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", reason: "missing-header" },
        { status: 401 }
      );
    }

    if (provided !== configured) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
          reason: "mismatch",
          providedLen: provided.length,
          expectedLen: configured.length,
          providedPreview: `${provided.slice(0, 3)}...${provided.slice(-3)}`,
          expectedPreview: `${configured.slice(0, 3)}...${configured.slice(-3)}`,
        },
        { status: 401 }
      );
    }
    // ----------------------------------------------------

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

    const secret = process.env.APP_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing APP_SECRET" },
        { status: 500 }
      );
    }

    const token = jwt.sign({ email, purpose }, secret, { expiresIn });

    return NextResponse.json({ ok: true, token });
  } catch (err: any) {
    console.error("dev-issue-token error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

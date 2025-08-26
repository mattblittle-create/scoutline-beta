// app/api/auth/dev-issue-token/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { TokenPurpose } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  purpose: "set-password" | "reset-password" | "verify-email";
  expiresIn?: string; // e.g. "1h"
};

function sha256(hexInput: string) {
  return crypto.createHash("sha256").update(hexInput).digest("hex");
}

export async function POST(req: Request) {
  try {
    // simple shared-secret gate (dev only)
    const provided = req.headers.get("x-dev-secret") || "";
    const expected = process.env.DEV_ISSUE_TOKEN_SECRET || "";
    if (!expected || provided !== expected) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", reason: "mismatch" },
        { status: 401 }
      );
    }

    const { email: rawEmail, purpose, expiresIn = "1h" } = (await req.json()) as Body;
    const email = (rawEmail || "").trim().toLowerCase();
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

    // Sign a JWT (no need for jti since we store hash)
    const token = jwt.sign({ email, purpose }, secret, { expiresIn });

    // Decode to get exp -> expiresAt
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt =
      decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);

    // Persist a VerificationToken row so /set-password will accept it
    const tokenHash = sha256(token);
    const id = crypto.randomUUID(); // primary key
    const prismaPurpose =
      purpose === "set-password"
        ? TokenPurpose.SET_PASSWORD
        : purpose === "reset-password"
        ? TokenPurpose.RESET_PASSWORD
        : TokenPurpose.VERIFY_EMAIL;

    await prisma.verificationToken.create({
      data: {
        id,
        email,
        tokenHash,
        purpose: prismaPurpose,
        expiresAt,
      },
    });

    return NextResponse.json({ ok: true, token, expiresAt });
  } catch (err: any) {
    console.error("dev-issue-token error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}


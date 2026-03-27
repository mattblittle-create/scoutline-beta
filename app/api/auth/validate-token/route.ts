// app/api/auth/validate-token/route.ts
import { NextResponse } from "next/server";
import { findValidVerificationToken } from "@/lib/auth/tokens";

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizePurpose(v: unknown) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "SET_PASSWORD") return "SET_PASSWORD";
  if (s === "RESET_PASSWORD") return "RESET_PASSWORD";
  if (s === "VERIFY_EMAIL") return "VERIFY_EMAIL";
  return "";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawToken = normalizeText(url.searchParams.get("token"));
    const purpose = normalizePurpose(url.searchParams.get("purpose"));

    if (!rawToken || !purpose) {
      return NextResponse.json(
        { ok: false, valid: false, error: "Missing token or purpose." },
        { status: 400 }
      );
    }

    const token = await findValidVerificationToken({
      rawToken,
      purpose: purpose as "SET_PASSWORD" | "RESET_PASSWORD" | "VERIFY_EMAIL",
    });

    if (!token) {
      return NextResponse.json({ ok: true, valid: false });
    }

    return NextResponse.json({
      ok: true,
      valid: true,
      email: token.email,
      expiresAt: token.expiresAt,
    });
  } catch (err: any) {
    console.error("[auth] validate-token error", err);
    return NextResponse.json(
      { ok: false, valid: false, error: err?.message || "Failed to validate token." },
      { status: 500 }
    );
  }
}
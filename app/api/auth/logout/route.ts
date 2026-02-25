// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expireCookie(res: NextResponse, name: string) {
  // 1) Use delete (best if available)
  try {
    res.cookies.delete(name);
  } catch {
    // ignore
  }

  // 2) Also explicitly overwrite with expired values.
  // We do both httpOnly true/false variants to cover how it may have been set.
  const common = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set(name, "", { ...common, httpOnly: true });
  res.cookies.set(name, "", { ...common, httpOnly: false });
}

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });

  expireCookie(res, "scoutline_uid");
  expireCookie(res, "scoutline_uid_dbg");
  expireCookie(res, "scoutline_dev_email");

  return res;
}

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export async function GET() {
  const all = cookies().getAll().map(c => ({
    name: c.name,
    // don't leak values fully; show first 10 chars
    valuePreview: (c.value || "").slice(0, 10),
  }));

  return NextResponse.json({
    ok: true,
    cookieCount: all.length,
    cookies: all,
    host: headers().get("host"),
    proto: headers().get("x-forwarded-proto"),
  });
}

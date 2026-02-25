// app/api/uploads/local/delete/route.ts
import { NextResponse } from "next/server";
import { stat, unlink } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Local delete endpoint is disabled outside development." },
      { status: 403 }
    );
  }

  let body: { publicUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const publicUrl = (body.publicUrl || "").trim();
  if (!publicUrl || !publicUrl.startsWith("/uploads/videos/")) {
    return NextResponse.json(
      { ok: false, error: "Invalid or unsupported publicUrl." },
      { status: 400 }
    );
  }

  // Map /uploads/videos/XYZ -> <project>/public/uploads/videos/XYZ
  const rel = publicUrl.replace(/^\/+/, ""); // strip leading slash
  const abs = path.join(process.cwd(), "public", rel.replace(/^uploads\//, "")); // guard against double "uploads/"

  try {
    const s = await stat(abs);
    if (!s.isFile()) {
      return NextResponse.json({ ok: false, error: "Target is not a file." }, { status: 400 });
    }
    await unlink(abs);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Delete failed." },
      { status: 500 }
    );
  }
}

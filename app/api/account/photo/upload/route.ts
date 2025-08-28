// app/api/account/photo/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max 5MB, allow common image types
const MAX = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    // Expect multipart/form-data with a "file" field
    const ctype = req.headers.get("content-type") || "";
    if (!ctype.includes("multipart/form-data")) {
      return NextResponse.json(
        { ok: false, error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }
    if (file.size > MAX) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Create a stable-ish filename and upload
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const key = `coach-photos/${crypto.randomUUID()}-${safeName}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const blob = await put(key, buf, {
      access: "public",
      contentType: file.type,
      // If you deploy on Vercel, set BLOB_READ_WRITE_TOKEN in Project → Settings → Environment Variables.
      // For local dev, add it to .env.local as well.
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err: any) {
    console.error("photo/upload error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

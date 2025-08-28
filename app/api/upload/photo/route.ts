// app/api/upload/photo/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      );
    }

    // Expect multipart/form-data with "file"
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file missing" }, { status: 400 });
    }

    const type = (file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 });
    }

    // Read file bytes and convert to a Node Buffer (✅ satisfies @vercel/blob typings)
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    // Build a stable object key
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const now = Date.now();
    const random = Math.random().toString(36).slice(2);
    const objectKey = `coach-photos/${now}-${random}.${ext}`;

    // Upload to Vercel Blob
    const { url } = await put(objectKey, buf, {
      access: "public",
      token,
      contentType: type,
    });

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("upload photo error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

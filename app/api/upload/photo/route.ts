// app/api/upload/photo/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";         // keep Node for better error messages
export const dynamic = "force-dynamic";

// Adjust as you wish
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    // Must be multipart/form-data
    const form = await req.formData();

    const file = form.get("file");
    const email = String(form.get("email") || "").trim().toLowerCase();

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // Validate type & size
    const type = (file as File).type || "";
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported image type. Use JPG/PNG/WebP." },
        { status: 400 }
      );
    }

    const bytes = await (file as File).arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image too large (max 5MB)." },
        { status: 400 }
      );
    }

    // Require Vercel Blob token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Storage not configured (missing BLOB_READ_WRITE_TOKEN)." },
        { status: 500 }
      );
    }

    // Construct a deterministic-ish path (you can change this)
    // Example: users/matt.b.little_gmail_com/1692999999999.jpg
    const safeEmail = email.replace(/[^a-z0-9]+/g, "_");
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const objectKey = `users/${safeEmail}/${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const { url } = await put(objectKey, new Uint8Array(bytes), {
      access: "public",
      token,                 // required for server-side writes
      contentType: type,
      addRandomSuffix: false // we already used timestamp
    });

    // Return public URL to the client
    return NextResponse.json({ ok: true, photoUrl: url });
  } catch (err: any) {
    console.error("upload photo error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

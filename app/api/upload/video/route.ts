// app/api/upload/video/route.ts

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 500 * 1024 * 1024; // 500MB

const ALLOWED = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
  "video/ogg",
]);

function safeSlug(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

function extFor(name: string, type: string): string {
  const lower = (name || "").toLowerCase();

  if (lower.endsWith(".mp4") || type === "video/mp4") return ".mp4";
  if (
    lower.endsWith(".mov") ||
    lower.endsWith(".m4v") ||
    type === "video/quicktime"
  ) return ".mov";
  if (lower.endsWith(".webm") || type === "video/webm") return ".webm";
  if (
    lower.endsWith(".ogg") ||
    lower.endsWith(".ogv") ||
    type === "video/ogg"
  ) return ".ogg";

  return "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const userSlugRaw = formData.get("userSlug");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    const fileObj = file as File;
    const mime = String(fileObj.type || "").toLowerCase();

    if (fileObj.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 500MB." },
        { status: 400 }
      );
    }

    const ext = extFor(fileObj.name || "", mime);
    if (!ALLOWED.has(mime) && !ext) {
      return NextResponse.json(
        { ok: false, error: "Unsupported video type. Please upload MP4, MOV, WEBM, or OGG." },
        { status: 400 }
      );
    }

    const userSlug =
      typeof userSlugRaw === "string" && userSlugRaw.trim()
        ? safeSlug(userSlugRaw)
        : "player";

    const baseName =
      (fileObj.name || "video")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "video";

    const finalExt = ext || ".mp4";
    const key = `videos/${userSlug}/${crypto.randomUUID()}-${baseName}${finalExt}`;

    const blob = await put(key, fileObj, {
      access: "public",
      contentType: mime || "application/octet-stream",
      addRandomSuffix: false,
    });

    return NextResponse.json(
      {
        ok: true,
        files: [
          {
            publicUrl: blob.url,
            filename: fileObj.name || "video",
            size: fileObj.size,
            type: mime || "",
          },
        ],
        url: blob.url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Video upload route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload error" },
      { status: 500 }
    );
  }
}
// app/api/account/photo/upload-url/route.ts
import { NextResponse } from "next/server";
import { generateUploadURL } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const url = await generateUploadURL({
      // keep these guards; tweak as you like
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
      maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
    });

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("upload-url error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

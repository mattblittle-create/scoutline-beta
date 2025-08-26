// app/api/account/photo/upload-url/route.ts
import { NextResponse } from "next/server";
import { generateUploadURL } from "@vercel/blob/client"; // server-safe helper

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // (Optional) enforce auth here later if needed

    // Limit mime types to images and max size (e.g., 5 MB)
    const { url, token } = await generateUploadURL({
      access: "public", // so you can show it on public profile
      contentType: ["image/jpeg", "image/png", "image/jpg"],
      maximumSize: 5 * 1024 * 1024, // 5 MB
    });

    return NextResponse.json({ ok: true, url, token });
  } catch (err: any) {
    console.error("upload-url error:", err);
    return NextResponse.json({ ok: true, photoUrl: publicUrl });

  }
}

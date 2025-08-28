// app/api/account/photo/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Save file in Blob store
    const blob = await put(`photos/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err: any) {
    console.error("photo upload error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

// app/api/profile/photo/route.ts
import { NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This assumes you identify the current user by email passed from the client
// (you can wire it to your auth/session later; email is simplest for now).
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const email = (form.get("email") as string | null)?.toLowerCase().trim();
    const file = form.get("file") as File | null;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Basic guardrails
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "File must be an image" }, { status: 400 });
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "Image too large (max 5MB)" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `users/${encodeURIComponent(email)}/${Date.now()}.${ext}`;
    const url = await uploadToBlob({
      file,
      filename: safeName,
      contentType: file.type,
    });

    // Save on the user
    await prisma.user.update({
      where: { email },
      data: { photoUrl: url },
    });

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("photo upload error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

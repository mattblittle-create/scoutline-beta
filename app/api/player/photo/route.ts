// app/api/player/photo/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import sharp from "sharp";

// 🔄 Dev store sync so public route (which uses devStore) sees photoUrl
// If you don't have these, add them to /lib/devStore.ts
import { getByEmail as devGetByEmail, saveUser as devSaveUser } from "@/lib/devStore";

export const runtime = "nodejs"; // Blob SDK + sharp require Node.js runtime

// Allow these mime types (includes HEIC/HEIF)
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/heic",
  "image/heif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIM = 1600; // max width/height on the long edge for processed images
const JPEG_QUALITIES = [85, 75, 65]; // try in order to fit under 5MB

async function heicToJpegUnderCap(input: Buffer) {
  // Resize to fit, then try multiple JPEG qualities to meet size cap
  for (const q of JPEG_QUALITIES) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: q, progressive: true, mozjpeg: true })
      .toBuffer();
    if (out.length <= MAX_SIZE_BYTES) {
      return { data: out, contentType: "image/jpeg", ext: "jpg" as const };
    }
  }
  // Last attempt (lowest quality already tried)
  const finalOut = await sharp(input)
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITIES[JPEG_QUALITIES.length - 1], progressive: true, mozjpeg: true })
    .toBuffer();
  if (finalOut.length > MAX_SIZE_BYTES) {
    throw new Error("Converted image exceeds 5MB. Please choose a smaller photo.");
  }
  return { data: finalOut, contentType: "image/jpeg", ext: "jpg" as const };
}

async function jpegMaybeRescaleCap(input: Buffer) {
  const meta = await sharp(input).metadata();
  const needsResize = (meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM;
  const tooBig = input.length > MAX_SIZE_BYTES;

  // Only touch JPEG if necessary: either too many pixels or over size cap
  if (!needsResize && !tooBig) {
    return { data: input, contentType: "image/jpeg", ext: "jpg" as const };
  }

  for (const q of JPEG_QUALITIES) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: q, progressive: true, mozjpeg: true })
      .toBuffer();
    if (out.length <= MAX_SIZE_BYTES) {
      return { data: out, contentType: "image/jpeg", ext: "jpg" as const };
    }
  }

  const finalOut = await sharp(input)
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITIES[JPEG_QUALITIES.length - 1], progressive: true, mozjpeg: true })
    .toBuffer();

  if (finalOut.length > MAX_SIZE_BYTES) {
    throw new Error("Converted image exceeds 5MB. Please choose a smaller photo.");
  }
  return { data: finalOut, contentType: "image/jpeg", ext: "jpg" as const };
}

async function pngProcess(input: Buffer) {
  const img = sharp(input);
  const meta = await img.metadata();
  const hasAlpha = !!meta.hasAlpha;

  // Always constrain dimensions if needed
  const resized = await img
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .toBuffer();

  if (hasAlpha) {
    // Keep PNG if transparency present; try to compress
    // palette:true enables quantization for smaller files
    const out = await sharp(resized).png({ compressionLevel: 9, palette: true }).toBuffer();
    if (out.length > MAX_SIZE_BYTES) {
      throw new Error("Converted image exceeds 5MB. Please choose a smaller photo.");
    }
    return { data: out, contentType: "image/png", ext: "png" as const };
  } else {
    // No alpha → convert to JPEG for size efficiency
    for (const q of JPEG_QUALITIES) {
      const out = await sharp(resized).jpeg({ quality: q, progressive: true, mozjpeg: true }).toBuffer();
      if (out.length <= MAX_SIZE_BYTES) {
        return { data: out, contentType: "image/jpeg", ext: "jpg" as const };
      }
    }
    const finalOut = await sharp(resized)
      .jpeg({ quality: JPEG_QUALITIES[JPEG_QUALITIES.length - 1], progressive: true, mozjpeg: true })
      .toBuffer();
    if (finalOut.length > MAX_SIZE_BYTES) {
      throw new Error("Converted image exceeds 5MB. Please choose a smaller photo.");
    }
    return { data: finalOut, contentType: "image/jpeg", ext: "jpg" as const };
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const file = form.get("file");

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Validate input type; we no longer hard-fail on pre-size, since we may shrink it
    const contentType = (file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { ok: false, error: "Only .jpg, .jpeg, .png, .heic are allowed" },
        { status: 400 }
      );
    }

    // Look up user in Prisma
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Read into Buffer
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Normalize/resize/compress depending on type
    let processed:
      | { data: Buffer; contentType: string; ext: "jpg" | "png" }
      | null = null;

    if (contentType === "image/heic" || contentType === "image/heif") {
      processed = await heicToJpegUnderCap(inputBuffer);
    } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      processed = await jpegMaybeRescaleCap(inputBuffer);
    } else if (contentType.includes("png")) {
      processed = await pngProcess(inputBuffer);
    } else {
      // Safety — should not reach here due to ALLOWED_TYPES, but keep a guard
      return NextResponse.json(
        { ok: false, error: "Unsupported image type." },
        { status: 400 }
      );
    }

    // Final post-process size check (defense-in-depth)
    if (processed.data.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Converted image exceeds 5MB. Please choose a smaller photo." },
        { status: 400 }
      );
    }

    // Create deterministic-ish path (no PII)
    const key = `user-photos/${user.id}-${Date.now()}.${processed.ext}`;

    // ✅ Upload to Vercel Blob using Buffer directly (Node runtime)
    const { url } = await put(key, processed.data, {
      access: "public",
      contentType: processed.contentType,
    });

    // Save URL on the user (Prisma)
    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: url },
    });

    // 🔄 Mirror to dev store so /api/public/player/[slug] (which uses devStore) sees it
    try {
      const existing = (await devGetByEmail(email)) || { email };
      const updated = { ...existing, photoUrl: url };
      await devSaveUser(updated as any);
    } catch {
      // Non-fatal in dev; ignore
    }

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("POST /api/player/photo error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

// Optional: allow removing the photo reference
// DELETE /api/player/photo?email=...
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // Clear in Prisma (ignore if user missing)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { photoUrl: null },
      });
    }

    // 🔄 Mirror removal to dev store
    try {
      const existing = await devGetByEmail(email);
      if (existing) {
        const { photoUrl: _omit, ...rest } = existing;
        await devSaveUser(rest as any);
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/player/photo error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
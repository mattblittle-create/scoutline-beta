// app/api/upload/photo/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";        // Prisma needs Node runtime (not Edge)
export const dynamic = "force-dynamic"; // avoid caching

// Max upload size (35 MB)
const MAX_BYTES = 35 * 1024 * 1024;

// Keep HEIC if you really want to allow it, but browsers often can't render it.
// Align with client-side allow list: JPG/PNG/WEBP/HEIC/HEIF
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function extFor(type: string): string {
  switch (type) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
    case "image/heif":
      return ".heic";
    default:
      return "";
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    // The client supplies "userSlug".
    // Historically, this may be the actual slug OR just the email local-part.
    // We'll handle both when updating the DB.
    const userSlug = String(form.get("userSlug") ?? "").trim().toLowerCase();

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }
    if (!userSlug) {
      return NextResponse.json({ ok: false, error: "Missing userSlug" }, { status: 400 });
    }

    // Size guard (35 MB)
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 35MB." },
        { status: 400 }
      );
    }

    const type = (file.type || "").toLowerCase();
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    // NOTE: If the file is HEIC/HEIF, many browsers can't display it in <img>.
    // We still store it correctly, but advise users to upload JPG/PNG/WEBP for widest support.
    const isHeic = type === "image/heic" || type === "image/heif";

    // Use the (slug or email-local) as a folder prefix; file name is a UUID with proper extension.
    const key = `${userSlug}/${crypto.randomUUID()}${extFor(type)}`;

    // Store in Vercel Blob
    const blob = await put(key, file, {
      access: "public",
      contentType: type || "image/jpeg",
      addRandomSuffix: false,
    });

// Persist to DB so the public page picks it up immediately.
// Robust lookup: by slug OR by email local-part (e.g., "braden.little2@").
try {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { slug: userSlug },
        { email: { startsWith: `${userSlug}@`, mode: "insensitive" } },
      ],
    },
    select: { id: true, slug: true },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: blob.url },
    });

    // Try to refresh PublicProfileCache.primaryPhotoUrl if present
    if (user.slug) {
      try {
        const cached = await prisma.publicProfileCache.findUnique({
          where: { slug: user.slug },
          select: { data: true },
        });
        if (cached?.data) {
          const next = { ...(cached.data as any) };
          // If render-shaped, set profile.primaryPhotoUrl; otherwise wrap minimal
          if (next.profile && typeof next.profile === "object") {
            next.profile.primaryPhotoUrl = blob.url;
          } else {
            next.profile = { ...next, primaryPhotoUrl: blob.url };
          }
          await prisma.publicProfileCache.update({
            where: { slug: user.slug },
            data: { data: next },
          });
        }
      } catch {
        // cache may not exist — ignore
      }
    }
  } else {
    // Not fatal; return URL anyway so the UI can still preview it
    console.warn(
      `[upload photo] No matching user by slug or email local-part: "${userSlug}". DB cache not updated.`
    );
  }
} catch (err) {
  // Non-fatal — still return the URL
  console.warn("[upload photo] DB update skipped:", err);
}

    return NextResponse.json({
      ok: true,
      url: blob.url,
      note: isHeic ? "HEIC uploaded; some browsers cannot display HEIC. Prefer JPG/PNG/WEBP." : undefined,
    });
  } catch (e) {
    console.error("[upload/photo] error:", e);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}

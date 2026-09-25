import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 35 * 1024 * 1024;

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

function slugify(input: string) {
  return (
    String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "college"
  );
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 35MB." },
        { status: 400 }
      );
    }

    const type = String(file.type || "").toLowerCase();
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        collegeId: true,
        college: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!user?.collegeId || !user.college?.id) {
      return NextResponse.json(
        { ok: false, error: "Your coach account is not linked to a college." },
        { status: 400 }
      );
    }

    const folder =
      user.college.slug ||
      slugify(user.college.name || "") ||
      user.college.id;

    const key = `college-logos/${folder}/${crypto.randomUUID()}${extFor(type)}`;

    const blob = await put(key, file, {
      access: "public",
      contentType: type || "image/jpeg",
      addRandomSuffix: false,
    });

    await prisma.college.update({
      where: { id: user.college.id },
      data: {
        logoUrl: blob.url,
        programProfileUpdatedAt: new Date(),
        programProfileUpdatedByUserId: sessionUser.id,
      },
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (e) {
    console.error("[upload/college-logo] error:", e);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
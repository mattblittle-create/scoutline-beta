import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

function safeBaseName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 40);
  return base || "upload";
}

function extFromType(mime: string) {
  const t = mime.toLowerCase();
  if (t === "image/jpeg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return null;
}

// POST /api/uploads/image
// form-data:
// - file: File
// - kind: "coach-photo" | "college-logo" (optional)
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
    }

    const kind = String(form.get("kind") || "upload").trim();
    const mime = String(file.type || "").trim();

    const ext = extFromType(mime);
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Only JPG, PNG, or WEBP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 6MB)." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const base = safeBaseName(kind);
    const stamp = Date.now();
    const rand = Math.random().toString(16).slice(2, 8);
    const filename = `${base}-${stamp}-${rand}.${ext}`;

    const outPath = path.join(uploadsDir, filename);
    await fs.writeFile(outPath, bytes);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("upload image error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload failed." },
      { status: 500 }
    );
  }
}

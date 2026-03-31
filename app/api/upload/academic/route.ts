// app/api/upload/academic/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const ALLOWED_EXTS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25MB per file

function toSafeSlug(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const userSlugRaw = formData.get("userSlug");
    const folderRaw = String(formData.get("folder") ?? "academic").trim().toLowerCase();

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const userSlug =
      typeof userSlugRaw === "string" && userSlugRaw.trim()
        ? toSafeSlug(userSlugRaw)
        : "player";

    const fileObj = file as File;

    if (fileObj.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 25MB." },
        { status: 400 }
      );
    }

    const origName = fileObj.name || "academic-file";
    const safeName =
      origName
        .replace(/[^a-zA-Z0-9.\- _]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "academic-file";

    const ext = (path.extname(safeName) || "").toLowerCase();
    const mime = String(fileObj.type || "").toLowerCase();

    if (!ALLOWED_EXTS.has(ext) && !ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload PDF, Word, or Excel." },
        { status: 400 }
      );
    }

    const baseNoExt = path.basename(safeName, ext || undefined);
    const finalName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${baseNoExt}${ext || ""}`;

    const academicDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      folderRaw,
      userSlug
    );

    await fs.mkdir(academicDir, { recursive: true });

    const absPath = path.join(academicDir, finalName);
    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(absPath, buffer);

    const publicUrl = `/uploads/${folderRaw}/${userSlug}/${finalName}`;

    return NextResponse.json({ ok: true, url: publicUrl }, { status: 200 });
  } catch (err: any) {
    console.error("Academic upload route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload error" },
      { status: 500 }
    );
  }
}
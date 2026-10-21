import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function extFor(name: string, type: string): string {
  const lower = (name || "").toLowerCase();

  if (lower.endsWith(".pdf") || type === "application/pdf") return ".pdf";
  if (lower.endsWith(".doc") || type === "application/msword") return ".doc";
  if (
    lower.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return ".docx";
  if (lower.endsWith(".xls") || type === "application/vnd.ms-excel") return ".xls";
  if (
    lower.endsWith(".xlsx") ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) return ".xlsx";

  return "";
}

function safeSlug(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userSlugRaw = String(form.get("userSlug") ?? "").trim();
    const folderRaw = String(form.get("folder") ?? "academic").trim().toLowerCase();

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 25MB." },
        { status: 400 }
      );
    }

    const type = (file.type || "").toLowerCase();
    const ext = extFor(file.name || "", type);

    if (!ALLOWED.has(type) && !ext) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload PDF, Word, or Excel." },
        { status: 400 }
      );
    }

    const userSlug = safeSlug(userSlugRaw);
    const baseName =
      (file.name || "academic-file")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "academic-file";

    const key = `${folderRaw}/${userSlug}/${crypto.randomUUID()}-${baseName}${ext}`;

    const blob = await put(key, file, {
      access: "public",
      contentType: type || "application/octet-stream",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (e: any) {
    console.error("[upload/academic] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
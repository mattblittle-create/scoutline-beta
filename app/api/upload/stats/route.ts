// app/api/upload/stats/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED_EXTS = new Set([".csv", ".xls", ".xlsx", ".pdf"]);
const ALLOWED_MIME = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
]);

function safeSlug(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

function extFor(name: string, type: string): string {
  const lower = (name || "").toLowerCase();

  if (lower.endsWith(".csv") || type === "text/csv" || type === "application/csv") return ".csv";
  if (lower.endsWith(".xls") || type === "application/vnd.ms-excel") return ".xls";
  if (
    lower.endsWith(".xlsx") ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) return ".xlsx";
  if (lower.endsWith(".pdf") || type === "application/pdf") return ".pdf";

  return "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const slugRaw = formData.get("slug");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    if (!slugRaw || typeof slugRaw !== "string") {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const slug = safeSlug(slugRaw);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Empty slug" }, { status: 400 });
    }

    const fileObj = file as File;

    if (fileObj.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large. Max 25MB." },
        { status: 400 }
      );
    }

    const origName = fileObj.name || "stats-file";
    const mime = String(fileObj.type || "").toLowerCase();
    const ext = extFor(origName, mime);

    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload CSV, XLS, XLSX, or PDF." },
        { status: 400 }
      );
    }

    const lowerName = origName.toLowerCase();
    const hasAllowedExt = Array.from(ALLOWED_EXTS).some((allowed) => lowerName.endsWith(allowed));
    const hasAllowedMime = ALLOWED_MIME.has(mime);

    if (!hasAllowedExt && !hasAllowedMime) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload CSV, XLS, XLSX, or PDF." },
        { status: 400 }
      );
    }

    const baseName =
      origName
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "stats-file";

    const key = `stats/${slug}/${crypto.randomUUID()}-${baseName}${ext}`;

    const blob = await put(key, fileObj, {
      access: "public",
      contentType: mime || "application/octet-stream",
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url: blob.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stats upload route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload error" },
      { status: 500 }
    );
  }
}
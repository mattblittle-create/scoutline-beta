// app/api/upload/academic/route.ts
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";       // ensure Node runtime
export const dynamic = "force-dynamic";

function safeSlug(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

function safeBaseName(name: string) {
  // keep extension, sanitize base
  const ext = (name.split(".").pop() || "").toLowerCase();
  const base = name.slice(0, -(ext.length + 1));
  const cleaned =
    base
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  return ext ? `${cleaned}.${ext}` : cleaned;
}

const MAX_BYTES = 35 * 1024 * 1024; // 35MB (matches your UI hint)
const ALLOWED_MIMES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userSlug = safeSlug(form.get("userSlug"));
    // kind can be "rc_or_transcript" | "additional" (not strictly required for saving)
    const kind = String(form.get("kind") ?? "misc");

    if (!file) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Size guard
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 35MB)." },
        { status: 413 }
      );
    }

    // MIME guard (best-effort; client sends accept, but validate on server too)
    const mime = (file as any).type || "";
    if (mime && !ALLOWED_MIMES.has(mime)) {
      // allow unknown browser mimes (some browsers don’t sniff Office docs well)
      const name = (file as any).name || "upload";
      const ext = name.split(".").pop()?.toLowerCase();
      const okExt = new Set(["pdf", "doc", "docx", "xls", "xlsx"]);
      if (!ext || !okExt.has(ext)) {
        return NextResponse.json(
          { ok: false, error: "Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX." },
          { status: 415 }
        );
      }
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build destination
    const uploadsRoot = path.join(process.cwd(), "public", "uploads", "academic");
    const destDir = path.join(uploadsRoot, userSlug);
    await mkdir(destDir, { recursive: true });

    // Include a timestamp to avoid collisions; keep original name (sanitized)
    const originalName = safeBaseName((file as any).name || "document");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const destName = `${stamp}-${kind}-${originalName}`;
    const destPath = path.join(destDir, destName);

    await writeFile(destPath, buffer);

    // Public URL served by Next from /public
    const publicUrl = `/uploads/academic/${userSlug}/${encodeURIComponent(destName)}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

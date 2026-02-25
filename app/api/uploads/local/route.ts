// app/api/uploads/local/route.ts 
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Dev-only local uploader: saves files to /public/uploads/<folder>/filename
export async function POST(req: Request) {
  // Safety guard: don't allow this in production
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { ok: false, error: "Local upload endpoint is disabled outside development." },
      { status: 403 }
    );
  }

  // Read the multipart form-data
  const form = await req.formData();
  const allFiles = form.getAll("file"); // support multiple files via repeated "file" fields
  const folder = (form.get("folder") as string) || "videos";

  if (!allFiles.length) {
    return NextResponse.json({ ok: false, error: "No files provided." }, { status: 400 });
  }

  // Ensure target directory exists: /public/uploads/<folder>
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const results: Array<{
    filename: string;
    publicUrl: string;
    size: number;
    type: string;
  }> = [];

  const enforceVideoOnly = folder === "videos";

  for (const f of allFiles) {
    if (!(f instanceof Blob)) continue; // ignore non-file fields
    const file = f as File;

    // If folder is "videos", keep the old behavior (only accept video/*).
    if (enforceVideoOnly) {
      if (!file.type || !file.type.startsWith("video/")) {
        continue;
      }
    }
    // For non-video folders (e.g., "academic"), accept any type.

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const now = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `${now}-${rand}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, bytes);

    // Public URL (served by Next from /public)
    const publicUrl = `/uploads/${folder}/${filename}`;
    results.push({
      filename: file.name,
      publicUrl,
      size: bytes.length,
      type: file.type,
    });
  }

  if (!results.length) {
    return NextResponse.json(
      { ok: false, error: "No acceptable files were uploaded." },
      { status: 400 }
    );
  }

  const first = results[0];

  // Backwards compatible (keeps `files`) + adds top-level `url` for single-file clients
  return NextResponse.json({
    ok: true,
    files: results,
    url: first?.publicUrl ?? null,
  });
}

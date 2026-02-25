// app/api/upload/stats/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs"; // ensure Node FS is allowed

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

    const slug = slugRaw.trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Empty slug" }, { status: 400 });
    }

    const fileObj = file as File;

    const origName = fileObj.name || "stats.xlsx";
    const safeName =
      origName
        .replace(/[^a-zA-Z0-9.\- _]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "stats.xlsx";

    const ext = path.extname(safeName) || ".xlsx";
    const baseNoExt = path.basename(safeName, ext);

    // Make filename unique but still readable
    const finalName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${baseNoExt}${ext}`;

    const statsDir = path.join(process.cwd(), "public", "uploads", "stats", slug);
    await fs.mkdir(statsDir, { recursive: true });

    const absPath = path.join(statsDir, finalName);
    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(absPath, buffer);

    const publicUrl = `/uploads/stats/${slug}/${finalName}`;

    return NextResponse.json({ ok: true, url: publicUrl }, { status: 200 });
  } catch (err: any) {
    console.error("Stats upload route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Upload error" },
      { status: 500 }
    );
  }
}

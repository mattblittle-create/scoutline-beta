// app/api/player/[id]/video-social/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export const runtime = "nodejs";

/**
 * Dev-friendly persistence:
 * - Writes to <project>/data/local-db/video-social.json
 * - Shape: { [playerId: string]: { localVideos: SavedLocalVideo[], externalVideos: SavedExternalVideo[], social: SocialLinks, updatedAt: number } }
 * - Swap this to Prisma later; keep the same API surface.
 */

type SavedExternalVideo = {
  id: string;
  title?: string;
  url: string;
  source: "youtube" | "vimeo" | "mp4" | "gamechanger" | "unknown";
  addedAt: number;
};

type SavedLocalVideo = {
  id: string;
  title?: string;
  publicUrl: string;   // /uploads/videos/...
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  addedAt: number;
};

type SocialLinks = {
  xHandle?: string;
  instagramHandle?: string;
  youtubeChannelUrl?: string;
};

type Payload = {
  localVideos: SavedLocalVideo[];
  externalVideos: SavedExternalVideo[];
  social: SocialLinks;
};

const DB_DIR = path.join(process.cwd(), "data", "local-db");
const DB_FILE = path.join(DB_DIR, "video-social.json");

async function readDb(): Promise<Record<string, Payload & { updatedAt: number }>> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeDb(data: Record<string, Payload & { updatedAt: number }>) {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = decodeURIComponent(ctx.params.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing player id." }, { status: 400 });
  }

  const db = await readDb();
  const row = db[id];

  return NextResponse.json({
    ok: true,
    data: row ?? { localVideos: [], externalVideos: [], social: {}, updatedAt: 0 },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: { id: string } }
) {
  const id = decodeURIComponent(ctx.params.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing player id." }, { status: 400 });
  }

  let payload: Payload | undefined;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  // Basic validation
  if (!payload || !Array.isArray(payload.localVideos) || !Array.isArray(payload.externalVideos) || !payload.social) {
    return NextResponse.json({ ok: false, error: "Invalid payload shape." }, { status: 400 });
  }

  // Only keep local videos that actually have a publicUrl
  const sanitized: Payload = {
    localVideos: payload.localVideos
      .filter((v) => typeof v.publicUrl === "string" && v.publicUrl.startsWith("/uploads/"))
      .map((v) => ({
        id: String(v.id),
        title: v.title || undefined,
        publicUrl: v.publicUrl,
        fileName: v.fileName,
        fileType: v.fileType,
        fileSize: typeof v.fileSize === "number" ? v.fileSize : undefined,
        addedAt: typeof v.addedAt === "number" ? v.addedAt : Date.now(),
      })),
    externalVideos: payload.externalVideos.map((e) => ({
      id: String(e.id),
      title: e.title || undefined,
      url: e.url,
      source: (e.source as any) || "unknown",
      addedAt: typeof e.addedAt === "number" ? e.addedAt : Date.now(),
    })),
    social: {
      xHandle: payload.social.xHandle || undefined,
      instagramHandle: payload.social.instagramHandle || undefined,
      youtubeChannelUrl: payload.social.youtubeChannelUrl || undefined,
    },
  };

  const now = Date.now();
  const db = await readDb();
  db[id] = { ...sanitized, updatedAt: now };
  await writeDb(db);

  return NextResponse.json({ ok: true, updatedAt: now });
}

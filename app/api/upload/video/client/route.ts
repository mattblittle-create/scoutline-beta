// app/api/upload/video/client/route.ts

import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
];

function safeSlug(v: string) {
  return (v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let parsed: {
          userSlug?: string;
          originalName?: string;
        } = {};

        try {
          parsed = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          parsed = {};
        }

        const userSlug = safeSlug(parsed.userSlug || "player");
        const originalName = String(parsed.originalName || pathname || "video")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "") || "video";

        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          addRandomSuffix: true,
          pathname: `videos/${userSlug}/${originalName}`,
        };
      },
      onUploadCompleted: async () => {
        return;
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Client video upload route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to handle upload" },
      { status: 500 }
    );
  }
}
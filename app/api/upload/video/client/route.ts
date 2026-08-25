// app/api/upload/video/client/route.ts

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { start } from "workflow/api";
import { processVideoWorkflow } from "@/workflows/process-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
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
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let parsed: {
          email?: string;
          userSlug?: string;
          draftId?: string;
          title?: string;
          fileType?: string;
          fileSize?: number;
          originalName?: string;
          category?: string;
        } = {};

        try {
          parsed = clientPayload ? JSON.parse(clientPayload) : {};
        } catch {
          parsed = {};
        }

        const userSlug = safeSlug(parsed.userSlug || "player");
        const originalName =
          String(parsed.originalName || pathname || "video")
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "") || "video";

return {
  allowedContentTypes: ALLOWED_VIDEO_TYPES,
  maximumSizeInBytes: 500 * 1024 * 1024,
  addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            email: (parsed.email || "").trim().toLowerCase(),
            userSlug,
            draftId: parsed.draftId || "",
            title: parsed.title || "",
            fileType: parsed.fileType || "",
            fileSize: Number.isFinite(Number(parsed.fileSize)) ? Number(parsed.fileSize) : 0,
            originalName: parsed.originalName || "",
            category: parsed.category || "",
          }),
          pathname: `videos/${userSlug}/${originalName}`,
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const parsed =
            typeof tokenPayload === "string" && tokenPayload
              ? JSON.parse(tokenPayload)
              : {};

          const email = String(parsed?.email || "").trim().toLowerCase();
          if (!email) return;

          const row = await prisma.playerProfile.findUnique({
            where: { email },
            select: { data: true },
          });

          const existingData = (row?.data as any) || {};
          const existingLocalVideos = Array.isArray(existingData.localVideos)
            ? existingData.localVideos
            : [];

          const newVideo = {
            id:
              typeof parsed?.draftId === "string" && parsed.draftId.trim()
                ? parsed.draftId.trim()
                : crypto.randomUUID(),
            title:
              typeof parsed?.title === "string" && parsed.title.trim()
                ? parsed.title.trim()
                : typeof parsed?.originalName === "string" && parsed.originalName.trim()
                ? parsed.originalName.replace(/\.[^.]+$/, "").trim()
                : "video",
            publicUrl: String(blob.url || "").trim(),
            originalPublicUrl: String(blob.url || "").trim(),

            processingStatus: "processing",
            optimized: false,
            processingError: null,

            fileType:
              typeof parsed?.fileType === "string" && parsed.fileType.trim()
                ? parsed.fileType.trim()
                : String(blob.contentType || "video/mp4"),
            fileSize: Number.isFinite(Number(parsed?.fileSize))
              ? Number(parsed.fileSize)
              : 0,
            addedAt: Date.now(),
            category:
              parsed?.category === "Hitting" ||
              parsed?.category === "Fielding" ||
              parsed?.category === "Pitching" ||
              parsed?.category === "Baserunning"
                ? parsed.category
                : null,
          };

          const deduped = [
            newVideo,
            ...existingLocalVideos.filter((v: any) => {
              const sameId =
                String(v?.id || "").trim() === newVideo.id;
              const sameUrl =
                String(v?.publicUrl || "").trim() === newVideo.publicUrl;
              return !sameId && !sameUrl;
            }),
          ];

          const nextData = {
            ...existingData,
            localVideos: deduped,
            primary:
              existingData?.primary && existingData.primary.kind === "local"
                ? existingData.primary
                : existingData?.primary ?? null,
          };

          await prisma.playerProfile.upsert({
            where: { email },
            create: {
              email,
              schemaVersion: 1,
              data: nextData,
            },
            update: {
              schemaVersion: 1,
              data: nextData,
            },
          });

          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { slug: true },
          });

          if (user?.slug) {
            await prisma.publicProfileCache
              .delete({ where: { slug: user.slug } })
              .catch(() => {});
          }

          try {
  const run = await start(processVideoWorkflow, [
    {
      email,
      videoId: newVideo.id,
      sourceUrl: newVideo.publicUrl,
      originalName:
        typeof parsed?.originalName === "string"
          ? parsed.originalName
          : "",
      title: newVideo.title,
      category: newVideo.category,
    },
  ]);

  console.log(
    `[video upload] optimization workflow started: ${run.runId} (${newVideo.id})`
  );
} catch (workflowError) {
  console.error(
    "[video upload] failed to start optimization workflow:",
    workflowError
  );

  const failedLocalVideos = deduped.map((video: any) => {
    if (String(video?.id || "").trim() !== newVideo.id) {
      return video;
    }

    return {
      ...video,
      processingStatus: "error",
      optimized: false,
      processingError:
        "ScoutLine could not start video optimization. Please remove the video and try uploading it again.",
    };
  });

  await prisma.playerProfile.update({
    where: { email },
    data: {
      data: {
        ...nextData,
        localVideos: failedLocalVideos,
      },
    },
  });
}
        } catch (err) {
          console.error("[video upload] onUploadCompleted DB update failed:", err);
        }
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
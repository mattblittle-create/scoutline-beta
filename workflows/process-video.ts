// workflows/process-video/ts

import { Sandbox } from "@vercel/sandbox";
import { put } from "@vercel/blob";

import { prisma } from "@/lib/prisma";

type ProcessVideoInput = {
  email: string;
  videoId: string;
  sourceUrl: string;
  originalName: string;
  title: string;
  category: string | null;
};

type ProcessedVideo = {
  optimizedUrl: string;
  fileSize: number;
};

/**
 * Durable orchestration only.
 *
 * IMPORTANT:
 * The workflow function itself must stay free of direct Node/Prisma work.
 * All heavy/Node-dependent operations happen in "use step" functions.
 */
export async function processVideoWorkflow(
  input: ProcessVideoInput
): Promise<void> {
  "use workflow";

  try {
    const processed = await transcodeVideoStep(input);

    await replaceVideoInProfileStep(input, processed);
  } catch (error: any) {
    const message =
      String(error?.message || "").trim() ||
      "Video optimization failed.";

    await markVideoProcessingErrorStep(
      input,
      message
    );

    throw error;
  }
}

/**
 * STEP 1:
 * Download the original Blob, run FFmpeg in Vercel Sandbox,
 * then upload the optimized MP4 back to Vercel Blob.
 */
async function transcodeVideoStep(
  input: ProcessVideoInput
): Promise<ProcessedVideo> {
  "use step";

  const sandbox = await Sandbox.create({
    persistent: false,

    timeout: 30 * 60 * 1000,

    resources: {
      vcpus: 4,
    },
  });

  try {
    // Install FFmpeg inside the Sandbox.
    const install = await sandbox.runCommand({
      cmd: "dnf",
      args: ["install", "-y", "ffmpeg"],
      sudo: true,
    });

    if (install.exitCode !== 0) {
      const stderr = await install.stderr();

      throw new Error(
        `Failed to install FFmpeg: ${stderr.trim()}`
      );
    }

    // Download original video from Blob.
    const download = await sandbox.runCommand(
      "curl",
      [
        "-L",
        "--fail",
        "--retry",
        "3",

        "-o",
        "/tmp/input-video",

        input.sourceUrl,
      ]
    );

    if (download.exitCode !== 0) {
      const stderr = await download.stderr();

      throw new Error(
        `Failed to download source video: ${stderr.trim()}`
      );
    }

    /*
     * ScoutLine optimized playback target:
     *
     * - max 1920x1080
     * - preserve aspect ratio
     * - 30 fps
     * - H.264
     * - AAC
     * - yuv420p
     * - MP4
     * - fast-start enabled
     */
    const transcode = await sandbox.runCommand(
      "ffmpeg",
      [
        "-y",

        "-i",
        "/tmp/input-video",

        "-map",
        "0:v:0",

        "-map",
        "0:a?",

        "-vf",
        [
          "scale=1920:1080:force_original_aspect_ratio=decrease",
          "pad=ceil(iw/2)*2:ceil(ih/2)*2",
          "fps=30",
        ].join(","),

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "22",

        "-profile:v",
        "high",

        "-level:v",
        "4.1",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-movflags",
        "+faststart",

        "/tmp/output.mp4",
      ]
    );

    if (transcode.exitCode !== 0) {
      const stderr = await transcode.stderr();

      throw new Error(
        `Video optimization failed: ${stderr.slice(-2000)}`
      );
    }

    const output = await sandbox.readFileToBuffer({
      path: "/tmp/output.mp4",
    });

    if (!output || output.length === 0) {
      throw new Error(
        "Video optimization completed but produced no output file."
      );
    }

    const safeBase =
      String(
        input.originalName ||
          input.title ||
          "video"
      )
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      "video";

    const optimizedBlob = await put(
      `videos/optimized/${input.videoId}/${safeBase}.mp4`,
      output,
      {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true,
      }
    );

    return {
      optimizedUrl: optimizedBlob.url,
      fileSize: output.length,
    };
  } finally {
    await sandbox.stop().catch(() => {});
  }
}

/**
 * STEP 2:
 * Replace only this video's raw URL with the optimized MP4.
 */
async function replaceVideoInProfileStep(
  input: ProcessVideoInput,
  processed: ProcessedVideo
): Promise<void> {
  "use step";

  const email =
    input.email.trim().toLowerCase();

  const row =
    await prisma.playerProfile.findUnique({
      where: { email },
      select: { data: true },
    });

  if (!row) {
    throw new Error(
      "Player profile no longer exists."
    );
  }

  const existingData =
    (row.data as any) || {};

  const existingLocalVideos =
    Array.isArray(existingData.localVideos)
      ? existingData.localVideos
      : [];

  /*
   * If the player removed the video while it
   * was being processed, don't resurrect it.
   */
  const targetExists =
    existingLocalVideos.some(
      (video: any) =>
        String(video?.id || "").trim() ===
        input.videoId
    );

  if (!targetExists) {
    return;
  }

  const nextLocalVideos =
    existingLocalVideos.map(
      (video: any) => {
        if (
          String(video?.id || "").trim() !==
          input.videoId
        ) {
          return video;
        }

        return {
          ...video,

          publicUrl:
            processed.optimizedUrl,

          fileType: "video/mp4",

          fileSize:
            processed.fileSize,

          processingStatus: "ready",

          optimized: true,

          /*
           * Keep raw upload during QA.
           * We can delete originals later once
           * we're confident in the pipeline.
           */
          originalPublicUrl:
            input.sourceUrl,

          processingError: null,
        };
      }
    );

  await prisma.playerProfile.update({
    where: { email },

    data: {
      data: {
        ...existingData,

        localVideos:
          nextLocalVideos,
      },
    },
  });

  const user =
    await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },

      select: {
        slug: true,
      },
    });

  if (user?.slug) {
    await prisma.publicProfileCache
      .delete({
        where: {
          slug: user.slug,
        },
      })
      .catch(() => {});
  }
}

/**
 * STEP 3:
 * Save a useful processing error if FFmpeg/Sandbox fails.
 */
async function markVideoProcessingErrorStep(
  input: ProcessVideoInput,
  errorMessage: string
): Promise<void> {
  "use step";

  const email =
    input.email.trim().toLowerCase();

  console.error(
    "[process-video] optimization failed:",
    errorMessage
  );

  try {
    const row =
      await prisma.playerProfile.findUnique({
        where: { email },

        select: {
          data: true,
        },
      });

    if (!row) return;

    const existingData =
      (row.data as any) || {};

    const existingLocalVideos =
      Array.isArray(
        existingData.localVideos
      )
        ? existingData.localVideos
        : [];

    const nextLocalVideos =
      existingLocalVideos.map(
        (video: any) => {
          if (
            String(
              video?.id || ""
            ).trim() !== input.videoId
          ) {
            return video;
          }

          return {
            ...video,

            processingStatus: "error",

            optimized: false,

            processingError:
              "ScoutLine could not optimize this video for reliable playback. Please remove the video and try uploading it again.",
          };
        }
      );

    await prisma.playerProfile.update({
      where: { email },

      data: {
        data: {
          ...existingData,

          localVideos:
            nextLocalVideos,
        },
      },
    });

    const user =
      await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },

        select: {
          slug: true,
        },
      });

    if (user?.slug) {
      await prisma.publicProfileCache
        .delete({
          where: {
            slug: user.slug,
          },
        })
        .catch(() => {});
    }
  } catch (dbError) {
    console.error(
      "[process-video] failed to persist optimization error:",
      dbError
    );
  }
}
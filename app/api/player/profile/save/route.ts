import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * ---------------- Zod Schemas (atomic payload v2) ----------------
 * planTier aligns to DB enum: REDSHIRT | WALK_ON | ALL_AMERICAN | TEAM
 * committed: { isCommitted: boolean; college?: string }  (no classYear)
 */

const VideoSocialSchema = z.object({
  externalVideos: z.array(z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().url(),
    source: z.enum(["youtube","vimeo","mp4","gamechanger","unknown"]),
    addedAt: z.number(),
  })),
  localVideos: z.array(z.object({
    id: z.string(),
    title: z.string().optional(),
    publicUrl: z.string().url(),
    fileType: z.string(),
    fileSize: z.number().int().nonnegative(),
    addedAt: z.number(),
  })),
  social: z.object({
    xHandle: z.string().optional(),
    instagramHandle: z.string().optional(),
    youtubeChannelUrl: z.string().url().optional(),
  }),
  primary: z.object({
    kind: z.enum(["local","external"]),
    id: z.string(),
  }).nullable(),
});

const CoachRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["Head Coach","Assistant Coach","Trainer","Reference","Other"]).optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

const PrivacyFlagsSchema = z.object({
  emailPrivate: z.boolean(),
  phonePrivate: z.boolean(),
  metricsPrivate: z.boolean().optional(),
  statsPrivate: z.boolean().optional(),
});

const SeasonSchema = z.object({
  year: z.number().int(),
  level: z.enum(["MS","HS","Travel","Showcase","Other"]),
  teamName: z.string().optional(),
});

const MetricsBlockSchema = z.object({
  hitter: z.object({
    exitVeloMax: z.number().optional(),
    batSpeedMax: z.number().optional(),
  }).optional(),
  pitcher: z.object({
    fbVeloMax: z.number().optional(),
    spinRateMax: z.number().optional(),
  }).optional(),
  catcher: z.object({
    popTimeBest: z.number().optional(),
    throwDownVeloMax: z.number().optional(),
  }).optional(),
});

const StatsBlockSchema = z.object({
  seasonAverages: z.object({
    ab: z.number().optional(),
    avg: z.number().optional(),
    obp: z.number().optional(),
    slg: z.number().optional(),
    ops: z.number().optional(),
  }).optional(),
  pitching: z.object({
    ip: z.number().optional(),
    era: z.number().optional(),
    k: z.number().optional(),
    bb: z.number().optional(),
    whip: z.number().optional(),
  }).optional(),
});

const ProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  primaryPhotoUrl: z.string().url().nullable().optional(),
  positions: z.object({
    primary: z.string().optional(),
    secondary: z.array(z.string()).optional(),
  }),
  athletics: z.object({
    isCatcher: z.boolean().optional(),
    isPitcher: z.boolean().optional(),
  }),
  seasons: z.array(SeasonSchema),
  privacy: PrivacyFlagsSchema,
  planTier: z.enum(["REDSHIRT","WALK_ON","ALL_AMERICAN","TEAM"]).optional(),
  committed: z.object({
    isCommitted: z.boolean(),
    college: z.string().optional(),
  }).optional(),
}).superRefine((val, ctx) => {
  if (val.committed?.isCommitted) {
    const college = (val.committed.college ?? "").trim();
    if (!college || college.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["committed","college"],
        message: "College is required when Committed is checked.",
      });
    }
  }
});

const AtomicPayloadSchema = z.object({
  email: z.string().email(),
  profile: ProfileSchema,
  metrics: MetricsBlockSchema,
  stats: StatsBlockSchema,
  videoSocial: VideoSocialSchema,
  coaches: z.array(CoachRefSchema),
  updatedAt: z.number(),
  schemaVersion: z.number().int(),
});

/** --------------- Helpers --------------- */

function trimByGating(payload: z.infer<typeof AtomicPayloadSchema>) {
  const isC = !!payload.profile.athletics?.isCatcher;
  const isP = !!payload.profile.athletics?.isPitcher;

  return {
    ...payload,
    metrics: {
      ...payload.metrics,
      catcher: isC ? payload.metrics.catcher : undefined,
      pitcher: isP ? payload.metrics.pitcher : undefined,
    },
  };
}

function validatePrimaryVideo(vs: z.infer<typeof VideoSocialSchema>) {
  if (!vs.primary) return;
  const inLocal    = vs.localVideos.some(v => v.id === vs.primary?.id);
  const inExternal = vs.externalVideos.some(v => v.id === vs.primary?.id);

  if (vs.primary.kind === "local" && !inLocal) {
    throw new Error("Primary local video not found in localVideos.");
  }
  if (vs.primary.kind === "external" && !inExternal) {
    throw new Error("Primary external video not found in externalVideos.");
  }
}

/** --------------- Route: POST /api/player/profile/save --------------- */
export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Validate & enforce invariants
    const parsed = AtomicPayloadSchema.parse(json);
    validatePrimaryVideo(parsed.videoSocial);
    const payload = trimByGating(parsed);

    // Persist atomically with Prisma
    await prisma.playerProfile.upsert({
      where: { email: payload.email },
      update: {
        data: payload, // entire atomic payload (JSONB)
        schemaVersion: payload.schemaVersion,
        updatedAt: new Date(payload.updatedAt),
      },
      create: {
        email: payload.email,
        data: payload,
        schemaVersion: payload.schemaVersion,
        updatedAt: new Date(payload.updatedAt),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

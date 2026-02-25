// lib/featureFlags.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  config: any;
};

function clampRollout(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Deterministically maps (key + userId) => 0..99 bucket.
 * Same user stays in/out across requests and machines.
 */
function bucketFor(key: string, userId: string): number {
  const h = crypto.createHash("sha256").update(`${key}:${userId}`).digest("hex");
  // take first 8 hex chars => 32-bit int
  const x = parseInt(h.slice(0, 8), 16);
  return x % 100; // 0..99
}

export async function getFeatureFlag(key: string): Promise<FeatureFlagRow | null> {
  const k = String(key ?? "").trim();
  if (!k) return null;

  return prisma.featureFlag.findUnique({
    where: { key: k },
    select: { key: true, enabled: true, config: true },
  });
}

/**
 * Evaluate a feature flag for a given userId (rollout aware).
 * Rules:
 * - If no flag row: false (safe default)
 * - If enabled=false: false
 * - If enabled=true:
 *    - rollout missing => 100%
 *    - rollout 0..100 => deterministic % by userId
 */
export async function isFeatureEnabled(key: string, userId: string | null | undefined): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  if (!flag) return false;
  if (!flag.enabled) return false;

  const uid = String(userId ?? "").trim();
  if (!uid) {
    // If you call without a userId, treat as "global on" only when rollout is 100.
    const rollout = clampRollout(flag?.config?.rollout);
    return rollout >= 100;
  }

  const rollout = clampRollout(flag?.config?.rollout);
  if (rollout >= 100) return true;
  if (rollout <= 0) return false;

  const b = bucketFor(flag.key, uid); // 0..99
  return b < rollout;
}

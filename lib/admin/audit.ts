// lib/admin/audit.ts
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";

type LogArgs = {
  adminUserId: string | null;
  actingUserId?: string | null;

  action: string;
  entityType: string;
  entityId?: string | null;

  beforeJson?: any;
  afterJson?: any;

  // optional overrides (Route Handlers can pass these)
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

function pickIpFromHeaders(h: Headers): string | null {
  // In production behind a proxy, x-forwarded-for is the money-maker.
  // It can be a comma-separated list; store the full chain.
  const xff = h.get("x-forwarded-for")?.trim();
  if (xff) return xff;

  const xrip = h.get("x-real-ip")?.trim();
  if (xrip) return xrip;

  // Next dev often shows ::1 / 127.0.0.1 depending on environment.
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  return null;
}

function pickRequestIdFromHeaders(h: Headers): string | null {
  return (
    h.get("x-request-id")?.trim() ||
    h.get("x-vercel-id")?.trim() || // nice to have on Vercel
    null
  );
}

export async function logAdminAction(args: LogArgs) {
  const h = headers();

  const requestId =
    (args.requestId ?? "").trim() ||
    pickRequestIdFromHeaders(h) ||
    crypto.randomUUID();

  const userAgent =
    (args.userAgent ?? "").trim() ||
    h.get("user-agent")?.trim() ||
    null;

  const ip =
    (args.ip ?? "").trim() ||
    pickIpFromHeaders(h) ||
    null;

  const beforeJson = args.beforeJson === undefined ? null : args.beforeJson;
  const afterJson = args.afterJson === undefined ? null : args.afterJson;

  // IMPORTANT: actingUserId is the impersonated user (if any)
  return prisma.adminAuditLog.create({
    data: {
      adminUserId: args.adminUserId,
      actingUserId: args.actingUserId ?? null,

      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId ?? null,

      beforeJson,
      afterJson,

      ip,
      userAgent,
      requestId,
    },
  });
}

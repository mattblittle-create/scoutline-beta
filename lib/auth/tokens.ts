// lib/auth/tokens.ts

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type VerificationTokenPurpose =
  | "VERIFY_EMAIL"
  | "RESET_PASSWORD"
  | "SET_PASSWORD";

const DEFAULT_TTL_MINUTES: Record<VerificationTokenPurpose, number> = {
  VERIFY_EMAIL: 60 * 24,       // 24 hours
  RESET_PASSWORD: 60,          // 1 hour
  SET_PASSWORD: 60 * 24 * 3,   // 3 days
};

export function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createVerificationToken(args: {
  email: string;
  purpose: VerificationTokenPurpose;
  ttlMinutes?: number;
}) {
  const email = String(args.email || "").trim().toLowerCase();
  const purpose = args.purpose;
  const ttlMinutes = args.ttlMinutes ?? DEFAULT_TTL_MINUTES[purpose];

  if (!email) {
    throw new Error("Email is required to create verification token.");
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const record = await prisma.verificationToken.create({
    data: {
      id: crypto.randomUUID(),
      email,
      tokenHash,
      purpose,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      purpose: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    rawToken,
    token: record,
  };
}

export async function findValidVerificationToken(args: {
  rawToken: string;
  purpose: VerificationTokenPurpose;
}) {
  const rawToken = String(args.rawToken || "").trim();
  const purpose = args.purpose;

  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const token = await prisma.verificationToken.findFirst({
    where: {
      tokenHash,
      purpose,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      email: true,
      purpose: true,
      expiresAt: true,
      consumedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return token;
}

export async function consumeVerificationToken(args: {
  rawToken: string;
  purpose: VerificationTokenPurpose;
}) {
  const rawToken = String(args.rawToken || "").trim();
  const purpose = args.purpose;

  if (!rawToken) {
    throw new Error("Token is required.");
  }

  const tokenHash = hashToken(rawToken);

  const existing = await prisma.verificationToken.findFirst({
    where: {
      tokenHash,
      purpose,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      email: true,
      purpose: true,
    },
  });

  if (!existing) return null;

  const consumed = await prisma.verificationToken.update({
    where: { id: existing.id },
    data: {
      consumedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      purpose: true,
      consumedAt: true,
    },
  });

  return consumed;
}

export async function invalidateExistingTokens(args: {
  email: string;
  purpose: VerificationTokenPurpose;
}) {
  const email = String(args.email || "").trim().toLowerCase();
  const purpose = args.purpose;

  if (!email) return;

  await prisma.verificationToken.updateMany({
    where: {
      email,
      purpose,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });
}
// lib/admin/resolveDiscountTarget.ts
import { prisma } from "@/lib/prisma";

function normStr(v: any, max = 500) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function looksLikeCuid(s: string) {
  return /^c[a-z0-9]{20,}$/i.test(s);
}

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export type ResolvedTarget = {
  targetType: "PLAYER" | "TEAM";
  targetId: string;
  label: string;
  extra?: any;
};

export async function resolveDiscountTarget(input: {
  targetTypeRaw: string;
  qRaw: string;
}): Promise<
  | { ok: true; resolved: ResolvedTarget | null; options: ResolvedTarget[] }
  | { ok: false; error: string }
> {
  const targetType = normStr(input.targetTypeRaw).toUpperCase();
  const q = normStr(input.qRaw);

  if (!q) return { ok: false, error: "Missing q." };
  if (targetType !== "PLAYER" && targetType !== "TEAM") return { ok: false, error: "Invalid targetType." };

  const qLower = q.toLowerCase();

  // -------------------------
  // TEAM
  // -------------------------
  if (targetType === "TEAM") {
    // 1) ID direct
    if (looksLikeCuid(q)) {
      const t = await prisma.team.findUnique({
        where: { id: q },
        select: { id: true, name: true, slug: true },
      });
      if (t) {
        return {
          ok: true,
          resolved: { targetType: "TEAM", targetId: t.id, label: `${t.name} (team:${t.slug})` },
          options: [],
        };
      }
    }

    // 2) slug direct
    const bySlug = await prisma.team.findUnique({
      where: { slug: qLower },
      select: { id: true, name: true, slug: true },
    });
    if (bySlug) {
      return {
        ok: true,
        resolved: { targetType: "TEAM", targetId: bySlug.id, label: `${bySlug.name} (team:${bySlug.slug})` },
        options: [],
      };
    }

    // 3) name contains
    const matches = await prisma.team.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    if (matches.length === 0) return { ok: false, error: "Team not found." };

    const options = matches.map((t) => ({
      targetType: "TEAM" as const,
      targetId: t.id,
      label: `${t.name} (team:${t.slug})`,
    }));

    if (options.length === 1) return { ok: true, resolved: options[0], options: [] };
    return { ok: true, resolved: null, options };
  }

  // -------------------------
  // PLAYER
  // -------------------------

  // 1) PlayerProfile id direct
  if (looksLikeCuid(q)) {
    const pp = await prisma.playerProfile.findUnique({
      where: { id: q },
      select: { id: true, email: true, userId: true },
    });

    if (pp) {
      const user = pp.userId
        ? await prisma.user.findUnique({
            where: { id: pp.userId },
            select: { name: true, email: true, slug: true },
          })
        : null;

      const label = user?.name ? `${user.name} (${pp.email})` : `${pp.email}`;
      return {
        ok: true,
        resolved: {
          targetType: "PLAYER",
          targetId: pp.id,
          label,
          extra: { email: pp.email, userSlug: user?.slug ?? null },
        },
        options: [],
      };
    }
  }

  // 2) email -> PlayerProfile.email OR User.email -> PlayerProfile
  if (looksLikeEmail(qLower)) {
    const pp = await prisma.playerProfile.findUnique({
      where: { email: qLower },
      select: { id: true, email: true, userId: true },
    });

    if (pp) {
      const user = pp.userId
        ? await prisma.user.findUnique({ where: { id: pp.userId }, select: { name: true, slug: true } })
        : null;

      const label = user?.name ? `${user.name} (${pp.email})` : `${pp.email}`;
      return {
        ok: true,
        resolved: { targetType: "PLAYER", targetId: pp.id, label, extra: { email: pp.email, userSlug: user?.slug ?? null } },
        options: [],
      };
    }

    const u = await prisma.user.findUnique({
      where: { email: qLower },
      select: { id: true, name: true, email: true, slug: true },
    });

    if (u) {
      const pp2 = await prisma.playerProfile.findFirst({
        where: { userId: u.id },
        select: { id: true, email: true },
      });

      if (pp2) {
        return {
          ok: true,
          resolved: {
            targetType: "PLAYER",
            targetId: pp2.id,
            label: u.name ? `${u.name} (${pp2.email})` : `${pp2.email}`,
            extra: { email: pp2.email, userSlug: u.slug ?? null },
          },
          options: [],
        };
      }
    }
  }

  // 3) slug -> User.slug -> PlayerProfile
  {
    const u = await prisma.user.findUnique({
      where: { slug: qLower },
      select: { id: true, name: true, email: true, slug: true },
    });

    if (u) {
      const pp = await prisma.playerProfile.findFirst({
        where: { userId: u.id },
        select: { id: true, email: true },
      });

      if (pp) {
        return {
          ok: true,
          resolved: {
            targetType: "PLAYER",
            targetId: pp.id,
            label: u.name ? `${u.name} (${pp.email})` : `${pp.email}`,
            extra: { email: pp.email, userSlug: u.slug ?? null },
          },
          options: [],
        };
      }
    }

    const cache = await prisma.publicProfileCache.findUnique({
      where: { slug: qLower },
      select: { slug: true, userId: true },
    });

    if (cache?.userId) {
      const u2 = await prisma.user.findUnique({
        where: { id: cache.userId },
        select: { id: true, name: true, email: true, slug: true },
      });

      const pp2 = await prisma.playerProfile.findFirst({
        where: { userId: cache.userId },
        select: { id: true, email: true },
      });

      if (pp2) {
        return {
          ok: true,
          resolved: {
            targetType: "PLAYER",
            targetId: pp2.id,
            label: u2?.name ? `${u2.name} (${pp2.email})` : `${pp2.email}`,
            extra: { email: pp2.email, userSlug: u2?.slug ?? null, cacheSlug: cache.slug },
          },
          options: [],
        };
      }
    }
  }

  // 4) name contains -> options
  {
    const users = await prisma.user.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
      select: { id: true, name: true, email: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    if (users.length) {
      const pps = await prisma.playerProfile.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        select: { id: true, userId: true, email: true },
        take: 20,
      });

      const byUserId = new Map<string, { id: string; email: string }>();
      for (const pp of pps) if (pp.userId) byUserId.set(pp.userId, { id: pp.id, email: pp.email });

      const options: ResolvedTarget[] = users
        .map((u) => {
          const pp = byUserId.get(u.id);
          if (!pp) return null;
          return {
            targetType: "PLAYER" as const,
            targetId: pp.id,
            label: u.name ? `${u.name} (${pp.email})` : `${pp.email}`,
            extra: { email: pp.email, userSlug: u.slug ?? null },
          };
        })
        .filter(Boolean) as ResolvedTarget[];

      if (options.length === 0) return { ok: false, error: "Found user(s) by name, but none have PlayerProfile." };
      if (options.length === 1) return { ok: true, resolved: options[0], options: [] };
      return { ok: true, resolved: null, options };
    }
  }

  return { ok: false, error: "Player not found." };
}
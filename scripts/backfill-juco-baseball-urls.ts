// scripts/backfill-juco-baseball-urls.ts

import fs from "fs";
import path from "path";
import { CollegeAthleticDivision, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_FILE = path.join(OUT_DIR, `juco-baseball-urls.generated.${stamp}.csv`);

const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 250;

const DIVISION_ARG = process.argv.find((a) => a.startsWith("--division="));
const DIVISION = (
  DIVISION_ARG ? DIVISION_ARG.split("=")[1] : "NJCAA_D1"
) as CollegeAthleticDivision;

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeUrl(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function absolutizeUrl(href: string, baseUrl: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;

  for (const match of html.matchAll(re)) {
    const href = String(match[1] || "").trim();
    if (!href) continue;
    links.push(absolutizeUrl(href, baseUrl));
  }

  return Array.from(new Set(links.filter(Boolean)));
}

function isStatsUrl(url: string | null | undefined) {
  const u = String(url ?? "").toLowerCase();
  return (
    u.includes("njcaastats.prestosports.com") ||
    u.includes("naiastats.prestosports.com")
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bcommunity college\b/g, "cc")
    .replace(/\bcollege\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 ScoutLineBot/1.0 juco baseball url backfill",
      },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreCandidateUrl(url: string) {
  const u = url.toLowerCase();
  let score = 0;

  if (isStatsUrl(u)) return -999;
  if (u.includes("facebook.com")) return -999;
  if (u.includes("twitter.com")) return -999;
  if (u.includes("x.com")) return -999;
  if (u.includes("instagram.com")) return -999;
  if (u.includes("youtube.com")) return -999;
  if (u.includes("sidearmstats")) return -999;

  if (u.includes("/sports/baseball")) score += 60;
  if (u.includes("/sports/bsb")) score += 55;
  if (u.includes("/baseball")) score += 40;
  if (u.includes("/bsb")) score += 30;

  if (u.includes("athletics")) score += 20;
  if (u.includes("sports")) score += 15;
  if (u.includes("prestosports.com")) score += 10;

  if (u.includes("admissions")) score -= 40;
  if (u.includes("academics")) score -= 40;
  if (u.includes("apply")) score -= 30;
  if (u.includes("calendar")) score -= 25;
  if (u.includes("news")) score -= 15;
  if (u.includes("roster")) score -= 10;
  if (u.includes("schedule")) score -= 10;

  return score;
}

async function urlLooksGood(url: string) {
  const html = await fetchHtml(url);
  if (!html) return false;

  const h = html.toLowerCase();

  return (
    h.includes("baseball") &&
    !h.includes("njcaastats.prestosports.com/sports/bsb/2024-25")
  );
}

function candidateGuessUrls(name: string) {
  const base = slugify(name);

  return Array.from(
    new Set([
      `https://${base}.edu/sports/baseball`,
      `https://www.${base}.edu/sports/baseball`,
      `https://${base}athletics.com/sports/baseball`,
      `https://www.${base}athletics.com/sports/baseball`,
      `https://${base}sports.com/sports/baseball`,
      `https://www.${base}sports.com/sports/baseball`,
      `https://${base}.prestosports.com/sports/bsb`,
      `https://www.${base}.prestosports.com/sports/bsb`,
    ])
  );
}

async function findFromStatsPage(currentUrl: string) {
  const html = await fetchHtml(currentUrl);
  if (!html) return "";

  const links = extractLinks(html, currentUrl)
    .filter((url) => scoreCandidateUrl(url) > 0)
    .sort((a, b) => scoreCandidateUrl(b) - scoreCandidateUrl(a));

  for (const link of links.slice(0, 10)) {
    if (await urlLooksGood(link)) return normalizeUrl(link);
  }

  return "";
}

async function findFromGuesses(name: string) {
  for (const candidate of candidateGuessUrls(name)) {
    if (await urlLooksGood(candidate)) return normalizeUrl(candidate);
  }

  return "";
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const programs = await prisma.collegeBaseballProgram.findMany({
    where: {
      division: DIVISION,
      baseballWebsiteUrl: { not: null },
    },
    include: { college: true },
    orderBy: [{ conference: "asc" }, { college: { name: "asc" } }],
    take: LIMIT,
  });

  console.log(`Scanning ${programs.length} ${DIVISION} programs for real baseball URLs...`);

  const rows: string[][] = [
    [
      "slug",
      "collegeName",
      "division",
      "currentBaseballWebsiteUrl",
      "suggestedBaseballWebsiteUrl",
      "method",
      "reviewStatus",
    ],
  ];

  for (const program of programs) {
    const currentUrl = normalizeUrl(program.baseballWebsiteUrl);
    const slug = program.college.slug;
    const name = program.college.name;

    console.log(`\n${name}`);
    console.log(`  slug: ${slug}`);
    console.log(`  current: ${currentUrl || "(none)"}`);

    if (!isStatsUrl(currentUrl)) {
      rows.push([slug, name, DIVISION, currentUrl, currentUrl, "existing", "ALREADY_REAL_URL"]);
      console.log("  ✅ already real URL");
      continue;
    }

    let found = await findFromStatsPage(currentUrl);
    let method = "stats_page_links";

    if (!found) {
      found = await findFromGuesses(name);
      method = "guessed";
    }

    if (found) {
      rows.push([slug, name, DIVISION, currentUrl, found, method, "NEEDS_REVIEW"]);
      console.log(`  ✅ candidate: ${found}`);
    } else {
      rows.push([slug, name, DIVISION, currentUrl, "", "", "NO_CANDIDATE_FOUND"]);
      console.log("  ⚠️ no candidate found");
    }
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  fs.writeFileSync(OUT_FILE, csv, "utf8");

  console.log(`\n✅ Wrote ${OUT_FILE}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
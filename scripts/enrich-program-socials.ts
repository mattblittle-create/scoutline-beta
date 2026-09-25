// scripts/enrich-program-socials.ts

import fs from "fs";
import path from "path";
import { CollegeAthleticDivision, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_FILE = path.join(
  OUT_DIR,
  `college-program-socials.generated.${stamp}.csv`
);

const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

const DIVISION_ARG = process.argv.find((a) => a.startsWith("--division="));
const DIVISION = (
  DIVISION_ARG ? DIVISION_ARG.split("=")[1] : "NCAA_D1"
) as CollegeAthleticDivision;

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeUrl(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return null;
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

function scoreRecruitingUrl(url: string) {
  const u = url.toLowerCase();
  let score = 0;

  if (u.includes("recruit")) score += 20;
  if (u.includes("prospective")) score += 18;
  if (u.includes("questionnaire")) score += 18;
  if (u.includes("armssoftware")) score += 25;
  if (u.includes("baseball")) score += 8;
  if (u.includes("student-athlete")) score += 8;

  if (u.includes("football")) score -= 25;
  if (u.includes("basketball")) score -= 25;
  if (u.includes("ticket")) score -= 20;
  if (u.includes("schedule")) score -= 10;
  if (u.includes("roster")) score -= 10;
  if (u.includes("news")) score -= 10;

  if (u.includes("handbook")) score -= 100;
  if (u.includes("development")) score -= 75;
  if (u.includes("enhancement")) score -= 75;
  if (u.includes("performance")) score -= 75;
  if (u.includes("wellness")) score -= 75;
  if (u.includes("partnership")) score -= 75;
  if (u.includes(".pdf")) score -= 75;
  if (u.includes("/news")) score -= 50;
  if (u.includes("/article")) score -= 50;
  if (u.includes("admissions")) score -= 50;
  if (u.includes("prospective/")) score -= 45;

  return score;
}

function cleanSocialUrl(url: string) {
  let cleaned = String(url || "").trim();

  cleaned = cleaned.replace("https://x.com/https://x.com/", "https://x.com/");
  cleaned = cleaned.replace("https://twitter.com/https://twitter.com/", "https://twitter.com/");
  cleaned = cleaned.replace("https://instagram.com/https://www.instagram.com/", "https://www.instagram.com/");
  cleaned = cleaned.replace("https://instagram.com/https://instagram.com/", "https://instagram.com/");

  return cleaned;
}

function socialHandle(url: string) {
  try {
    const u = new URL(cleanSocialUrl(url));
    return u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function isBadSocialUrl(url: string) {
  const u = cleanSocialUrl(url).toLowerCase();

  if (u.includes("/reel/")) return true;
  if (u.includes("/p/")) return true;
  if (u.includes("/stories/")) return true;
  if (u.includes("/share")) return true;
  if (u.includes("intent/")) return true;
  if (u.includes("search?")) return true;
  if (u.includes("tix")) return true;
  if (u.includes("tickets")) return true;
  if (u.includes("ticket")) return true;

  return false;
}

function socialScore(url: string) {
  const handle = socialHandle(url);
  let score = 0;

  if (handle.includes("baseball")) score += 40;
  if (handle.includes("bsb")) score += 35;
  if (handle.includes("basebl")) score += 35;
  if (handle.includes("diamond")) score += 20;

  if (handle.includes("athletic")) score -= 35;
  if (handle.includes("gameday")) score -= 35;
  if (handle.includes("gocards")) score -= 35;
  if (handle.includes("gow")) score -= 25;
  if (handle.includes("owls")) score -= 20;
  if (handle.includes("packathletics")) score -= 35;
  if (handle.includes("tigersathletics")) score -= 35;

  return score;
}

function pickProgramXUrl(links: string[]) {
  const candidates = links
    .map(cleanSocialUrl)
    .filter((url) => {
      const u = url.toLowerCase();

      return (
        (u.includes("x.com/") || u.includes("twitter.com/")) &&
        !isBadSocialUrl(url)
      );
    })
    .sort((a, b) => socialScore(b) - socialScore(a));

  const best = candidates[0] || "";

  return best && socialScore(best) > -20 ? best : "";
}

function pickInstagramUrl(links: string[]) {
  const candidates = links
    .map(cleanSocialUrl)
    .filter((url) => {
      const u = url.toLowerCase();

      return u.includes("instagram.com/") && !isBadSocialUrl(url);
    })
    .sort((a, b) => socialScore(b) - socialScore(a));

  const best = candidates[0] || "";

  return best && socialScore(best) > -20 ? best : "";
}

function pickRecruitingQuestionnaireUrl(links: string[]) {
  const candidates = links
    .filter((url) => {
      const u = url.toLowerCase();
      return (
        u.includes("questionnaire") ||
        u.includes("armssoftware") ||
        u.includes("recruiting-form")
      );
    })
    .sort((a, b) => scoreRecruitingUrl(b) - scoreRecruitingUrl(a));

  return candidates[0] || "";
}

function pickRecruitsPageUrl(links: string[]) {
  const candidates = links
    .filter((url) => {
      const u = url.toLowerCase();

      return (
        u.includes("recruit") ||
        u.includes("questionnaire") ||
        u.includes("prospective-student-athlete") ||
        u.includes("prospective-athlete")
      );
    })
    .sort((a, b) => scoreRecruitingUrl(b) - scoreRecruitingUrl(a));

  const best = candidates[0] || "";

  return best && scoreRecruitingUrl(best) > 0 ? best : "";
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 ScoutLineBot/1.0 college baseball program social enrichment",
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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

const programs = await prisma.collegeBaseballProgram.findMany({
  where: {
    division: DIVISION,
    baseballWebsiteUrl: { not: null },
  },
  include: {
    college: true,
  },
  orderBy: [{ conference: "asc" }, { college: { name: "asc" } }],
  take: LIMIT,
});

console.log(`Scanning ${programs.length} ${DIVISION} programs...`);

  const rows: string[][] = [
    [
      "slug",
      "programXUrl",
      "programInstagramUrl",
      "recruitingQuestionnaireUrl",
      "recruitsPageUrl",
      "sourceUrl",
      "confidence",
      "verifiedAt",
      "reviewStatus",
    ],
  ];

  for (const program of programs) {
    const slug = program.college.slug;
    const sourceUrl = normalizeUrl(program.baseballWebsiteUrl);
if (
  sourceUrl?.includes("naiastats.prestosports.com") ||
  sourceUrl?.includes("njcaastats.prestosports.com")
) {
  console.log(`\n${program.college.name}`);
  console.log(`  slug: ${program.college.slug}`);
  console.log("  ⚠️ skipping stats URL");
  continue;
}

    console.log(`\n${program.college.name}`);
    console.log(`  slug: ${slug}`);

    if (!sourceUrl) {
      rows.push([slug, "", "", "", "", "", "LOW", "", "NO_BASEBALL_WEBSITE"]);
      console.log("  ⚠️ no baseball website");
      continue;
    }

    console.log(`  fetching: ${sourceUrl}`);

    const html = await fetchHtml(sourceUrl);

    if (!html) {
      rows.push([slug, "", "", "", "", sourceUrl, "LOW", "", "FETCH_FAILED"]);
      console.log("  ⚠️ fetch failed");
      continue;
    }

    const links = extractLinks(html, sourceUrl);

    const programXUrl = pickProgramXUrl(links);
    const programInstagramUrl = pickInstagramUrl(links);
    const recruitingQuestionnaireUrl = pickRecruitingQuestionnaireUrl(links);
    const recruitsPageUrl = pickRecruitsPageUrl(links);

    const foundCount = [
      programXUrl,
      programInstagramUrl,
      recruitingQuestionnaireUrl,
      recruitsPageUrl,
    ].filter(Boolean).length;

    const confidence =
      recruitingQuestionnaireUrl || recruitsPageUrl ? "MEDIUM" : foundCount ? "LOW" : "LOW";

    const reviewStatus = foundCount ? "NEEDS_REVIEW" : "NO_LINKS_FOUND";

    rows.push([
      slug,
      programXUrl,
      programInstagramUrl,
      recruitingQuestionnaireUrl,
      recruitsPageUrl,
      sourceUrl,
      confidence,
      "",
      reviewStatus,
    ]);

    console.log(
      `  ✅ found ${foundCount} item(s): X=${programXUrl ? "yes" : "no"}, IG=${
        programInstagramUrl ? "yes" : "no"
      }, questionnaire=${recruitingQuestionnaireUrl ? "yes" : "no"}, recruits=${
        recruitsPageUrl ? "yes" : "no"
      }`
    );
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
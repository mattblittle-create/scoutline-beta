// scripts/enrich-d1-coaches-dom.ts

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const OUT_FILE = path.join(
  OUT_DIR,
  `college-baseball-coaches.dom.generated.${stamp}.csv`
);

const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));

const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

function csvEscape(value: unknown) {
  const s = String(value ?? "");

  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

function normalizeUrl(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();

  if (!trimmed) return null;

  return trimmed.endsWith("/")
    ? trimmed.slice(0, -1)
    : trimmed;
}

function buildCandidateUrls(baseUrl: string | null | undefined) {
  const base = normalizeUrl(baseUrl);

  if (!base) return [];

  return Array.from(
    new Set([
      `${base}/coaches`,
      `${base}/roster#coaches`,
      `${base}/roster/`,
      `${base}/roster/coaches`,
      `${base}/coaching-staff`,
      `${base}/staff`,
      base,
    ])
  );
}

function absolutizeUrl(url: string, origin: string) {
  try {
    return new URL(url, origin).toString();
  } catch {
    return "";
  }
}

function cleanText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function looksLikeCoachTitle(value: string) {
  const v = value.toLowerCase();

  return [
    "head coach",
    "assistant coach",
    "associate head coach",
    "pitching coach",
    "hitting coach",
    "recruiting coordinator",
    "director of baseball operations",
    "volunteer assistant",
  ].some((x) => v.includes(x));
}

async function fetchHtml(url: string) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 ScoutLineBot/1.0 Coach Enrichment",
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
      division: "NCAA_D1",
      baseballWebsiteUrl: {
        not: null,
      },
    },
    include: {
      college: true,
    },
    orderBy: [
      {
        conference: "asc",
      },
      {
        college: {
          name: "asc",
        },
      },
    ],
    take: LIMIT,
  });

  console.log(`Scanning ${programs.length} D1 programs...`);

  const rows: string[][] = [
    [
      "slug",
      "name",
      "title",
      "email",
      "phone",
      "bioUrl",
      "contactUrl",
      "headshotUrl",
      "xUrl",
      "instagramUrl",
      "linkedinUrl",
      "isHeadCoach",
      "reviewStatus",
    ],
  ];

  for (const program of programs) {
    const slug = program.college.slug;

    console.log(`\n${program.college.name}`);
    console.log(`  slug: ${slug}`);

    const urls = buildCandidateUrls(
      program.baseballWebsiteUrl
    );

    let found = false;

    for (const url of urls) {
      console.log(`  trying: ${url}`);

      const html = await fetchHtml(url);

      if (!html) continue;

      const origin = new URL(url).origin;

      const $ = cheerio.load(html);

      const coachCards = $("article, .coach, .staff, .sidearm-roster-player");

      if (!coachCards.length) {
        continue;
      }

      const seen = new Set<string>();

      coachCards.each((_, el) => {
        const root = $(el);

        const text = cleanText(root.text());

        if (!looksLikeCoachTitle(text)) {
          return;
        }

        let name = "";
        let title = "";

        root.find("*").each((__, node) => {
          const t = cleanText($(node).text());

          if (!name && /^[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+)+$/.test(t)) {
            name = t;
          }

          if (!title && looksLikeCoachTitle(t)) {
            title = t;
          }
        });

        if (!name || !title) {
          return;
        }

        const dedupeKey = `${name}__${title}`;

        if (seen.has(dedupeKey)) {
          return;
        }

        seen.add(dedupeKey);

        const email =
          root.find('a[href^="mailto:"]').attr("href")?.replace("mailto:", "") ||
          "";

        const phone =
          root.find('a[href^="tel:"]').attr("href")?.replace("tel:", "") ||
          "";

        let bioUrl = "";

        root.find("a").each((__, a) => {
          const href = $(a).attr("href");

          if (!href) return;

          if (
            href.includes("/staff/") ||
            href.includes("/coaches/") ||
            href.includes("/bio/")
          ) {
            bioUrl = absolutizeUrl(href, origin);
          }
        });

        const img =
          root.find("img").attr("src") ||
          "";

        const headshotUrl = img
          ? absolutizeUrl(img, origin)
          : "";

        let xUrl = "";
        let instagramUrl = "";
        let linkedinUrl = "";

        root.find("a").each((__, a) => {
          const href = $(a).attr("href") || "";

          if (
            href.includes("twitter.com") ||
            href.includes("x.com")
          ) {
            xUrl = href;
          }

          if (href.includes("instagram.com")) {
            instagramUrl = href;
          }

          if (href.includes("linkedin.com")) {
            linkedinUrl = href;
          }
        });

        rows.push([
          slug,
          name,
          title,
          email,
          phone,
          bioUrl,
          url,
          headshotUrl,
          xUrl,
          instagramUrl,
          linkedinUrl,
          String(title.toLowerCase().includes("head coach")),
          "AUTO_IMPORTED",
        ]);
      });

      if (rows.length > 1) {
        console.log(`  ✅ parsed coach cards`);
        found = true;
        break;
      }
    }

    if (!found) {
      rows.push([
        slug,
        "",
        "",
        "",
        "",
        "",
        program.baseballWebsiteUrl ?? "",
        "",
        "",
        "",
        "",
        "false",
        "NEEDS_MANUAL_REVIEW",
      ]);

      console.log(`  ⚠️ no structured coach cards found`);
    }
  }

  const csv = rows
    .map((r) => r.map(csvEscape).join(","))
    .join("\n");

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
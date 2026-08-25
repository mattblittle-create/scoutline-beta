// scripts/enrich-academic-areas.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { ACADEMIC_AREA_OPTIONS } from "../app/lib/academics/academicAreas";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_FILE = path.join(
  OUT_DIR,
  `college-academic-areas.generated.${stamp}.csv`
);

const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 10000;

const WRITE = process.argv.includes("--write");

type AcademicAreaMatch = {
  area: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function candidateAcademicUrls(college: {
  majorsUrl?: string | null;
  academicsUrl?: string | null;
  websiteUrl?: string | null;
}) {
  const majorsUrl = normalizeUrl(college.majorsUrl);
  const academicsUrl = normalizeUrl(college.academicsUrl);
  const websiteUrl = normalizeUrl(college.websiteUrl);

  const websiteCandidates = websiteUrl
    ? [
        `${websiteUrl}/academics`,
        `${websiteUrl}/majors`,
        `${websiteUrl}/programs`,
        `${websiteUrl}/areas-of-study`,
        `${websiteUrl}/undergraduate-majors`,
        `${websiteUrl}/academic-programs`,
        `${websiteUrl}/degrees`,
        `${websiteUrl}/academics/majors`,
        `${websiteUrl}/academics/programs`,
        websiteUrl,
      ]
    : [];

  return Array.from(
    new Set(
      [
        majorsUrl,
        academicsUrl,
        ...websiteCandidates,
      ].filter(Boolean) as string[]
    )
  );
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 ScoutLineBot/1.0 college academic program enrichment",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    return stripHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function findAcademicAreas(text: string): AcademicAreaMatch[] {
  const matches: AcademicAreaMatch[] = [];

  for (const area of ACADEMIC_AREA_OPTIONS) {
    const escaped = area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const exactRe = new RegExp(`\\b${escaped}\\b`, "gi");
    const exactMatches = text.match(exactRe) || [];

    if (!exactMatches.length) continue;

    const lowerText = text.toLowerCase();
    const lowerArea = area.toLowerCase();

    const nearProgramLanguage =
      new RegExp(
        `(major|minor|degree|program|concentration|area of study|undergraduate|bachelor|b\\.a\\.|b\\.s\\.).{0,80}${escaped}|${escaped}.{0,80}(major|minor|degree|program|concentration|area of study|undergraduate|bachelor|b\\.a\\.|b\\.s\\.)`,
        "i"
      ).test(text);

    let confidence: AcademicAreaMatch["confidence"] = "LOW";
    let reason = "loose text match";

    if (exactMatches.length >= 3 && nearProgramLanguage) {
      confidence = "HIGH";
      reason = `appears ${exactMatches.length} times near program language`;
    } else if (nearProgramLanguage || exactMatches.length >= 2) {
      confidence = "MEDIUM";
      reason = nearProgramLanguage
        ? "appears near program language"
        : `appears ${exactMatches.length} times`;
    }

    // Avoid ultra-common weak words unless they have some academic context.
    const genericAreas = new Set([
      "Art",
      "Business",
      "Education",
      "English",
      "History",
      "Management",
      "Marketing",
      "Music",
      "Religion",
    ]);

    if (genericAreas.has(area) && confidence === "LOW") continue;

    matches.push({ area, confidence, reason });
  }

  return matches.sort((a, b) => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return rank[a.confidence] - rank[b.confidence] || a.area.localeCompare(b.area);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const colleges = await prisma.college.findMany({
    where: {
      OR: [
        { majorsUrl: { not: null } },
        { academicsUrl: { not: null } },
        { websiteUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      majorsUrl: true,
      academicsUrl: true,
      websiteUrl: true,
    },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

  console.log(
    `${WRITE ? "Writing" : "Scanning"} ${colleges.length} college academic pages...`
  );

  const rows: string[][] = [
[
  "slug",
  "collegeName",
  "highConfidenceAreas",
  "mediumConfidenceAreas",
  "lowConfidenceAreas",
  "writeAreas",
  "matchedCount",
  "writeCount",
  "sourceUrl",
  "writeStatus",
],
  ];

  let totalMatches = 0;
  let totalWritten = 0;

  for (const college of colleges) {
    console.log(`\n${college.name}`);
    console.log(`  slug: ${college.slug}`);

    const urls = candidateAcademicUrls(college);

let bestUrl = "";
let bestMatches: AcademicAreaMatch[] = [];

    for (const url of urls) {
      console.log(`  trying: ${url}`);

      const text = await fetchText(url);
      if (!text) continue;

const matches = findAcademicAreas(text);
const writableMatches = matches.filter((m) => m.confidence !== "LOW");

if (writableMatches.length > bestMatches.filter((m) => m.confidence !== "LOW").length) {
  bestMatches = matches;
  bestUrl = url;
}

if (
  writableMatches.length >= 3 &&
  /major|program|degree|area of study|academics|undergraduate|bachelor/i.test(text)
) {
  break;
}
    }

    totalMatches += bestMatches.length;

const writeMatches = bestMatches
  .filter((m) => m.confidence !== "LOW")
  .map((m) => m.area);

const highMatches = bestMatches
  .filter((m) => m.confidence === "HIGH")
  .map((m) => m.area);

const mediumMatches = bestMatches
  .filter((m) => m.confidence === "MEDIUM")
  .map((m) => m.area);

const lowMatches = bestMatches
  .filter((m) => m.confidence === "LOW")
  .map((m) => m.area);

let writeStatus = WRITE ? "NO_WRITABLE_MATCHES" : "DRY_RUN";

if (WRITE && writeMatches.length) {
  await prisma.collegeAcademicArea.deleteMany({
    where: { collegeId: college.id },
  });

  await prisma.collegeAcademicArea.createMany({
    data: writeMatches.map((name) => ({
      collegeId: college.id,
      name,
    })),
    skipDuplicates: true,
  });

  totalWritten += writeMatches.length;
  writeStatus = "WRITTEN";
}

rows.push([
  college.slug,
  college.name,
  highMatches.join("|"),
  mediumMatches.join("|"),
  lowMatches.join("|"),
  writeMatches.join("|"),
  String(bestMatches.length),
  String(writeMatches.length),
  bestUrl,
  writeStatus,
]);

console.log(
  bestMatches.length
    ? `  ✅ matched ${bestMatches.length} (${writeMatches.length} writable): ${writeMatches.join(", ")}`
    : "  ⚠️ no academic area matches"
);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  fs.writeFileSync(OUT_FILE, csv, "utf8");

  console.log(`\n✅ Wrote ${OUT_FILE}`);
  console.log(`Matched academic areas: ${totalMatches}`);
  if (WRITE) console.log(`Written academic area records: ${totalWritten}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
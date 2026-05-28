// scripts/enrich-d1-coaches.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_FILE = path.join(
  OUT_DIR,
  `college-baseball-coaches.generated.${stamp}.csv`
);

const OVERRIDES_FILE = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "coach-staff-page-overrides.csv"
);

const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

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

function readStaffUrlOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return new Map<string, string>();

  const raw = fs.readFileSync(OVERRIDES_FILE, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const [, ...rows] = lines;

  const map = new Map<string, string>();

  for (const line of rows) {
    const [slug, staffUrl] = line.split(",").map((v) => v.trim());
    if (slug && staffUrl) map.set(slug, staffUrl);
  }

  return map;
}

function candidateStaffUrls(baseballWebsiteUrl: string) {
  const base = normalizeUrl(baseballWebsiteUrl);
  if (!base) return [];

  return Array.from(
    new Set([
      `${base}/coaches`,
      `${base}/roster/coaches`,
      `${base}/coaching-staff`,
      `${base}/staff`,
      `${base}`,
    ])
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findCoachCandidates(text: string) {
  const titles = [
    "Head Coach",
    "Associate Head Coach",
    "Assistant Coach",
    "Pitching Coach",
    "Hitting Coach",
    "Recruiting Coordinator",
    "Director of Baseball Operations",
    "Volunteer Assistant Coach",
  ];

  const results: { name: string; title: string }[] = [];

  for (const title of titles) {
    const re = new RegExp(
      `([A-Z][a-zA-Z.'-]+(?:\\s+[A-Z][a-zA-Z.'-]+){1,3})\\s+${title}`,
      "g"
    );

    for (const match of text.matchAll(re)) {
const rawName = match[1]?.trim();
if (!rawName) continue;

const name = cleanCoachName(rawName);
if (isProbablyBadCoachName(rawName)) continue;

results.push({ name, title });
    }
  }

  return results;
}

function cleanCoachName(name: string) {
  return name
    .replace(/\b(Address|Phone|Email|Twitter|Staff|Archived|Stories|Additional|Links|Name|Sport|Administrator)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isProbablyBadCoachName(name: string) {
  const cleaned = cleanCoachName(name);
  if (!cleaned) return true;

  const badPhrases = [
    "address",
    "phone",
    "email",
    "twitter",
    "archived stories",
    "additional links",
    "name phone",
    "sport administrator",
  ];

  const lower = name.toLowerCase();

  if (badPhrases.some((p) => lower.includes(p))) return true;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return true;

  return false;
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 ScoutLineBot/1.0 college baseball program enrichment",
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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const staffUrlOverrides = readStaffUrlOverrides();

  const programs = await prisma.collegeBaseballProgram.findMany({
    where: {
      division: "NCAA_D1",
      baseballWebsiteUrl: { not: null },
    },
    include: {
      college: true,
    },
    orderBy: [{ conference: "asc" }, { college: { name: "asc" } }],
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
    const overrideUrl = staffUrlOverrides.get(slug);

const urls = Array.from(
  new Set([
    ...(overrideUrl ? [overrideUrl] : []),
    ...candidateStaffUrls(program.baseballWebsiteUrl ?? ""),
  ])
);

    console.log(`\n${program.college.name}`);
    console.log(`  slug: ${slug}`);

    let found = false;

    for (const url of urls) {
      console.log(`  trying: ${url}`);
      const text = await fetchText(url);
      if (!text) continue;

      const candidates = findCoachCandidates(text);

      if (candidates.length === 0) continue;

      for (const c of candidates.slice(0, 8)) {
rows.push([
  slug,
  c.name,
  c.title,
  "",
  "",
  url,
  "",
  "",
  "",
  "",
  "",
  String(c.title.toLowerCase().includes("head coach")),
  "NEEDS_REVIEW",
]);
      }

      console.log(`  ✅ found ${candidates.length} candidate(s)`);
      found = true;
      break;
    }

    if (!found) {
      rows.push([
  slug,
  "",
  "",
  "",
  "",
  program.baseballWebsiteUrl ?? "",
  "",
  "",
  "",
  "",
  "",
  "false",
  "NO_CANDIDATES_FOUND",
]);
      console.log(`  ⚠️ no candidates found`);
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
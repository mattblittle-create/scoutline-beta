// scripts/import-baseball-url-backfill.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = process.cwd();
const FILE_ARG = process.argv.find((a) => a.startsWith("--file="));
const DRY_RUN = process.argv.includes("--dry-run");

if (!FILE_ARG) {
  console.error("Missing --file= path");
  process.exit(1);
}

const FILE_PATH = path.resolve(ROOT, FILE_ARG.split("=")[1]);

type CsvRow = Record<string, string>;

function parseCsv(input: string): CsvRow[] {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",").map((h) => h.trim());

  return rows.map((line) => {
    const cols = line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = String(cols[i] ?? "").trim();
    });
    return row;
  });
}

function cleanUrl(value: string | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

async function main() {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`File not found: ${FILE_PATH}`);
  }

  const rows = parseCsv(fs.readFileSync(FILE_PATH, "utf8"));

  console.log(`ScoutLine baseball URL backfill`);
  console.log(DRY_RUN ? "Mode: DRY RUN" : "Mode: WRITE");
  console.log(`Rows: ${rows.length}`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const slug = String(row.slug ?? "").trim();
    const replacement = cleanUrl(row.replacementBaseballWebsiteUrl);

    if (!slug || !replacement) {
      skipped++;
      continue;
    }

    console.log(`\n${slug}`);
    console.log(`  replacement: ${replacement}`);

    const college = await prisma.college.findUnique({
      where: { slug },
      include: { baseballProgram: true },
    });

    if (!college?.baseballProgram) {
      console.log(`  ⚠️ no baseball program found`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  DRY update`);
      updated++;
      continue;
    }

    await prisma.collegeBaseballProgram.update({
      where: { id: college.baseballProgram.id },
      data: {
        baseballWebsiteUrl: replacement,
        dataSourceUrl: replacement,
        verificationStatus: "NEEDS_REVIEW",
      },
    });

    console.log(`  ✅ updated`);
    updated++;
  }

  console.log(`\n✅ Done`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("\n❌ Backfill failed:");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
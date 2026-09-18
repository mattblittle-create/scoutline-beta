// scripts/export-bad-baseball-urls.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_FILE = path.join(OUT_DIR, `bad-baseball-urls.${stamp}.csv`);

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isBadUrl(url: string | null | undefined) {
  const u = String(url ?? "").toLowerCase();

  return (
    !u ||
    u.includes("njcaastats.prestosports.com") ||
    u.includes("naiastats.prestosports.com")
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const programs = await prisma.collegeBaseballProgram.findMany({
    where: {
      OR: [
        { baseballWebsiteUrl: null },
        { baseballWebsiteUrl: { contains: "njcaastats.prestosports.com" } },
        { baseballWebsiteUrl: { contains: "naiastats.prestosports.com" } },
      ],
    },
    include: {
      college: true,
    },
    orderBy: [
      { division: "asc" },
      { conference: "asc" },
      { college: { name: "asc" } },
    ],
  });

  const rows: string[][] = [
    [
      "slug",
      "collegeName",
      "division",
      "conference",
      "currentBaseballWebsiteUrl",
      "replacementBaseballWebsiteUrl",
      "reviewStatus",
    ],
  ];

  for (const program of programs) {
    if (!isBadUrl(program.baseballWebsiteUrl)) continue;

    rows.push([
      program.college.slug,
      program.college.name,
      program.division ?? "",
      program.conference ?? "",
      program.baseballWebsiteUrl ?? "",
      "",
      "NEEDS_REPLACEMENT",
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  fs.writeFileSync(OUT_FILE, csv, "utf8");

  console.log(`✅ Exported ${rows.length - 1} bad baseball URL rows`);
  console.log(`✅ Wrote ${OUT_FILE}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
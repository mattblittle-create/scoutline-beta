// scripts/export-colleges-missing-geo.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const colleges = await prisma.college.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      division: true,
      conference: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const headers = [
    "id",
    "name",
    "slug",
    "city",
    "state",
    "zipCode",
    "latitude",
    "longitude",
    "division",
    "conference",
  ];

  const rows = colleges.map((c) =>
    headers.map((key) => csvEscape(c[key as keyof typeof c])).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const outDir = path.join(process.cwd(), "data");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "colleges-missing-geo.csv");
  fs.writeFileSync(outPath, csv, "utf8");

  console.log(`Exported ${colleges.length} rows`);
  console.log(`Created ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
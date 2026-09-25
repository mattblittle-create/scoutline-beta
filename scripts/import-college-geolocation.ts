// scripts/import-college-geolocation.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type Row = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseNullableFloat(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "colleges-missing-geo.csv");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const id = row.id?.trim();
    const latitude = parseNullableFloat(row.latitude ?? "");
    const longitude = parseNullableFloat(row.longitude ?? "");

    if (!id || latitude == null || longitude == null) {
      skipped++;
      continue;
    }

    await prisma.college.update({
      where: { id },
      data: {
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        zipCode: row.zipCode?.trim() || null,
        latitude,
        longitude,
      },
    });

    updated++;
  }

  console.log(`Rows read: ${rows.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
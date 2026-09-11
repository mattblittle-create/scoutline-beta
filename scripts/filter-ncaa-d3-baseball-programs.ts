// scripts/filter-ncaa-d3-baseball-programs.ts

import fs from "fs";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "data", "ncaa-d3-member-schools.csv");
const OUTPUT_PATH = path.join(process.cwd(), "data", "ncaa-d3-baseball-programs.csv");

type Row = Record<string, string>;

const BASEBALL_HINTS = [
  "baseball",
  "bsb",
  "baseball-schedule",
  "baseball-roster",
  "sports/baseball",
  "sports/bsb",
  "mens-baseball",
];

const NON_BASEBALL_SCHOOL_HINTS = [
  "women",
  "woman",
  "wellesley",
  "bryn-mawr",
  "mount-holyoke",
  "smith-college",
  "sweet-briar",
  "trinity-washington",
  "cedar-crest",
  "meredith",
  "agnes-scott",
  "hollins",
  "mills",
  "st-catherine",
  "st-catherines",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out;
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsv(content: string): { headers: string[]; rows: Row[] } {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const headers = parseCsvLine(lines[0]);

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });

  return { headers, rows };
}

function normalizeUrl(value: string): string {
  const s = clean(value);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function includesAny(value: string, hints: string[]): boolean {
  const lower = value.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function shouldAutoExclude(row: Row): boolean {
  const haystack = [
    row.name,
    row.slug,
    row.websiteUrl,
    row.baseballWebsiteUrl,
    row.conference,
  ]
    .map(clean)
    .join(" ")
    .toLowerCase();

  return includesAny(haystack, NON_BASEBALL_SCHOOL_HINTS);
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 ScoutLine baseball program verifier",
      },
    });

    if (!res.ok) return "";

    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function hasBaseballSignal(row: Row): Promise<boolean> {
  if (shouldAutoExclude(row)) return false;

  const athleticsUrl = normalizeUrl(row.baseballWebsiteUrl);
  if (!athleticsUrl) return false;

  const urlsToTry = [
    athleticsUrl,
    `${athleticsUrl.replace(/\/$/, "")}/sports/baseball`,
    `${athleticsUrl.replace(/\/$/, "")}/sports/baseball/roster`,
    `${athleticsUrl.replace(/\/$/, "")}/sports/baseball/schedule`,
    `${athleticsUrl.replace(/\/$/, "")}/sports/bsb`,
    `${athleticsUrl.replace(/\/$/, "")}/sports/bsb/roster`,
    `${athleticsUrl.replace(/\/$/, "")}/sports/bsb/schedule`,
  ];

  for (const url of urlsToTry) {
    const text = await fetchText(url);
    if (!text) continue;

    if (includesAny(text, BASEBALL_HINTS)) {
      row.rosterUrl ||= url.toLowerCase().includes("roster") ? url : "";
      row.scheduleUrl ||= url.toLowerCase().includes("schedule") ? url : "";
      return true;
    }
  }

  return false;
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Missing input file: ${INPUT_PATH}`);
  }

  const content = fs.readFileSync(INPUT_PATH, "utf8");
  const { headers, rows } = parseCsv(content);

  console.log(`Input rows: ${rows.length}`);

  const confirmed: Row[] = [];
  const rejected: Row[] = [];

  for (const row of rows) {
    const ok = await hasBaseballSignal(row);

    if (ok) {
      confirmed.push(row);
      console.log(`BASEBALL: ${row.name}`);
    } else {
      rejected.push(row);
      console.log(`SKIP: ${row.name}`);
    }
  }

  const output = [
    headers.join(","),
    ...confirmed.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");

  const rejectedPath = path.join(process.cwd(), "data", "ncaa-d3-rejected-schools.csv");
  const rejectedOutput = [
    headers.join(","),
    ...rejected.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\n");

  fs.writeFileSync(rejectedPath, rejectedOutput, "utf8");

  console.log("");
  console.log(`Confirmed baseball rows: ${confirmed.length}`);
  console.log(`Rejected rows: ${rejected.length}`);
  console.log(`Created: ${OUTPUT_PATH}`);
  console.log(`Rejected review file: ${rejectedPath}`);
}

main().catch((err) => {
  console.error("FILTER_NCAA_D3_BASEBALL_PROGRAMS_ERROR", err);
  process.exit(1);
});
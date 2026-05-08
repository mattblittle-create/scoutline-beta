// scripts/build-naia-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL =
  "https://web3.ncaa.org/directory/api/directory/memberList?type=4";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "naia-member-schools.csv"
);

const HEADERS = [
  "name",
  "slug",
  "city",
  "state",
  "region",
  "control",
  "schoolType",
  "websiteUrl",
  "admissionsUrl",
  "academicsUrl",
  "majorsUrl",
  "applicationUrl",
  "financialAidUrl",
  "tuitionInState",
  "tuitionOutOfState",
  "tuitionInternational",
  "tuitionYear",
  "enrollmentTotal",
  "enrollmentUndergrad",
  "acceptanceRate",
  "graduationRate",
  "dataSourceUrl",
  "verificationStatus",
  "baseballNickname",
  "baseballWebsiteUrl",
  "rosterUrl",
  "scheduleUrl",
  "campsUrl",
  "questionnaireUrl",
  "generalContactUrl",
  "generalContactEmail",
  "division",
  "conference",
  "logoUrl",
  "currentRosterSize",
  "averageGpa",
  "scholarshipNotes",
  "scholarshipInfoUrl",
  "transferHeavy",
  "jucoFriendly",
  "baseballDataSourceUrl",
  "baseballVerificationStatus",
];

type Member = {
  nameOfficial?: string;
  conferenceName?: string;
  webSiteUrl?: string;
  athleticWebUrl?: string;
  privateFlag?: string;
  nickname?: string;
  memberOrgAddress?: {
    city?: string;
    state?: string;
  };
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUrl(value: unknown): string {
  const s = clean(value);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function controlFromPrivateFlag(value: unknown): string {
  const s = clean(value).toUpperCase();
  if (s === "Y") return "PRIVATE";
  if (s === "N") return "PUBLIC";
  return "";
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 ScoutLine NAIA importer",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch NAIA directory: ${res.status}`);
  }

const text = await res.text();

console.log("Status:", res.status);
console.log("Content-Type:", res.headers.get("content-type"));
console.log("Body preview:");
console.log(text.slice(0, 500));

if (!text.trim()) {
  throw new Error("NAIA endpoint returned an empty response body.");
}

const data = JSON.parse(text) as Member[];

  const rows = data
    .map((member) => {
      const name = clean(member.nameOfficial);
      const city = clean(member.memberOrgAddress?.city);
      const state = clean(member.memberOrgAddress?.state);

      return {
        name,
        slug: slugify(name),
        city,
        state,
        region: "",
        control: controlFromPrivateFlag(member.privateFlag),
        schoolType: "FOUR_YEAR",
        websiteUrl: normalizeUrl(member.webSiteUrl),
        admissionsUrl: "",
        academicsUrl: "",
        majorsUrl: "",
        applicationUrl: "",
        financialAidUrl: "",
        tuitionInState: "",
        tuitionOutOfState: "",
        tuitionInternational: "",
        tuitionYear: "2026",
        enrollmentTotal: "",
        enrollmentUndergrad: "",
        acceptanceRate: "",
        graduationRate: "",
        dataSourceUrl: "https://collegescorecard.ed.gov/",
        verificationStatus: "NEEDS_REVIEW",
        baseballNickname: clean(member.nickname),
        baseballWebsiteUrl: normalizeUrl(member.athleticWebUrl),
        rosterUrl: "",
        scheduleUrl: "",
        campsUrl: "",
        questionnaireUrl: "",
        generalContactUrl: "",
        generalContactEmail: "",
        division: "NAIA",
        conference: clean(member.conferenceName),
        logoUrl: "",
        currentRosterSize: "",
        averageGpa: "",
        scholarshipNotes:
          "NAIA programs may offer athletic scholarships and other aid opportunities.",
        scholarshipInfoUrl: "https://www.naia.org/",
        transferHeavy: "false",
        jucoFriendly: "true",
        baseballDataSourceUrl:
          "https://web3.ncaa.org/directory/memberList?type=4",
        baseballVerificationStatus: "NEEDS_REVIEW",
      };
    })
    .filter((row) => row.name && row.state)
    .sort((a, b) => a.name.localeCompare(b.name));

  const bySlug = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    bySlug.set(row.slug, row);
  }

  const dedupedRows = Array.from(bySlug.values());

  const csv = [
    HEADERS.join(","),
    ...dedupedRows.map((row) =>
      HEADERS.map((header) =>
        escapeCsv((row as Record<string, string>)[header])
      ).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf8");

  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`Raw NAIA records: ${data.length}`);
  console.log(`CSV rows: ${dedupedRows.length}`);
}

main().catch((err) => {
  console.error("BUILD_NAIA_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});
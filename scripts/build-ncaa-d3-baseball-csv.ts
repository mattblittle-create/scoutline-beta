// scripts/build-ncaa-d3-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL =
  "https://web3.ncaa.org/directory/api/directory/memberList?type=12&division=3";

const OUTPUT_PATH = path.join(process.cwd(), "data", "ncaa-d3-baseball-programs.csv");

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

type NcaaMember = {
  nameOfficial?: string;
  division?: number;
  divisionRoman?: string;
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
      "User-Agent": "Mozilla/5.0 ScoutLine NCAA D3 importer",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch NCAA D3 directory: ${res.status}`);
  }

  const data = (await res.json()) as NcaaMember[];

  const d3Members = data.filter((member) => {
    return member.division === 3 || member.divisionRoman === "III";
  });

  const rows = d3Members
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
        division: "NCAA_D3",
        conference: clean(member.conferenceName),
        logoUrl: "",
        currentRosterSize: "",
        averageGpa: "",
        scholarshipNotes:
          "NCAA Division III programs do not award athletic scholarships, but student-athletes may receive academic, need-based, and other non-athletic aid.",
        scholarshipInfoUrl: "https://www.ncaa.org/sports/2014/10/6/division-iii.aspx",
        transferHeavy: "false",
        jucoFriendly: "false",
        baseballDataSourceUrl:
          "https://web3.ncaa.org/directory/memberList?type=12&division=3",
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
      HEADERS.map((header) => escapeCsv((row as Record<string, string>)[header])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf8");

  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`Raw NCAA records: ${data.length}`);
  console.log(`Filtered D3 members: ${d3Members.length}`);
  console.log(`CSV rows: ${dedupedRows.length}`);
}

main().catch((err) => {
  console.error("BUILD_NCAA_D3_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});
// app/api/colleges/search/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary static list until the real database is wired up.
const STATIC_COLLEGES = [
  "Alabama",
  "Arizona",
  "Arizona State",
  "Arkansas",
  "Auburn",
  "Baylor",
  "Boston College",
  "BYU",
  "Cal",
  "Cincinnati",
  "Clemson",
  "Coastal Carolina",
  "Colorado",
  "Columbia",
  "Cornell",
  "Creighton",
  "Dartmouth",
  "Duke",
  "East Carolina",
  "Florida",
  "Florida State",
  "Georgia",
  "Georgia Tech",
  "Gonzaga",
  "Harvard",
  "Indiana",
  "Kansas",
  "Kansas State",
  "Kentucky",
  "Liberty",
  "Louisiana State",
  "Louisville",
  "Miami",
  "Michigan",
  "Michigan State",
  "Mississippi State",
  "Missouri",
  "Nebraska",
  "North Carolina",
  "NC State",
  "Notre Dame",
  "Ohio State",
  "Oklahoma",
  "Oklahoma State",
  "Ole Miss",
  "Oregon",
  "Oregon State",
  "Penn State",
  "Pepperdine",
  "Pittsburgh",
  "Rice",
  "Rutgers",
  "Santa Clara",
  "South Carolina",
  "South Florida",
  "Southern Miss",
  "Stanford",
  "TCU",
  "Tennessee",
  "Texas",
  "Texas A&M",
  "Texas Tech",
  "Tulane",
  "UCLA",
  "UCF",
  "USC",
  "Utah",
  "Vanderbilt",
  "Virginia",
  "Virginia Tech",
  "Washington",
  "Washington State",
  "Wake Forest",
  "Wichita State",
  "Yale",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 25) || 25));

  // Match UI behavior: wait for 2+ chars
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] });
  }

  // Rank: prefix matches first (alphabetized), then substring matches (alphabetized)
  const starts = STATIC_COLLEGES.filter(n => n.toLowerCase().startsWith(q)).sort((a, b) => a.localeCompare(b));
  const contains = STATIC_COLLEGES
    .filter(n => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b));

  const combined = [...starts, ...contains].slice(0, limit);

  const results = combined.map(name => ({ id: slugify(name), name }));

  return NextResponse.json({ ok: true, results });
}

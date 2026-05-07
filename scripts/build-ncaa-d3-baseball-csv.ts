// scripts/build-ncaa-d3-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://www.ncsasports.org/baseball/division-3-colleges";
const OUTPUT_PATH = path.join(process.cwd(), "data", "ncaa-d3-baseball-programs.csv");

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 ScoutLine" },
  });

  if (!res.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status}`);

  const html = await res.text();

  fs.writeFileSync(path.join(process.cwd(), "data", "debug-d3-source.html"), html, "utf8");

  console.log("Downloaded D3 source HTML.");
  console.log("Saved debug file: data/debug-d3-source.html");
  console.log("Next: inspect source structure before parsing.");
}

main().catch((err) => {
  console.error("BUILD_NCAA_D3_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});
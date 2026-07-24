// scripts/restore-missing-d1-baseball-urls.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY_CHANGES = process.argv.includes("--apply");

const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

type RecoveryResult = {
  inferredUrl: string;
  sourceUrl: string;
  confidence: "HIGH" | "MANUAL";
};

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function inferBaseballWebsiteUrl(value: string): string {
  const raw = clean(value);

  if (!raw) return "";

  try {
    const parsed = new URL(raw);

    parsed.hash = "";
    parsed.search = "";

    let pathname = parsed.pathname.replace(/\/+$/, "");

    pathname = pathname
      .replace(
        /\/(?:coaches|roster|coaching-staff)(?:\/\d+)?$/i,
        "",
      )
      .replace(
        /\/roster\/coaches\/[^/]+\/\d+$/i,
        "",
      )
      .replace(
        /\/roster\/season\/\d+\/staff\/[^/]+$/i,
        "",
      )
      .replace(
        /\/coaches\/[^/]+\/\d+$/i,
        "",
      );

    return pathname
      ? `${parsed.origin}${pathname}`
      : parsed.origin;
  } catch {
    return "";
  }
}

function recoverFromContactUrls(
  contactUrls: string[],
): RecoveryResult {
  const uniqueContactUrls = Array.from(
    new Set(
      contactUrls
        .map(clean)
        .filter(Boolean),
    ),
  );

  const inferredUrls = Array.from(
    new Set(
      uniqueContactUrls
        .map(inferBaseballWebsiteUrl)
        .filter(Boolean),
    ),
  );

  if (inferredUrls.length === 1) {
    return {
      inferredUrl: inferredUrls[0],
      sourceUrl: uniqueContactUrls[0] ?? "",
      confidence: "HIGH",
    };
  }

  return {
    inferredUrl: "",
    sourceUrl: uniqueContactUrls.join(" | "),
    confidence: "MANUAL",
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const programs =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        division: "NCAA_D1",
        baseballWebsiteUrl: null,
      },
      include: {
        college: true,
        coaches: {
          select: {
            id: true,
            name: true,
            contactUrl: true,
          },
        },
      },
      orderBy: {
        college: {
          name: "asc",
        },
      },
    });

  const rows: unknown[][] = [];

  let eligibleForUpdate = 0;
  let updated = 0;
  let skippedNoUrl = 0;
  let skippedAmbiguous = 0;
  let skippedChangedSinceAudit = 0;

  for (const program of programs) {
    const result = recoverFromContactUrls(
      program.coaches
        .map((coach) => coach.contactUrl ?? "")
        .filter(Boolean),
    );

    let action = "SKIPPED";
    let reason = "";

    if (!result.inferredUrl) {
      skippedNoUrl += 1;
      reason = "No single recoverable URL";
    } else if (result.confidence !== "HIGH") {
      skippedAmbiguous += 1;
      reason = "Recovery was not high confidence";
    } else {
      eligibleForUpdate += 1;

      if (APPLY_CHANGES) {
        /*
         * Guard against overwriting a URL that was restored or edited
         * after this script loaded the candidate programs.
         */
        const updateResult =
          await prisma.collegeBaseballProgram.updateMany({
            where: {
              id: program.id,
              baseballWebsiteUrl: null,
            },
            data: {
              baseballWebsiteUrl:
                result.inferredUrl,
            },
          });

        if (updateResult.count === 1) {
          updated += 1;
          action = "UPDATED";
        } else {
          skippedChangedSinceAudit += 1;
          action = "SKIPPED";
          reason =
            "Program URL changed before update";
        }
      } else {
        action = "WOULD_UPDATE";
      }
    }

    rows.push([
      program.id,
      program.collegeId,
      program.college.name,
      program.college.slug,
      program.division,
      program.baseballWebsiteUrl ?? "",
      result.inferredUrl,
      result.confidence,
      result.sourceUrl,
      program.coaches.length,
      action,
      reason,
    ]);
  }

  const outputPath = path.join(
    OUTPUT_DIRECTORY,
    `d1-baseball-url-restoration.${timestamp}.csv`,
  );

  const csv = [
    [
      "programId",
      "collegeId",
      "collegeName",
      "slug",
      "division",
      "previousBaseballWebsiteUrl",
      "restoredBaseballWebsiteUrl",
      "confidence",
      "sourceContactUrl",
      "coachCount",
      "action",
      "reason",
    ],
    ...rows,
  ]
    .map((row) =>
      row.map(csvEscape).join(","),
    )
    .join("\n");

  fs.writeFileSync(
    outputPath,
    `${csv}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "======================================================",
  );
  console.log(
    "D1 BASEBALL URL RESTORATION",
  );
  console.log(
    "======================================================",
  );
  console.log(
    `Mode:                           ${
      APPLY_CHANGES ? "APPLY" : "DRY RUN"
    }`,
  );
  console.log(
    `Missing D1 URLs found:          ${programs.length}`,
  );
  console.log(
    `High-confidence updates:        ${eligibleForUpdate}`,
  );
  console.log(
    `Rows updated:                   ${updated}`,
  );
  console.log(
    `Skipped — no URL:               ${skippedNoUrl}`,
  );
  console.log(
    `Skipped — ambiguous:            ${skippedAmbiguous}`,
  );
  console.log(
    `Skipped — changed concurrently: ${skippedChangedSinceAudit}`,
  );
  console.log(
    "======================================================",
  );
  console.log(`\nAudit file: ${outputPath}`);

  if (!APPLY_CHANGES) {
    console.log(
      "\nDRY RUN ONLY: no database records were changed.",
    );
    console.log(
      "Run again with --apply after reviewing the CSV.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
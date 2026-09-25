// scripts/audit-d1-coaches-import.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IMPORT_SOURCE = "DOM_ENRICHMENT";

type ProgramAuditRow = {
  programId: string;
  collegeName: string;
  collegeSlug: string;
  activeCoachCount: number;
  inactiveCoachCount: number;
  activeHeadCoachCount: number;
  activeImportedCoachCount: number;
};

function printDivider(character = "=", length = 88): void {
  console.log(character.repeat(length));
}

function printSection(title: string): void {
  console.log("");
  console.log(title);
  printDivider("-", 88);
}

function printMetric(label: string, value: number | string): void {
  console.log(`${label.padEnd(42)} ${String(value).padStart(8)}`);
}

function normalizeEmail(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

async function main(): Promise<void> {
  const programs = await prisma.collegeBaseballProgram.findMany({
    where: {
      division: "NCAA_D1",
    },
    orderBy: {
      college: {
        name: "asc",
      },
    },
    select: {
      id: true,
      college: {
        select: {
          name: true,
          slug: true,
        },
      },
      coaches: {
        orderBy: [
          {
            isHeadCoach: "desc",
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          bioUrl: true,
          contactUrl: true,
          headshotUrl: true,
          isHeadCoach: true,
          importKey: true,
          dataSource: true,
          reviewStatus: true,
          isActive: true,
          lastSeenAt: true,
          sourceUrl: true,
          manuallyVerifiedAt: true,
        },
      },
    },
  });

  const auditRows: ProgramAuditRow[] = programs.map((program) => {
    const activeCoaches = program.coaches.filter(
      (coach) => coach.isActive,
    );

    const inactiveCoaches = program.coaches.filter(
      (coach) => !coach.isActive,
    );

    const activeHeadCoaches = activeCoaches.filter(
      (coach) => coach.isHeadCoach,
    );

    const activeImportedCoaches = activeCoaches.filter(
      (coach) => coach.dataSource === IMPORT_SOURCE,
    );

    return {
      programId: program.id,
      collegeName: program.college.name,
      collegeSlug: program.college.slug,
      activeCoachCount: activeCoaches.length,
      inactiveCoachCount: inactiveCoaches.length,
      activeHeadCoachCount: activeHeadCoaches.length,
      activeImportedCoachCount: activeImportedCoaches.length,
    };
  });

  const allCoaches = programs.flatMap((program) =>
    program.coaches.map((coach) => ({
      ...coach,
      programId: program.id,
      collegeName: program.college.name,
      collegeSlug: program.college.slug,
    })),
  );

  const activeCoaches = allCoaches.filter(
    (coach) => coach.isActive,
  );

  const inactiveCoaches = allCoaches.filter(
    (coach) => !coach.isActive,
  );

  const activeImportedCoaches = activeCoaches.filter(
    (coach) => coach.dataSource === IMPORT_SOURCE,
  );

  const activeManualCoaches = activeCoaches.filter(
    (coach) =>
      coach.dataSource !== IMPORT_SOURCE ||
      coach.manuallyVerifiedAt !== null,
  );

  const programsWithoutCoaches = auditRows.filter(
    (row) => row.activeCoachCount === 0,
  );

  const programsWithoutHeadCoach = auditRows.filter(
    (row) => row.activeHeadCoachCount === 0,
  );

  const programsWithMultipleHeadCoaches = auditRows.filter(
    (row) => row.activeHeadCoachCount > 1,
  );

  const programsWithNoImportedCoaches = auditRows.filter(
    (row) => row.activeImportedCoachCount === 0,
  );

  const needsReviewCoaches = activeCoaches.filter(
    (coach) => coach.reviewStatus === "NEEDS_REVIEW",
  );

  const autoImportedCoaches = activeCoaches.filter(
    (coach) => coach.reviewStatus === "AUTO_IMPORTED",
  );

  const missingEmailCoaches = activeCoaches.filter(
    (coach) => !coach.email?.trim(),
  );

  const missingPhoneCoaches = activeCoaches.filter(
    (coach) => !coach.phone?.trim(),
  );

  const missingBioUrlCoaches = activeCoaches.filter(
    (coach) => !coach.bioUrl?.trim(),
  );

  const missingContactUrlCoaches = activeCoaches.filter(
    (coach) => !coach.contactUrl?.trim(),
  );

  const missingImportKeyCoaches = activeImportedCoaches.filter(
    (coach) => !coach.importKey?.trim(),
  );

  const missingLastSeenAtCoaches = activeImportedCoaches.filter(
    (coach) => coach.lastSeenAt === null,
  );

  const missingSourceUrlCoaches = activeImportedCoaches.filter(
    (coach) => !coach.sourceUrl?.trim(),
  );

  const programsWithNoCoachEmails = programs.filter((program) => {
    const activeProgramCoaches = program.coaches.filter(
      (coach) => coach.isActive,
    );

    return (
      activeProgramCoaches.length > 0 &&
      activeProgramCoaches.every(
        (coach) => !coach.email?.trim(),
      )
    );
  });

  const duplicateImportKeyGroups = new Map<
    string,
    typeof activeImportedCoaches
  >();

  for (const coach of activeImportedCoaches) {
    if (!coach.importKey) {
      continue;
    }

    const compoundKey = `${coach.programId}|${coach.importKey}`;
    const existing =
      duplicateImportKeyGroups.get(compoundKey) ?? [];

    existing.push(coach);
    duplicateImportKeyGroups.set(compoundKey, existing);
  }

  const duplicateImportKeys = Array.from(
    duplicateImportKeyGroups.values(),
  ).filter((group) => group.length > 1);

  const activeEmailGroups = new Map<
    string,
    typeof activeCoaches
  >();

  for (const coach of activeCoaches) {
    const email = normalizeEmail(coach.email);

    if (!email) {
      continue;
    }

    const existing = activeEmailGroups.get(email) ?? [];
    existing.push(coach);
    activeEmailGroups.set(email, existing);
  }

  const sharedActiveEmails = Array.from(
    activeEmailGroups.entries(),
  )
    .filter(([, coaches]) => coaches.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  const duplicateNameGroups = new Map<
    string,
    typeof activeCoaches
  >();

  for (const coach of activeCoaches) {
    const normalizedName = coach.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");

    const compoundKey = `${coach.programId}|${normalizedName}`;
    const existing =
      duplicateNameGroups.get(compoundKey) ?? [];

    existing.push(coach);
    duplicateNameGroups.set(compoundKey, existing);
  }

  const duplicateActiveNames = Array.from(
    duplicateNameGroups.values(),
  ).filter((group) => group.length > 1);

  printDivider();
  console.log("D1 BASEBALL COACH IMPORT AUDIT");
  printDivider();

  printMetric("NCAA D1 programs:", programs.length);
  printMetric(
    "Programs with active coaches:",
    programs.length - programsWithoutCoaches.length,
  );
  printMetric(
    "Programs without active coaches:",
    programsWithoutCoaches.length,
  );
  printMetric(
    "Programs without imported coaches:",
    programsWithNoImportedCoaches.length,
  );

  console.log("");

  printMetric("Active coaches:", activeCoaches.length);
  printMetric("Inactive coaches:", inactiveCoaches.length);
  printMetric(
    "Active imported coaches:",
    activeImportedCoaches.length,
  );
  printMetric(
    "Active manual/protected coaches:",
    activeManualCoaches.length,
  );

  console.log("");

  printMetric(
    "Programs with 0 active head coaches:",
    programsWithoutHeadCoach.length,
  );
  printMetric(
    "Programs with multiple head coaches:",
    programsWithMultipleHeadCoaches.length,
  );

  console.log("");

  printMetric(
    "AUTO_IMPORTED coaches:",
    autoImportedCoaches.length,
  );
  printMetric(
    "NEEDS_REVIEW coaches:",
    needsReviewCoaches.length,
  );

  console.log("");

  printMetric(
    "Active coaches missing email:",
    missingEmailCoaches.length,
  );
  printMetric(
    "Active coaches missing phone:",
    missingPhoneCoaches.length,
  );
  printMetric(
    "Active coaches missing bio URL:",
    missingBioUrlCoaches.length,
  );
  printMetric(
    "Active coaches missing contact URL:",
    missingContactUrlCoaches.length,
  );

  console.log("");

  printMetric(
    "Imported coaches missing importKey:",
    missingImportKeyCoaches.length,
  );
  printMetric(
    "Imported coaches missing lastSeenAt:",
    missingLastSeenAtCoaches.length,
  );
  printMetric(
    "Imported coaches missing sourceUrl:",
    missingSourceUrlCoaches.length,
  );

  console.log("");

  printMetric(
    "Duplicate active importKey groups:",
    duplicateImportKeys.length,
  );
  printMetric(
    "Duplicate active name groups:",
    duplicateActiveNames.length,
  );
  printMetric(
    "Shared active email groups:",
    sharedActiveEmails.length,
  );
  printMetric(
    "Programs where all coaches lack email:",
    programsWithNoCoachEmails.length,
  );

  printDivider();

  if (programsWithoutCoaches.length > 0) {
    printSection("PROGRAMS WITHOUT ACTIVE COACHES");

    for (const row of programsWithoutCoaches) {
      console.log(
        `${row.collegeName} | ${row.collegeSlug}`,
      );
    }
  }

  if (programsWithNoImportedCoaches.length > 0) {
    printSection("PROGRAMS WITHOUT ACTIVE IMPORTED COACHES");

    for (const row of programsWithNoImportedCoaches) {
      console.log(
        `${row.collegeName} | ${row.collegeSlug}`,
      );
    }
  }

  if (programsWithoutHeadCoach.length > 0) {
    printSection("PROGRAMS WITHOUT AN ACTIVE HEAD COACH");

    for (const row of programsWithoutHeadCoach) {
      console.log(
        `${row.collegeName} | ${row.collegeSlug} | active coaches: ${row.activeCoachCount}`,
      );
    }
  }

  if (programsWithMultipleHeadCoaches.length > 0) {
    printSection("PROGRAMS WITH MULTIPLE ACTIVE HEAD COACHES");

    for (const row of programsWithMultipleHeadCoaches) {
      const program = programs.find(
        (candidate) => candidate.id === row.programId,
      );

      const headCoaches =
        program?.coaches.filter(
          (coach) =>
            coach.isActive && coach.isHeadCoach,
        ) ?? [];

      console.log(
        `${row.collegeName} | ${row.collegeSlug}`,
      );

      for (const coach of headCoaches) {
        console.log(
          `  ${coach.name} | ${coach.title ?? "(no title)"} | ${coach.email ?? "(no email)"}`,
        );
      }
    }
  }

  if (needsReviewCoaches.length > 0) {
    printSection("COACHES MARKED NEEDS_REVIEW");

    for (const coach of needsReviewCoaches) {
      console.log(
        `${coach.collegeName} | ${coach.name} | ${coach.title ?? "(no title)"} | ${coach.email ?? "(no email)"}`,
      );
      console.log(
        `  Contact: ${coach.contactUrl ?? "(none)"}`,
      );
      console.log(
        `  Bio: ${coach.bioUrl ?? "(none)"}`,
      );
    }
  }

  if (missingImportKeyCoaches.length > 0) {
    printSection("IMPORTED COACHES MISSING importKey");

    for (const coach of missingImportKeyCoaches) {
      console.log(
        `${coach.collegeName} | ${coach.name} | ${coach.title ?? "(no title)"}`,
      );
    }
  }

  if (missingLastSeenAtCoaches.length > 0) {
    printSection("IMPORTED COACHES MISSING lastSeenAt");

    for (const coach of missingLastSeenAtCoaches) {
      console.log(
        `${coach.collegeName} | ${coach.name}`,
      );
    }
  }

  if (duplicateImportKeys.length > 0) {
    printSection("DUPLICATE ACTIVE importKey GROUPS");

    for (const group of duplicateImportKeys) {
      for (const coach of group) {
        console.log(
          `${coach.collegeName} | ${coach.name} | ${coach.importKey}`,
        );
      }

      console.log("");
    }
  }

  if (duplicateActiveNames.length > 0) {
    printSection("DUPLICATE ACTIVE COACH NAMES WITHIN A PROGRAM");

    for (const group of duplicateActiveNames) {
      for (const coach of group) {
        console.log(
          `${coach.collegeName} | ${coach.name} | ${coach.title ?? "(no title)"} | ${coach.email ?? "(no email)"}`,
        );
      }

      console.log("");
    }
  }

  if (programsWithNoCoachEmails.length > 0) {
    printSection("PROGRAMS WHERE ALL ACTIVE COACHES LACK EMAIL");

    for (const program of programsWithNoCoachEmails) {
      console.log(
        `${program.college.name} | ${program.college.slug}`,
      );
    }
  }

  if (sharedActiveEmails.length > 0) {
    printSection("SHARED ACTIVE EMAIL ADDRESSES");

    console.log(
      "Shared program inboxes are common, so this section is informational rather than an automatic failure.",
    );
    console.log("");

    for (const [email, coaches] of sharedActiveEmails) {
      console.log(`${email} | ${coaches.length} coaches`);

      for (const coach of coaches) {
        console.log(
          `  ${coach.collegeName} | ${coach.name} | ${coach.title ?? "(no title)"}`,
        );
      }

      console.log("");
    }
  }

  if (inactiveCoaches.length > 0) {
    printSection("INACTIVE COACH RECORDS");

    for (const coach of inactiveCoaches) {
      console.log(
        `${coach.collegeName} | ${coach.name} | ${coach.title ?? "(no title)"} | ${coach.dataSource ?? "(no source)"}`,
      );
    }
  }

  const blockingIssueCount =
    programsWithoutCoaches.length +
    programsWithNoImportedCoaches.length +
    programsWithoutHeadCoach.length +
    duplicateImportKeys.length +
    missingImportKeyCoaches.length +
    missingLastSeenAtCoaches.length;

  console.log("");
  printDivider();

  if (blockingIssueCount === 0) {
    console.log("AUDIT RESULT: PASS");
    console.log(
      "No blocking import integrity issues were found.",
    );
  } else {
    console.log("AUDIT RESULT: REVIEW REQUIRED");
    console.log(
      `${blockingIssueCount} blocking issue group(s) require review.`,
    );
    process.exitCode = 1;
  }

  printDivider();
}

main()
  .catch((error) => {
    console.error("");
    console.error("Audit failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
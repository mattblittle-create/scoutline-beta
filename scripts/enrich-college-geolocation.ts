// scripts/enrich-college-geolocation.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const colleges = await prisma.college.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log(`Found ${colleges.length} colleges`);

  const missing = colleges.filter(
    (c) =>
      c.latitude == null ||
      c.longitude == null
  );

  console.log(`Missing coordinates: ${missing.length}`);

  for (const college of missing.slice(0, 25)) {
    console.log(
      `[MISSING GEO] ${college.name} | ${college.city ?? "?"}, ${college.state ?? "?"}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
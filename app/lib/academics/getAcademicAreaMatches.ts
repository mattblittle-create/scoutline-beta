// app/lib/academics/getAcademicAreaMatches.ts

import { ACADEMIC_AREA_ALIASES } from "./academicAreaAliases";

export function getAcademicAreaMatches(
  playerAreas: string[],
  schoolAreas: string[]
) {
  const schoolSet = new Set(
    schoolAreas.map((v) => v.trim().toLowerCase())
  );

  const matches = new Set<string>();

  for (const playerArea of playerAreas) {
    const aliases =
      ACADEMIC_AREA_ALIASES[playerArea] || [playerArea];

    for (const alias of aliases) {
      if (schoolSet.has(alias.toLowerCase())) {
        matches.add(playerArea);
        break;
      }
    }
  }

  return [...matches];
}
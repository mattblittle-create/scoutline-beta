// app/lib/truth-fit/getRosterOpportunity.ts

export type RosterOpportunityLevel =
  | "STRONG"
  | "MODERATE"
  | "LIMITED"
  | "UNKNOWN";

export type RosterOpportunityPosition = {
  position: string;

  level: RosterOpportunityLevel;

  currentDepth: number;

  projectedDepartures: number;

  projectedRemaining: number;

  projectedUpperclass: number;

  explanation: string;
};

export type RosterOpportunityResult = {
  rosterSeason: string | null;

  recruitingClass: number | null;

  yearsForward: number | null;

  opportunities: RosterOpportunityPosition[];
};

type PlayerInput = {
  gradYear?: number | null;

  primaryPos?: string | null;

  secondaryPos?: string | null;

  pitcherHand?: string | null;
};

type PositionCounts = {
  position?: string | null;

  total?: number | null;

  freshman?: number | null;

  redshirtFreshman?: number | null;

  sophomore?: number | null;

  junior?: number | null;

  senior?: number | null;

  graduate?: number | null;

  unknown?: number | null;

  departing?: number | null;
};

type RosterInput = {
  season?: string | null;

  rosterSize?: number | null;

  positions?: PositionCounts[] | null;
};

function asCount(
  value: unknown
): number {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? Math.max(
        0,
        Math.trunc(n)
      )
    : 0;
}

function normalizePosition(
  value: unknown
): string {
  const raw =
    String(value ?? "")
      .trim()
      .toUpperCase();

  if (!raw) {
    return "";
  }

  if (
    raw === "UTILITY" ||
    raw === "UTIL"
  ) {
    return "UTL";
  }

  return raw;
}

function normalizePlayerPosition(
  value: unknown
): string {
  const raw =
    normalizePosition(
      value
    );

  if (!raw) {
    return "";
  }

  /*
   * ScoutLine player preference grouping.
   *
   * These are the same conceptual groups used by the roster
   * composition display.
   */
  if (
    raw === "3B/1B" ||
    raw === "1B/3B"
  ) {
    return "CIF";
  }

  if (
    raw === "SS/2B" ||
    raw === "2B/SS"
  ) {
    return "MIF";
  }

  return raw;
}

function buildPlayerPositions(
  player: PlayerInput
): string[] {
  const out: string[] = [];

  function add(
    value: unknown
  ) {
    const position =
      normalizePlayerPosition(
        value
      );

    if (
      position &&
      !out.includes(position)
    ) {
      out.push(position);
    }
  }

  /*
   * Preserve player priority:
   *
   * 1. Primary position
   * 2. Secondary position
   * 3. Pitcher handedness
   */
  add(
    player.primaryPos
  );

  add(
    player.secondaryPos
  );

  const pitcherHand =
    normalizePosition(
      player.pitcherHand
    );

  if (
    pitcherHand === "RHP" ||
    pitcherHand === "LHP"
  ) {
    add(
      pitcherHand
    );
  }

  return out;
}

function relevantRosterPositions(
  playerPosition: string
): string[] {
  switch (
    playerPosition
  ) {
    case "3B":
      return [
        "3B",
        "CIF",
      ];

    case "1B":
      return [
        "1B",
        "CIF",
      ];

    case "SS":
      return [
        "SS",
        "MIF",
      ];

    case "2B":
      return [
        "2B",
        "MIF",
      ];

    case "LF":
      return [
        "LF",
        "OF",
      ];

    case "CF":
      return [
        "CF",
        "OF",
      ];

    case "RF":
      return [
        "RF",
        "OF",
      ];

    case "CIF":
      return [
        "CIF",
        "1B",
        "3B",
      ];

    case "MIF":
      return [
        "MIF",
        "2B",
        "SS",
      ];

    case "RHP":
      return [
        "RHP",
      ];

    case "LHP":
      return [
        "LHP",
      ];

    case "C":
      return [
        "C",
      ];

    case "INF":
      return [
        "INF",
      ];

    case "OF":
      return [
        "OF",
      ];

    case "UTL":
      return [
        "UTL",
      ];

    default:
      return [
        playerPosition,
      ];
  }
}

function mergePositionCounts(
  positions: PositionCounts[],
  playerPosition: string
) {
  const relevant =
    new Set(
      relevantRosterPositions(
        playerPosition
      )
    );

  const rows =
    positions.filter(
      (
        row,
      ) =>
        relevant.has(
          normalizePosition(
            row.position
          )
        )
    );

  type MergedPositionCounts = {
    total: number;
    freshman: number;
    redshirtFreshman: number;
    sophomore: number;
    junior: number;
    senior: number;
    graduate: number;
    unknown: number;
  };

  const initialCounts: MergedPositionCounts = {
    total: 0,
    freshman: 0,
    redshirtFreshman: 0,
    sophomore: 0,
    junior: 0,
    senior: 0,
    graduate: 0,
    unknown: 0,
  };

  return rows.reduce<MergedPositionCounts>(
    (
      total,
      row
    ) => ({
      total:
        total.total +
        asCount(
          row.total
        ),

      freshman:
        total.freshman +
        asCount(
          row.freshman
        ),

      redshirtFreshman:
        total.redshirtFreshman +
        asCount(
          row.redshirtFreshman
        ),

      sophomore:
        total.sophomore +
        asCount(
          row.sophomore
        ),

      junior:
        total.junior +
        asCount(
          row.junior
        ),

      senior:
        total.senior +
        asCount(
          row.senior
        ),

      graduate:
        total.graduate +
        asCount(
          row.graduate
        ),

      unknown:
        total.unknown +
        asCount(
          row.unknown
        ),
    }),
    initialCounts
  );
}

function projectClassCounts(
  counts: ReturnType<
    typeof mergePositionCounts
  >,
  yearsForward: number
) {
  /*
   * Conservative eligibility projection.
   *
   * We are projecting whether a player is likely to still
   * occupy roster space when the recruit's class arrives.
   *
   * This is intentionally not trying to predict:
   *
   * - transfers
   * - MLB draft departures
   * - medical redshirts
   * - additional eligibility
   * - incoming recruiting classes
   *
   * Those can become separate signals later.
   */

  let projectedRemaining =
    0;

  let projectedUpperclass =
    0;

  let projectedDepartures =
    0;

  function evaluate(
    count: number,
    academicIndex: number
  ) {
    /*
     * Academic index:
     *
     * 1 = freshman
     * 2 = sophomore
     * 3 = junior
     * 4 = senior
     *
     * Redshirt freshmen are treated conservatively as
     * freshmen for roster-presence projection.
     */
    const projectedIndex =
      academicIndex +
      yearsForward;

    if (
      projectedIndex <= 4
    ) {
      projectedRemaining +=
        count;

      if (
        projectedIndex >= 3
      ) {
        projectedUpperclass +=
          count;
      }
    } else {
      projectedDepartures +=
        count;
    }
  }

  evaluate(
    counts.freshman,
    1
  );

  evaluate(
    counts.redshirtFreshman,
    1
  );

  evaluate(
    counts.sophomore,
    2
  );

  evaluate(
    counts.junior,
    3
  );

  evaluate(
    counts.senior,
    4
  );

  /*
   * Graduate players are treated as departed for any future
   * recruiting season.
   */
  projectedDepartures +=
    counts.graduate;

  /*
   * Unknown class records cannot safely be projected.
   *
   * Keep them out of projectedRemaining and projectedDepartures
   * rather than inventing certainty.
   */

  return {
    projectedRemaining,

    projectedDepartures,

    projectedUpperclass,
  };
}

function determineOpportunityLevel({
  currentDepth,
  projectedRemaining,
  projectedDepartures,
}: {
  currentDepth: number;

  projectedRemaining: number;

  projectedDepartures: number;
}): RosterOpportunityLevel {
  /*
   * Thin projected depth is the strongest opportunity signal.
   */
  if (
    projectedRemaining <= 1
  ) {
    return "STRONG";
  }

  /*
   * Two or three projected returning players still leaves a
   * credible recruiting opening, particularly when turnover is
   * meaningful.
   */
  if (
    projectedRemaining <= 3
  ) {
    return "MODERATE";
  }

  /*
   * A deeper projected position group may still have moderate
   * opportunity when a large share of today's depth turns over.
   */
  if (
    currentDepth > 0 &&
    projectedDepartures >=
      Math.ceil(
        currentDepth * 0.5
      )
  ) {
    return "MODERATE";
  }

  return "LIMITED";
}

function explanationForOpportunity({
  level,
  projectedRemaining,
  projectedDepartures,
}: {
  level: RosterOpportunityLevel;

  projectedRemaining: number;

  projectedDepartures: number;
}): string {
  if (
    level === "STRONG"
  ) {
    if (
      projectedDepartures > 0
    ) {
      return "Thin future depth with projected turnover ahead of your arrival.";
    }

    return "Projected depth is thin at this position when your recruiting class arrives.";
  }

  if (
    level === "MODERATE"
  ) {
    if (
      projectedDepartures > 0
    ) {
      return "Some positional depth is projected to remain, but turnover creates a reasonable path to opportunity.";
    }

    return "Some positional depth is projected to remain, but there is still a reasonable path to opportunity.";
  }

  if (
    level === "LIMITED"
  ) {
    return "Multiple players are projected to remain at this position when your class arrives.";
  }

  return "Roster opportunity cannot be projected confidently from the available data.";
}

export function getRosterOpportunity({
  player,
  roster,
}: {
  player: PlayerInput;

  roster:
    | RosterInput
    | null
    | undefined;
}): RosterOpportunityResult {
  const recruitingClass =
    Number(
      player.gradYear
    );

  const rosterSeason =
    String(
      roster?.season ?? ""
    ).trim();

  if (
    !Number.isFinite(
      recruitingClass
    ) ||
    !rosterSeason
  ) {
    return {
      rosterSeason:
        rosterSeason ||
        null,

      recruitingClass:
        Number.isFinite(
          recruitingClass
        )
          ? recruitingClass
          : null,

      yearsForward:
        null,

      opportunities:
        [],
    };
  }

  const rosterYear =
    Number(
      rosterSeason
    );

  if (
    !Number.isFinite(
      rosterYear
    )
  ) {
    return {
      rosterSeason,

      recruitingClass,

      yearsForward:
        null,

      opportunities:
        [],
    };
  }

  const yearsForward =
    recruitingClass -
    rosterYear;

  /*
   * A roster season after the recruit's graduation year does
   * not produce a meaningful forward projection.
   */
  if (
    yearsForward < 0
  ) {
    return {
      rosterSeason,

      recruitingClass,

      yearsForward,

      opportunities:
        [],
    };
  }

  const playerPositions =
    buildPlayerPositions(
      player
    );

  const rosterPositions =
    Array.isArray(
      roster?.positions
    )
      ? roster!.positions!
      : [];

  const opportunities =
    playerPositions.map(
      (
        position,
      ): RosterOpportunityPosition => {
        const counts =
          mergePositionCounts(
            rosterPositions,
            position
          );

        /*
         * No source data for this position means UNKNOWN, not
         * automatically STRONG.
         *
         * Absence of evidence is not evidence of an empty depth
         * chart.
         */
        if (
          counts.total === 0
        ) {
          return {
            position,

            level:
              "UNKNOWN",

            currentDepth:
              0,

            projectedDepartures:
              0,

            projectedRemaining:
              0,

            projectedUpperclass:
              0,

            explanation:
              "This roster does not provide enough position-specific data to project opportunity confidently.",
          };
        }

        const projection =
          projectClassCounts(
            counts,
            yearsForward
          );

        const level =
          determineOpportunityLevel({
            currentDepth:
              counts.total,

            projectedRemaining:
              projection.projectedRemaining,

            projectedDepartures:
              projection.projectedDepartures,
          });

        return {
          position,

          level,

          currentDepth:
            counts.total,

          projectedDepartures:
            projection.projectedDepartures,

          projectedRemaining:
            projection.projectedRemaining,

          projectedUpperclass:
            projection.projectedUpperclass,

          explanation:
            explanationForOpportunity({
              level,

              projectedRemaining:
                projection.projectedRemaining,

              projectedDepartures:
                projection.projectedDepartures,
            }),
        };
      }
    );

  return {
    rosterSeason,

    recruitingClass,

    yearsForward,

    opportunities,
  };
}
export type VideoLink = { label: string; url: string };

export type Player = {
  id: string;
  name: string;
  gradYear: number;
  positions: string[];
  handedness?: string;
  height?: string;
  weight?: string;
  org: string;           // travel/training org
  school: string;        // high school
  city?: string;
  state?: string;
  committed: boolean;
  committedCollege?: string;
  metrics: {
    exitVelo?: string;
    infieldVelo?: string;
    outfieldVelo?: string;
    catcherPop?: string;
    sixtyYard?: string;
    fastballMax?: string;
  };
  academics?: {
    gpa?: string;
    interests?: string[];
  };
  bio?: string;
  videoLinks: VideoLink[];
};

export const braden: Player = {
  id: "BL-2028",
  name: "Braden Little",
  gradYear: 2028,
  positions: ["SS", "RHP"],
  handedness: "R/R",
  height: "6'0\"",
  weight: "178 lb",
  org: "The Battery Training Academy (Gastonia, NC)",
  school: "Legion Collegiate Academy (Rock Hill, SC)",
  city: "Charlotte area",
  state: "NC/SC",
  committed: false,
  metrics: {
    exitVelo: "92 mph",
    infieldVelo: "84 mph",
    sixtyYard: "7.08",
    fastballMax: "77 mph"
  },
  academics: {
    gpa: "—",
    interests: ["Sports Medicine", "Sports Marketing/Management"]
  },
  bio:
    "I love baseball—the work, the routine, and the growth. I train 4–5 days/week (strength, speed, agility) and follow a diet for lean muscle. Baseball has taught me accountability, resilience, and how to learn from setbacks.",
  videoLinks: [
    { label: "At-bat #1 on X", url: "https://x.com/BLittle2028/status/1939084011650846753" },
    { label: "At-bat #2 on X", url: "https://x.com/BLittle2028/status/1941915895334330546" },
    { label: "Fielding Rep on X", url: "https://x.com/BLittle2028/status/1924209539819217175" }
  ]
};

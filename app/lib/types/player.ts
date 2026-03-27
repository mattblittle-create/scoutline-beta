// app/lib/types/player.ts

export type PlanTier = "Redshirt" | "Walk-On" | "All-American" | "Teams";

export type MetricEntry = {
  monthYear: string; // "MM/YYYY"
  value: number;
  source?: string | null;
};

export type VideoSocialPayload = {
  externalVideos: {
    id: string;
    title?: string;
    url: string;
    source: "youtube" | "vimeo" | "mp4" | "gamechanger" | "unknown";
    addedAt: number;
  }[];
  localVideos: {
    id: string;
    title?: string;
    publicUrl: string;
    fileType: string;
    fileSize: number;
    addedAt: number;
  }[];
  social: {
    xHandle?: string;
    instagramHandle?: string;
    youtubeChannelUrl?: string;
    gameChangerUrl?: string;
    maxPrepsUrl?: string;
    rapsodoUrl?: string;
    trackmanUrl?: string;
    pocketRadarUrl?: string;
  };
  primary: { kind: "local" | "external"; id: string } | null;
};

export type CoachRef = {
  id: string;
  name: string;
  role?: string | null;
  org?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type StatsSeason = {
  season: string | null; // "Summer 2025"
  seasonTerm: "Spring" | "Summer" | "Fall" | "Winter" | null;
  seasonYear: number | null;
  team: string | null;
  statsFileNames: string[];
  // optional stat blocks already in your editor payload:
  hitting?: any | null;
  fielding?: any | null;
  catching?: any | null;
  pitching?: any | null;
  pitchTypes?: string[];
  statsMappedFrom?: string | null;
};

// Labeled document link
export type DocLink = { url: string; label?: string | null };

export type AtomicProfile = {
  // contact
  email: string;
  emailPrivate?: boolean;
  phone?: string | null;
  phonePrivate?: boolean;

  // name
  firstName?: string | null;
  lastName?: string | null;

  // academics
  gradYear?: number | null;
  hsName?: string | null;
  hometown?: string | null;
  state?: string | null;
  gpa?: number | null;
  gpaScale?: string | null;
  sat?: number | null;
  act?: number | null;
  academicBio?: string | null;
  academicBioPrivate?: boolean;

  // Intended majors
  areasOfStudyInput?: string | null;
  areasOfStudy?: string[];

  // Academic documents
  reportCardUrls?: string[];     // preferred single-uploader key
  transcriptUrls?: string[];     // preferred single-uploader key
  otherAcademicDocs?: DocLink[]; // multi-docs with labels

  // Legacy/aliases for back-compat (readers can normalize)
  reportCards?: string[];
  transcripts?: string[];
  additionalAcademicDocs?: DocLink[];
  otherDocs?: DocLink[];

  // athletics / core
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  pitcherHand?: "RHP" | "LHP" | null;
  throws?: "R" | "L" | "S" | null;
  bats?: "R" | "L" | "S" | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;
  age?: number | null;
  dob?: string | null; // client stores mm/dd/yyyy
  dobPrivate?: boolean;
  gender?: "Male" | "Female" | "" | null;

  // schedules / teams
  hsScheduleUrl?: string | null;
  hsSchedulePrivate?: boolean;
  travelTeamName?: string | null;
  travelTeamCity?: string | null;
  travelTeamState?: string | null;
  travelTeamScheduleUrl?: string | null;
  travelTeamSchedulePrivate?: boolean;
  otherTeams?: Array<{
    name?: string | null;
    city?: string | null;
    state?: string | null;
    scheduleUrl?: string | null;
  }>;

  // legacy (first other team)
  otherTeamName?: string | null;
  otherTeamCity?: string | null;
  otherTeamState?: string | null;
  otherTeamScheduleUrl?: string | null;

  // bios
  playerBio?: string | null;
  playerBioPrivate?: boolean;

  // eligibility
  eligibilityRegistered?: boolean;

  // commitment
  isCommitted?: boolean;
  committedProgram?: string | null;
  committedProgramId?: string | null;

  // metrics
  metrics?: Record<string, MetricEntry[]>;
  metricsPrivate?: Record<string, boolean>;

  // video / social / coaches
  externalVideos?: VideoSocialPayload["externalVideos"];
  localVideos?: VideoSocialPayload["localVideos"];
  social?: VideoSocialPayload["social"];
  primary?: VideoSocialPayload["primary"];
  coaches?: CoachRef[];

  // seasons (stats)
  statsSeasons?: StatsSeason[];

  // plan
  planTier?: PlanTier;
};

export type PublicPayload = {
  profile: {
    firstName: string | null;
    lastName: string | null;
    primaryPhotoUrl: string | null;

    // academics & core
    gradYear: number | null;
    gpa: number | null;
    gpaScale: string | null;
    heightFt: number | null;
    heightIn: number | null;
    weightLb: number | null;
    age: number | null;
    dob: string | null; // null if dobPrivate
    gender: string | null;

    // privacy-aware contact
    email: string | null;
    phone: string | null;

    // positions
    primaryPos: string | null;
    secondaryPos: string | null;
    isPitcher: "Yes" | "No" | "" | null;
    pitcherHand: "RHP" | "LHP" | null;
    bats: "R" | "L" | "S" | null;
    throws: "R" | "L" | "S" | null;

    // structured positions block (for UI)
    positions: { primary: string | null; secondary: string[] };

    // commitment
    committed: { isCommitted: boolean; program: string | null };

    // academics block
    academics: {
      bio: string | null;
      gradYear: number | null;
      gpa: number | null;
      gpaScale: string | null;
      sat: number | null;
      act: number | null;
      highSchool: string | null;
      city: string | null;
      state: string | null;
      areasOfStudy: string[];
      transcripts: string[];     // single-slot (UI uses first)
      reportCards: string[];     // single-slot (UI uses first)
      otherAcademicDocs: DocLink[]; // multi labeled links
    };

    // athletics block
    athletics: {
      playerBio: string | null;
      eligibilityRegistered: boolean;
      teams: Array<{
        kind: "High School" | "Travel" | "Other";
        name: string | null;
        city: string | null;
        state: string | null;
        scheduleUrl: string | null;
      }>;
    };

    // video/social
    videoSocial: VideoSocialPayload;

    // coaches
    coaches: CoachRef[];

    // seasons metadata
    seasons: StatsSeason[];
  };

  // pass through for charts
  metrics: Record<string, MetricEntry[]> | null;

  // optional stats aggregation
  stats: { seasons: StatsSeason[] };

  demoMode: "global" | "off";
  planTier: PlanTier;
};

/**
 * The editor -> API payload type used by /api/player/profile (POST).
 * This is the structure page.tsx builds and sends.
 */
export type PlayerProfilePayload = {
  // identity/contact
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  phonePrivate?: boolean;
  emailPrivate?: boolean;

  // academics
  gradYear?: number | null;
  hsName?: string | null;
  hsCity?: string | null;   // ✅ add this
  hsState?: string | null;
  hometown?: string | null; // city
  state?: string | null;

  gpa?: number | null;
  gpaScale?: string | null; // "5.0" | "4.0" | "100"
  sat?: number | null;
  act?: number | null;

  academicBio?: string | null;
  academicBioPrivate?: boolean;

  // Intended Major(s)
  areasOfStudyInput?: string | null; // CSV from UI
  areasOfStudy?: string[];           // normalized (title-cased)

  // Academic docs
  reportCardUrls?: string[];         // single-slot (UI shows first)
  transcriptUrls?: string[];         // single-slot (UI shows first)
  otherAcademicDocs?: DocLink[];     // multi

  // athletics/core
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "";
  pitcherHand?: "RHP" | "LHP" | "" | null;
  throws?: "R" | "L" | "S" | "" | null;
  bats?: "R" | "L" | "S" | "" | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;

  age?: number | null;
  dob?: string | null; // mm/dd/yyyy
  dobPrivate?: boolean;
  gender?: string | null;

  // eligibility
  eligibilityRegistered?: boolean;

  ncaaId?: string | null;
  naiaEcid?: string | null;

  // commitment
  isCommitted?: boolean;
  committedProgram?: string | null;
  committedProgramId?: string | null;

  // schedules
  hsScheduleUrl?: string | null;
  hsSchedulePrivate?: boolean;
  hsWebsiteUrl?: string | null;

  travelTeamName?: string | null;
  travelTeamCity?: string | null;
  travelTeamState?: string | null;
  travelTeamScheduleUrl?: string | null;
  travelTeamSchedulePrivate?: boolean;
  travelTeamWebsiteUrl?: string | null;

  // teams
  otherTeams?: Array<{
    name?: string | null;
    city?: string | null;
    state?: string | null;
    scheduleUrl?: string | null;
  }>;
  // legacy single other team (kept for back-compat with API)
  otherTeamName?: string | null;
  otherTeamCity?: string | null;
  otherTeamState?: string | null;
  otherTeamScheduleUrl?: string | null;

  // bios
  playerBio?: string | null;
  playerBioPrivate?: boolean;

  // video/social
  externalVideos?: any[];
  localVideos?: any[];
  social?: Record<string, any>;
  primary?: any;

  // coaches / references
  coaches?: CoachRef[];

  // stats (editor metadata only)
  statsSeasons?: Array<{
    season: string | null;
    seasonTerm: string | null;
    seasonYear: number | null;
    team: string | null;
    statsFileNames?: string[];
    hitting?: any;
    fielding?: any;
    catching?: any;
    pitching?: any;
    pitchTypes?: string[];
  }>;

  // metrics
  metrics?: Record<string, MetricEntry[]>;
  metricsPrivate?: Record<string, boolean>;
};

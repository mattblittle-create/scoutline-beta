export type CoreSlice = any;       // TODO: replace with your real shapes
export type AcademicsSlice = any;
export type AthleticsSlice = any;
export type MetricsSlice = any;
export type StatsSlice = any;

export type VideoSocialSlice = {
  localVideos: any[];
  externalVideos: any[];
  social: any;
  primary: { kind: "local" | "external"; id: string } | null | undefined;
};

export type CoachesSlice = {
  coaches: any[];
};

export type ProfilePayload = {
  email: string | null;
  updatedAt: number;
  core: CoreSlice | null;
  academics: AcademicsSlice | null;
  athletics: AthleticsSlice | null;
  metrics: MetricsSlice | null;
  stats: StatsSlice | null;
  videoSocial: VideoSocialSlice | null;
  coaches: CoachesSlice | null;
};

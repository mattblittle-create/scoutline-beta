export const RECRUITING_VIDEO_CATEGORIES = ["Hitting", "Fielding", "Pitching"] as const;
export type RecruitingVideoCategory = typeof RECRUITING_VIDEO_CATEGORIES[number];
export const VIDEO_UPLOAD_GUIDANCE = [
  { label: "Length", text: "Aim for 5–10 seconds per single clip, or no more than 90 seconds for an edited highlight video." },
  { label: "Clear view", text: "For hitting and fielding, film from the player’s front (chest side). Keep the action visible and minimize fences, netting, other players, and distractions. Audio isn’t needed." },
  { label: "Hitting", text: "Show the swing and first few steps out of the box. Skip the rest of the at-bat." },
  { label: "Fielding", text: "Show the player fielding the ball and making the throw. Skip the result of the play." },
  { label: "Pitching", text: "Show the full delivery and pitch from mound to plate. Film from a protected spot behind the catcher, slightly offset along the plate-side edge of the left-handed batter’s box." },
] as const;
export function isRetiredVideoCategory(category: unknown) { return String(category || "").trim().toLowerCase() === "baserunning"; }

type Target = { gradYear: number; positions: string[] };
const groups: Record<string, string[]> = { OF: ["LF", "CF", "RF"], MIF: ["2B", "SS"], CIF: ["1B", "3B"] };
export function matchesRecruitingTargets(targets: unknown, gradYear: number | null, primaryPosition: string | null, pitcherHand?: string | null) {
  if (!gradYear || !primaryPosition || !Array.isArray(targets)) return false;
  const position = primaryPosition.trim().toUpperCase();
  const hand = String(pitcherHand || "").toUpperCase();
  const pitcher = position === "P" ? (hand === "R" || hand === "RIGHT" || hand === "RHP" ? "RHP" : hand === "L" || hand === "LEFT" || hand === "LHP" ? "LHP" : null) : null;
  return targets.some((t: Target) => Number(t?.gradYear) === gradYear && Array.isArray(t?.positions) && t.positions.some(raw => {
    const target = String(raw).trim().toUpperCase();
    return target === position || target === pitcher || (target === "P" && ["RHP", "LHP"].includes(position)) || (groups[target] || []).includes(position);
  }));
}

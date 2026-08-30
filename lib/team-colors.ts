// Categorical palette (dark steps), fixed order, validated for CVD-safe adjacency.
// Teams beyond 8 cycle through the same set — fine for identity badges since
// only one or two are ever compared side-by-side in the UI at ordinary league sizes.
export const TEAM_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#29b529", // green
  "#9085e9", // violet
  "#e66767", // red
];

export function colorForIndex(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

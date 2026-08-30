"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Team = { id: string; name: string; shortName: string; color: string };
type Point = Record<string, string | number | null>;

const MUTED_LINE = "#3f3e46";
const MAX_SELECTED = 3;

function ChartTooltip({
  active,
  payload,
  label,
  teamsById,
  selected,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | null }[];
  label?: string;
  teamsById: Map<string, Team>;
  selected: Set<string>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const relevant = payload.filter(
    (p) => p.value != null && (selected.size === 0 || selected.has(String(p.dataKey)))
  );
  if (relevant.length === 0) return null;

  const sorted = [...relevant].sort((a, b) => (a.value ?? 99) - (b.value ?? 99));

  return (
    <div className="rounded-lg border border-border-hairline bg-bg-surface px-3 py-2 text-xs shadow-xl shadow-black/40">
      <div className="mb-1.5 font-semibold text-text-primary">{label}</div>
      <div className="space-y-1">
        {sorted.map((p) => {
          const team = teamsById.get(String(p.dataKey));
          if (!team) return null;
          return (
            <div key={team.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="flex-1 text-text-secondary">{team.name}</span>
              <span className="tabular-nums font-medium text-text-primary">{p.value?.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendsChart({
  data,
  teams,
  teamCount,
}: {
  data: Point[];
  teams: Team[];
  teamCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTED) {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {teams.map((team) => {
          const isSelected = selected.has(team.id);
          const disabled = !isSelected && selected.size >= MAX_SELECTED;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => toggle(team.id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                isSelected
                  ? "border-transparent text-white"
                  : "border-border-hairline bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-hover"
              }`}
              style={isSelected ? { backgroundColor: team.color } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isSelected ? "white" : team.color }}
              />
              {team.name}
            </button>
          );
        })}
      </div>

      <div className="h-[420px] rounded-2xl border border-border-hairline bg-bg-surface p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#2c2c2a" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "#898781", fontSize: 11 }}
              axisLine={{ stroke: "#383835" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              reversed
              domain={[1, teamCount]}
              allowDecimals={false}
              tick={{ fill: "#898781", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
              label={{ value: "avg rank", angle: -90, position: "insideLeft", fill: "#898781", fontSize: 11 }}
            />
            <Tooltip
              content={<ChartTooltip teamsById={teamsById} selected={selected} />}
              cursor={{ stroke: "#52514e", strokeDasharray: "3 3" }}
            />
            {teams.map((team) => {
              const isSelected = selected.has(team.id);
              const isDimmed = selected.size > 0 && !isSelected;
              return (
                <Line
                  key={team.id}
                  dataKey={team.id}
                  name={team.name}
                  stroke={isDimmed ? MUTED_LINE : team.color}
                  strokeWidth={isSelected ? 2.5 : 2}
                  strokeOpacity={isDimmed ? 0.5 : 1}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Lower is better — Week 1 rank of 1 means the top overall team that week.
      </p>
    </div>
  );
}

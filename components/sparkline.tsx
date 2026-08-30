export function Sparkline({
  values,
  color,
  width = 88,
  height = 28,
}: {
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
}) {
  const points = values
    .map((v, i) => (v == null ? null : { x: i, y: v }))
    .filter((p): p is { x: number; y: number } => p !== null);

  if (points.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-text-muted">
        —
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padY = 3;

  const scaleX = (x: number) => (maxX === minX ? width / 2 : ((x - minX) / (maxX - minX)) * width);
  // Inverted: lower rank (better) sits higher on the sparkline.
  const scaleY = (y: number) =>
    maxY === minY
      ? height / 2
      : padY + ((y - minY) / (maxY - minY)) * (height - padY * 2);

  const path = points.map((p) => `${scaleX(p.x)},${scaleY(p.y)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={scaleX(last.x)} cy={scaleY(last.y)} r={2.5} fill={color} />
    </svg>
  );
}

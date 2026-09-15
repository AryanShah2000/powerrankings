export function MovementBadge({
  delta,
  isNew,
  decimals = 1,
}: {
  delta: number | null;
  isNew: boolean;
  decimals?: number;
}) {
  if (isNew) {
    return (
      <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-strong">
        NEW
      </span>
    );
  }

  if (delta === null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text-muted">
        <span>–</span> 0
      </span>
    );
  }

  const isUp = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isUp ? "bg-status-good/15 text-status-good" : "bg-status-critical/15 text-status-critical"
      }`}
    >
      <span>{isUp ? "▲" : "▼"}</span>
      {Math.abs(delta).toFixed(decimals)}
    </span>
  );
}

import type { ReactNode } from 'react';

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  /** Custom row renderer; defaults to "name: value" per payload entry. */
  formatValue?: (value: number | string, name?: string) => ReactNode;
}

/**
 * Drop-in replacement for recharts' <Tooltip contentStyle={{...}} />.
 * The built-in `contentStyle` prop only accepts inline CSS, which is why
 * charts across the admin pages had a background hardcoded to white —
 * it looked fine in light mode but was jarring/unreadable in dark mode.
 * This renders real Tailwind-classed markup instead, so `dark:` variants
 * apply normally like everywhere else in the app.
 */
export default function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label !== undefined && (
        <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
          {entry.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />}
          {entry.name && <span>{entry.name}:</span>}
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {formatValue && entry.value !== undefined ? formatValue(entry.value, entry.name) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

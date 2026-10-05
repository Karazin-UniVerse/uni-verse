import type { TooltipContentProps } from 'recharts';
import css from './Chart.module.scss';

type ChartTooltipProps = Partial<TooltipContentProps<number, string>> & {
  valueLabel?: string;
  type?: 'bar' | 'donut';
};

export function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  type,
}: Readonly<ChartTooltipProps>) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const color = typeof item.color === 'string' ? item.color : undefined;
  const categoryName = item.name ? String(item.name) : undefined;
  const displayLabel = type === 'donut' ? categoryName : valueLabel;

  return (
    <div className={css.tooltip} role="status" aria-live="assertive">
      {type !== 'donut' && label !== null && label !== undefined && label !== '' && (
        <div className={css.tooltipLabel}>{String(label)}</div>
      )}
      <div className={css.tooltipRow}>
        {color && <span className={css.tooltipSwatch} style={{ background: color }} />}
        <span>
          {displayLabel ? `${displayLabel}: ` : ''}
          {item.value ?? 0}
        </span>
      </div>
    </div>
  );
}

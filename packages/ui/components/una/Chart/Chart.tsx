import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Rectangle,
  type TooltipContentProps,
} from 'recharts';
import clsx from 'clsx';
import css from './Chart.module.scss';
import { resolveCssColor, useChartTheme } from './useChartTheme';

export type * from './Chart.types';
import type { ChartProps } from './Chart.types';

const DEFAULT_SERIES_VARS = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
];

const Y_AXIS_WIDTH = 160;
const LABEL_MAX = 22;

function truncateLabel(value: string, max: number): string {
  if (value.length <= max) return value;

  return `${value.slice(0, max - 1)}…`;
}

type ChartTooltipProps = Partial<TooltipContentProps<number, string>> & {
  valueLabel?: string;
};

function ChartTooltip({ active, payload, label, valueLabel }: Readonly<ChartTooltipProps>) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const color = typeof item.color === 'string' ? item.color : undefined;

  return (
    <div className={css.tooltip} role="status" aria-live="assertive">
      {label !== null && label !== undefined && label !== '' && (
        <div className={css.tooltipLabel}>{String(label)}</div>
      )}
      <div className={css.tooltipRow}>
        {color && <span className={css.tooltipSwatch} style={{ background: color }} />}
        <span>
          {valueLabel ? `${valueLabel}: ` : ''}
          {item.value ?? 0}
        </span>
      </div>
    </div>
  );
}

function ChartLegend({ items }: Readonly<{ items: { name: string; color: string }[] }>) {
  if (items.length === 0) return null;

  return (
    <div className={css.legend}>
      {items.map((item) => (
        <span key={item.name} className={css.legendItem}>
          <span className={css.legendSwatch} style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

function calculateDefaultHeight(
  type: 'bar' | 'donut',
  layout: 'horizontal' | 'vertical',
  dataLength: number,
  rowHeight: number,
): number {
  if (type === 'donut') {
    return 220;
  }

  if (layout === 'horizontal') {
    return Math.max(240, dataLength * rowHeight);
  }

  return 280;
}

const renderBarShape = (
  props: React.ComponentProps<typeof Rectangle> & { payload?: { color?: string } },
) => {
  return <Rectangle {...props} fill={props.payload?.color ?? props.fill} />;
};

export function Chart({
  data,
  height,
  title,
  className,
  type = 'bar',
  layout = 'horizontal',
  domain = [0, 100],
  emptyDescription = 'Нет данных',
  valueLabel = 'Значение',
  showLegend = type === 'donut',
  animate = false,
  categoryWidth = Y_AXIS_WIDTH,
  maxCategoryLength = LABEL_MAX,
  rowHeight = 44,
  maxBarSize = 22,
  innerRadius = 55,
  outerRadius = 80,
}: Readonly<ChartProps>) {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const theme = useChartTheme(rootEl);

  const chartData = useMemo(
    () =>
      data.map((datum, index) => {
        const fallback = theme.series[index % theme.series.length];
        const raw = datum.color ?? DEFAULT_SERIES_VARS[index % DEFAULT_SERIES_VARS.length];
        const resolvedColor = resolveCssColor(rootEl, raw, fallback);

        return {
          ...datum,
          color: resolvedColor,
          fill: resolvedColor,
        };
      }),
    [data, rootEl, theme.series],
  );

  const barRadius = theme.themeKey === 'cyberpunk' ? 0 : 4;

  if (chartData.length === 0) {
    return (
      <div ref={setRootEl} className={clsx(css.wrap, className)}>
        {title && <h3 className={css.title}>{title}</h3>}
        <div className={css.empty}>{emptyDescription}</div>
      </div>
    );
  }

  const resolvedHeight =
    height ?? calculateDefaultHeight(type, layout, chartData.length, rowHeight);
  const plotHeight = type === 'donut' && title ? resolvedHeight - 28 : resolvedHeight;
  const tickStyle = { fill: theme.tick, fontSize: 12 };

  const renderChartContent = () => {
    if (type === 'donut') {
      return (
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            isAnimationActive={animate}
            stroke={theme.themeKey === 'cyberpunk' ? theme.axis : 'transparent'}
            strokeWidth={theme.themeKey === 'cyberpunk' ? 1 : 0}
          />
          <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} />
        </PieChart>
      );
    }

    if (layout === 'horizontal') {
      return (
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={domain}
            tick={tickStyle}
            axisLine={{ stroke: theme.axis }}
            tickLine={{ stroke: theme.axis }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={categoryWidth}
            tickFormatter={(value) => truncateLabel(String(value), maxCategoryLength)}
            tick={tickStyle}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
            interval={0}
          />
          <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} />
          <Bar
            dataKey="value"
            radius={[0, barRadius, barRadius, 0]}
            maxBarSize={maxBarSize}
            isAnimationActive={animate}
            shape={renderBarShape}
          />
        </BarChart>
      );
    }

    return (
      <BarChart data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(value) => truncateLabel(String(value), maxCategoryLength)}
          tick={tickStyle}
          axisLine={{ stroke: theme.axis }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          type="number"
          domain={domain}
          tick={tickStyle}
          axisLine={{ stroke: theme.axis }}
          tickLine={{ stroke: theme.axis }}
        />
        <Tooltip content={<ChartTooltip valueLabel={valueLabel} />} />
        <Bar
          dataKey="value"
          radius={[barRadius, barRadius, 0, 0]}
          maxBarSize={maxBarSize}
          isAnimationActive={animate}
          shape={renderBarShape}
        />
      </BarChart>
    );
  };

  return (
    <div ref={setRootEl} className={clsx(css.wrap, className)}>
      {title && <h3 className={css.title}>{title}</h3>}
      <div className={css.chart} style={{ height: plotHeight }}>
        <ResponsiveContainer key={theme.themeKey} width="100%" height={plotHeight} debounce={50}>
          {renderChartContent()}
        </ResponsiveContainer>
      </div>
      {showLegend && type === 'donut' && <ChartLegend items={chartData} />}
    </div>
  );
}

export default Chart;

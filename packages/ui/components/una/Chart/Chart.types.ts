export type ChartDatum = {
  name: string;
  value: number;
  color?: string;
};

export type ChartProps = {
  data: ChartDatum[];
  animate?: boolean;
  'aria-label'?: string;
  ariaLabel?: string;
  'aria-labelledby'?: string;
  ariaLabelledBy?: string;
  'aria-describedby'?: string;
  ariaDescribedBy?: string;
  /** Y-axis label width for horizontal bar charts */
  categoryWidth?: number;
  className?: string;
  domain?: [number, number];
  emptyDescription?: string;
  height?: number;
  innerRadius?: number;
  /** For bar charts: horizontal bars (category on Y) or vertical bars (category on X) */
  layout?: 'horizontal' | 'vertical';
  maxBarSize?: number;
  maxCategoryLength?: number;
  outerRadius?: number;
  role?: string;
  rowHeight?: number;
  showLegend?: boolean;
  title?: string;
  type?: 'bar' | 'donut';
  valueLabel?: string;
};

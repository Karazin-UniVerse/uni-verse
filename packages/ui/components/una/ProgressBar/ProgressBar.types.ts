export type ProgressBarProps = {
  value: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  max?: number;
  tone?: 'success' | 'warning' | 'danger' | 'info';
};

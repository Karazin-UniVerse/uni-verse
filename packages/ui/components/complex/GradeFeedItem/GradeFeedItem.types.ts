export type GradeScoreTone = 'success' | 'info' | 'warning' | 'danger' | 'default';

export type GradeFeedItemProps = {
  title: string;
  courseName: string;
  dateText: string;
  score: string | number;
  scoreTone?: GradeScoreTone;
  scoreBadgeClassName?: string;
  onClick?: () => void;
  titleTooltip?: string;
  animationDelayMs?: number;
  className?: string;
};

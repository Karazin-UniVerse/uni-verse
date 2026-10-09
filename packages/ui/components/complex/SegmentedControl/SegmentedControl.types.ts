import type { ReactNode } from 'react';

export type SegmentedControlItem<TId extends string> = {
  id: TId;
  label: string;
  icon?: ReactNode;
  badge?: number;
};

export type SegmentedControlProps<TId extends string> = {
  items: SegmentedControlItem<TId>[];
  selectedId: TId;
  panelIdPrefix: string;
  onSelect: (id: TId) => void;
  ariaLabel?: string;
  className?: string;
};

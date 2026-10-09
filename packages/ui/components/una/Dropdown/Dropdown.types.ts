import type { MouseEvent, ReactNode } from 'react';
import type { PopoverPlacement } from '../Popover/Popover.types';

export type DropdownTriggerProps = {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  'aria-expanded': boolean;
  'aria-controls'?: string;
};

export type DropdownProps = {
  children: ReactNode | ((close: () => void) => ReactNode);
  renderTrigger: (triggerProps: DropdownTriggerProps, isOpen: boolean) => ReactNode;
  className?: string;
  isFullWidth?: boolean;
  isPadded?: boolean;
  placement?: PopoverPlacement;
  width?: number | string;
};

export type DropdownOptionProps = {
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
};

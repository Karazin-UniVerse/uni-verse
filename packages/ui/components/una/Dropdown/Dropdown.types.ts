import type { MouseEvent, ReactNode } from 'react';
import type { PopoverPlacement } from '../Popover/Popover.types';

export type DropdownPanelRole = 'listbox' | 'menu';

export type DropdownTriggerProps = {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  'aria-expanded': boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: DropdownPanelRole;
};

export type DropdownProps = {
  trigger: (triggerProps: DropdownTriggerProps, isOpen: boolean) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
  isFullWidth?: boolean;
  isPadded?: boolean;
  panelLabel?: string;
  panelRole?: DropdownPanelRole;
  placement?: PopoverPlacement;
  width?: number | string;
};

export type DropdownOptionProps = {
  children: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
};

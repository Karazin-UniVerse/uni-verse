import type { ReactNode, RefObject } from 'react';

export type PopoverPlacement = 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  anchorRef?: RefObject<HTMLElement | null>;
  ariaLabel?: string;
  className?: string;
  title?: ReactNode;
  width?: number | string;
  closeButton?: boolean;
  closeLabel?: string;
  placement?: PopoverPlacement;
}

import type { ReactNode, RefObject } from 'react';

export type PopoverPlacement = 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';

export type PopoverProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  className?: string;
  closeLabel?: string;
  footer?: ReactNode;
  id?: string;
  title?: ReactNode;
  width?: number | string;
  closeButton?: boolean;
  placement?: PopoverPlacement;
};

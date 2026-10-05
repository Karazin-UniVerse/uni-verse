import type { ReactNode } from 'react';

export type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  ariaLabel?: string;
  className?: string;
  closeLabel?: string;
  title?: ReactNode;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  width?: number | string;
};

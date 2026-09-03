import type { ReactNode } from 'react';

export type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  ariaLabel?: string;
  className?: string;
  title?: ReactNode;
  width?: number | string;
};

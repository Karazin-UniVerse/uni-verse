import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: number;
  kind: ToastKind;
  text: string;
};

export type ToastApi = {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  warning: (text: string) => void;
  dismiss: (id?: number) => void;
};

export type ToastProviderProps = {
  children: ReactNode;
};

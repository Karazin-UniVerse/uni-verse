import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import styles from './Toast.module.scss';

import type { ToastApi, ToastItem, ToastKind, ToastProviderProps } from './Toast.types';

const ToastContext = createContext<ToastApi | null>(null);

let toastId = 0;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++toastId;

    setItems((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
      info: (text) => push('info', text),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`${styles.toast} ${styles[item.kind]}`}>
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return ctx;
}

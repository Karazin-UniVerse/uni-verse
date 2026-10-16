import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.scss';
import { ToastMessage } from './ToastMessage';

import type { ToastApi, ToastItem, ToastKind, ToastProviderProps } from './Toast.types';

const ToastContext = createContext<ToastApi | null>(null);

let toastId = 0;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const activeTextsRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id?: number) => {
    if (id !== undefined) {
      setItems((prev) => prev.filter((t) => t.id !== id));
    } else {
      setItems([]);
    }
  }, []);

  const push = useCallback((kind: ToastKind, text: string) => {
    const key = `${kind}:${text}`;
    const now = Date.now();
    const lastDispatched = activeTextsRef.current.get(key) ?? 0;

    if (now - lastDispatched < 1000) {
      return;
    }

    activeTextsRef.current.set(key, now);
    const id = ++toastId;

    setItems((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));

      if (activeTextsRef.current.get(key) === now) {
        activeTextsRef.current.delete(key);
      }
    }, 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
      info: (text) => push('info', text),
      warning: (text) => push('warning', text),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.viewport} aria-live="polite">
        {items.map((item) => (
          <ToastMessage
            key={item.id}
            kind={item.kind}
            text={item.text}
            onDismiss={() => dismiss(item.id)}
          />
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

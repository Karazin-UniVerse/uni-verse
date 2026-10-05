import type { RefObject } from 'react';
import { useClickOutside, useEscapeKey, useFocusTrap, useScrollLock } from '../../../hooks';

export type UseModalOptions = {
  enabled?: boolean;
  restoreFocus?: boolean;
};

export function useModal(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: UseModalOptions = {},
): void {
  const { enabled = true, restoreFocus = true } = options;

  useClickOutside(ref, onClose, { enabled });
  useEscapeKey(onClose, { enabled });
  useFocusTrap(ref, { enabled, restoreFocus });
  useScrollLock(enabled);
}

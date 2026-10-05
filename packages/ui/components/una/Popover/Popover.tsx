import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import type { PopoverProps } from './Popover.types';
import styles from './Popover.module.scss';

export const Popover: React.FC<PopoverProps> = ({
  open,
  onClose,
  children,
  anchorRef,
  title,
  width,
  className,
  ariaLabel,
  closeButton = true,
  closeLabel = 'Close',
  placement = 'bottom-end',
}) => {
  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useClickOutside(panelRef, onClose, {
    enabled: open,
    ignoreRef: anchorRef,
  });

  useEscapeKey(onClose, {
    enabled: open,
  });

  if (!open) {
    return null;
  }

  const dialogAriaLabel = title ? undefined : ariaLabel;

  return (
    <dialog
      open
      ref={panelRef}
      aria-modal="false"
      aria-labelledby={title ? titleId : undefined}
      aria-label={dialogAriaLabel}
      className={`${styles.popover} ${styles[placement]} ${className ?? ''}`}
      style={
        width
          ? ({
              '--popover-width': typeof width === 'number' ? `${width}px` : width,
            } as React.CSSProperties)
          : undefined
      }
    >
      {(title || closeButton) && (
        <div className={styles.header}>
          {title && (
            <div id={titleId} className={styles.title}>
              {title}
            </div>
          )}
          {closeButton && (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </dialog>
  );
};

export default Popover;

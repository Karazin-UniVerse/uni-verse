import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useClickOutside, useEscapeKey } from '../../../hooks';
import type { PopoverPlacement, PopoverProps } from './Popover.types';
import styles from './Popover.module.scss';

const PLACEMENT_CLASS_MAP: Record<PopoverPlacement, string> = {
  'bottom-end': styles.bottomEnd,
  'bottom-start': styles.bottomStart,
  'top-end': styles.topEnd,
  'top-start': styles.topStart,
};

export const Popover: React.FC<PopoverProps> = ({
  children,
  onClose,
  open,
  anchorRef,
  className,
  closeLabel,
  footer,
  id,
  title,
  width,
  closeButton = false,
  placement = 'bottom-end',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();

  useClickOutside(popoverRef, onClose, {
    enabled: open,
    ignoreRef: anchorRef,
  });

  useEscapeKey(onClose, {
    enabled: open,
  });

  if (!open) {
    return null;
  }

  const popoverId = id || generatedId;
  const titleId = `${popoverId}-title`;
  const placementClass = PLACEMENT_CLASS_MAP[placement] || styles.bottomEnd;
  const showHeader = Boolean(title || closeButton);

  return (
    <div
      ref={popoverRef}
      id={popoverId}
      className={`${styles.popover} ${placementClass} ${className ?? ''}`}
      style={
        {
          '--popover-width': typeof width === 'number' ? `${width}px` : width,
        } as React.CSSProperties
      }
      role="dialog"
      aria-modal="false"
      aria-labelledby={title ? titleId : undefined}
      tabIndex={-1}
    >
      {showHeader && (
        <div className={styles.header}>
          {title && (
            <h4 id={titleId} className={styles.title}>
              {title}
            </h4>
          )}
          {closeButton && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={closeLabel ?? 'Close'}
              title={closeLabel ?? 'Close'}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className={styles.body}>{children}</div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Popover;

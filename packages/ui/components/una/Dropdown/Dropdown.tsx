import React, { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import type { DropdownProps, DropdownTriggerProps } from './Dropdown.types';
import styles from './Dropdown.module.scss';

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  className,
  panelLabel,
  panelRole,
  width,
  isFullWidth = false,
  isPadded = false,
  placement = 'bottom-end',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const panelId = useId();

  const close = (): void => {
    setIsOpen(false);
    triggerElement?.focus();
  };

  useClickOutside(containerRef, () => setIsOpen(false), { enabled: isOpen });
  useEscapeKey(close, { enabled: isOpen });

  const triggerProps: DropdownTriggerProps = {
    onClick: (event) => {
      setTriggerElement(event.currentTarget);
      setIsOpen((prev) => !prev);
    },
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? panelId : undefined,
    'aria-haspopup': panelRole,
  };

  return (
    <div
      ref={containerRef}
      className={clsx(styles.dropdown, isFullWidth && styles.fullWidth, className)}
    >
      {trigger(triggerProps, isOpen)}

      {isOpen && (
        <div
          id={panelId}
          role={panelRole}
          aria-label={panelLabel}
          className={clsx(styles.panel, styles[placement], isPadded && styles.padded)}
          style={
            width
              ? ({
                  '--dropdown-width': typeof width === 'number' ? `${width}px` : width,
                } as React.CSSProperties)
              : undefined
          }
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

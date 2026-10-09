import React, { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useEscapeKey } from '../../../hooks/useEscapeKey';
import type { PopoverPlacement } from '../Popover/Popover.types';
import type { DropdownProps, DropdownTriggerProps } from './Dropdown.types';
import styles from './Dropdown.module.scss';

const MIN_SPACE_ABOVE = 110;

const FLIPPED_DOWN: Partial<Record<PopoverPlacement, PopoverPlacement>> = {
  'top-end': 'bottom-end',
  'top-start': 'bottom-start',
};

function resolvePlacement(
  placement: PopoverPlacement,
  rect: DOMRect,
  windowHeight: number,
): PopoverPlacement {
  const spaceAbove = rect.top;
  const spaceBelow = windowHeight - rect.bottom;
  const isCramped = spaceAbove < MIN_SPACE_ABOVE && spaceBelow > spaceAbove;

  return (isCramped && FLIPPED_DOWN[placement]) || placement;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  className,
  width,
  isFullWidth = false,
  isPadded = false,
  placement = 'bottom-end',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<PopoverPlacement>(placement);
  const panelId = useId();

  const close = (): void => {
    setIsOpen(false);
    triggerElement?.focus();
  };

  useClickOutside(containerRef, () => setIsOpen(false), { enabled: isOpen });
  useEscapeKey(close, { enabled: isOpen });

  const triggerProps: DropdownTriggerProps = {
    onClick: (event) => {
      if (!isOpen) {
        setResolvedPlacement(
          resolvePlacement(
            placement,
            event.currentTarget.getBoundingClientRect(),
            window.innerHeight,
          ),
        );
      }

      setTriggerElement(event.currentTarget);
      setIsOpen((prev) => !prev);
    },
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? panelId : undefined,
  };

  return (
    <div
      ref={containerRef}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
      className={clsx(styles.dropdown, isFullWidth && styles.fullWidth, className)}
    >
      {trigger(triggerProps, isOpen)}

      {isOpen && (
        <div
          id={panelId}
          className={clsx(styles.panel, styles[resolvedPlacement], isPadded && styles.padded)}
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

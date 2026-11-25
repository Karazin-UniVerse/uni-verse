import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { DropdownOptionProps } from './Dropdown.types';
import styles from './DropdownOption.module.scss';

const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_VERTICAL_NUDGE_PX = 4;
const MIN_LEFT_SPACE_PX = 220;
const VIEWPORT_PADDING_PX = 12;

type TooltipPosition = {
  top: number;
  left: number;
  side: 'left' | 'top';
};

export const DropdownOption: React.FC<DropdownOptionProps> = ({
  children,
  isSelected,
  onSelect,
  icon,
  tabIndex,
  tooltip,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();

  const showTooltip = (target: HTMLElement): void => {
    if (!tooltip) {
      return;
    }

    const rect = target.getBoundingClientRect();

    if (rect.left >= MIN_LEFT_SPACE_PX) {
      setTooltipPosition({
        top: rect.top + rect.height / 2 + TOOLTIP_VERTICAL_NUDGE_PX,
        left: rect.left - TOOLTIP_OFFSET_PX,
        side: 'left',
      });

      return;
    }

    setTooltipPosition({
      top: rect.top - TOOLTIP_VERTICAL_NUDGE_PX,
      left: Math.max(VIEWPORT_PADDING_PX, rect.left),
      side: 'top',
    });
  };

  const hideTooltip = (): void => {
    setTooltipPosition(null);
  };

  const handleClick = (): void => {
    hideTooltip();
    onSelect();
  };

  return (
    <>
      <button
        type="button"
        tabIndex={tabIndex}
        aria-pressed={isSelected}
        aria-describedby={tooltip && tooltipPosition ? tooltipId : undefined}
        className={clsx(styles.option, isSelected && styles.active)}
        onClick={handleClick}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
      >
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <span>{children}</span>
        {isSelected && <Check size={16} className={styles.check} aria-hidden />}
      </button>

      {tooltip &&
        tooltipPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className={clsx(
              styles.tooltip,
              tooltipPosition.side === 'left' ? styles.tooltipLeft : styles.tooltipTop,
            )}
            style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
};

export default DropdownOption;

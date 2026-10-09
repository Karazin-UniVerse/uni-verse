import React, { useRef } from 'react';
import clsx from 'clsx';
import type { SegmentedControlProps } from './SegmentedControl.types';
import styles from './SegmentedControl.module.scss';

export function SegmentedControl<TId extends string>({
  items,
  selectedId,
  panelIdPrefix,
  onSelect,
  ariaLabel,
  className,
}: SegmentedControlProps<TId>): React.ReactElement {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ): void => {
    const lastIndex = items.length - 1;
    const targetIndexByKey: Record<string, number> = {
      ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
      ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
      Home: 0,
      End: lastIndex,
    };
    const targetIndex = targetIndexByKey[event.key];
    const targetItem = targetIndex === undefined ? undefined : items[targetIndex];

    if (!targetItem) {
      return;
    }

    event.preventDefault();
    onSelect(targetItem.id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
      [targetIndex]?.focus();
  };

  return (
    <div
      ref={listRef}
      className={clsx(styles.segmentedControl, className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const isActive = item.id === selectedId;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${panelIdPrefix}-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            className={clsx(styles.segmentItem, isActive && styles.activeSegment)}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className={styles.badgePill}>{item.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

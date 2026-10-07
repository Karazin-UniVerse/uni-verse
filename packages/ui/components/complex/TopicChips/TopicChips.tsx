import React, { useRef } from 'react';
import clsx from 'clsx';
import type { TopicChipsProps } from './TopicChips.types';
import styles from './TopicChips.module.scss';

export const TopicChips: React.FC<TopicChipsProps> = ({
  label,
  ariaLabel,
  options,
  selectedId,
  onSelect,
  className,
}) => {
  const groupRef = useRef<HTMLDivElement>(null);
  const hasSelection = options.some((option) => option.id === selectedId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let targetIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = options.length - 1;
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < options.length) {
      const nextOption = options[targetIndex];

      if (nextOption) {
        onSelect(nextOption.id);
        const buttons =
          groupRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');

        buttons?.[targetIndex]?.focus();
      }
    }
  };

  return (
    <div className={clsx(styles.templatesSection, className)}>
      {label && <span className={styles.sectionLabel}>{label}</span>}
      <div
        ref={groupRef}
        className={styles.chipsList}
        role="radiogroup"
        aria-label={label || ariaLabel}
      >
        {options.map((option, index) => {
          const isActive = selectedId === option.id;
          const isFocusable = isActive || (!hasSelection && index === 0);

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isFocusable ? 0 : -1}
              className={clsx(styles.chipBtn, isActive && styles.chipBtnActive)}
              onClick={() => onSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopicChips;

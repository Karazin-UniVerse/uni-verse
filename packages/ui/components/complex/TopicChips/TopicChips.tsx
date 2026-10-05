import React from 'react';
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
  return (
    <div className={clsx(styles.templatesSection, className)}>
      {label && <span className={styles.sectionLabel}>{label}</span>}
      <div className={styles.chipsList} role="radiogroup" aria-label={label || ariaLabel}>
        {options.map((option) => {
          const isActive = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={clsx(styles.chipBtn, isActive && styles.chipBtnActive)}
              onClick={() => onSelect(option.id)}
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

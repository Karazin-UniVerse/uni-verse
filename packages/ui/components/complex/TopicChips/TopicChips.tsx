import React from 'react';
import clsx from 'clsx';
import type { TopicChipsProps } from './TopicChips.types';
import styles from './TopicChips.module.scss';

export const TopicChips: React.FC<TopicChipsProps> = ({
  label,
  options,
  selectedId,
  onSelect,
  className,
}) => {
  return (
    <div className={clsx(styles.templatesSection, className)}>
      {label && <span className={styles.sectionLabel}>{label}</span>}
      <div className={styles.chipsList} role="group" aria-label={label}>
        {options.map((option) => {
          const isActive = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={clsx(styles.chipBtn, isActive && styles.chipBtnActive)}
              onClick={() => onSelect(option.id)}
              aria-pressed={isActive}
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

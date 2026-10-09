import React from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { DropdownOptionProps } from './Dropdown.types';
import styles from './DropdownOption.module.scss';

export const DropdownOption: React.FC<DropdownOptionProps> = ({
  children,
  isSelected,
  onSelect,
  icon,
}) => (
  <button
    type="button"
    aria-pressed={isSelected}
    className={clsx(styles.option, isSelected && styles.active)}
    onClick={onSelect}
  >
    {icon && (
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
    )}
    <span>{children}</span>
    {isSelected && <Check size={16} className={styles.check} aria-hidden />}
  </button>
);

export default DropdownOption;

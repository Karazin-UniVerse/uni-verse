import React from 'react';
import styles from './Select.module.scss';

import type { SelectProps } from './Select.types';

export type { Option, SelectProps } from './Select.types';

export const Select: React.FC<SelectProps> = ({ value, onChange, options, className, ...rest }) => (
  <select
    className={`${styles.select} ${className ?? ''}`}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    {...rest}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

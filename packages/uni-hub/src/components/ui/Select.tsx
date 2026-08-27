import React from 'react';
import styles from './Select.module.scss';

type Option = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  'aria-label'?: string;
};

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

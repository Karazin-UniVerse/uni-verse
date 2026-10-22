'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordToggle.module.scss';

export interface PasswordToggleProps {
  label: string;
  onToggle: () => void;
  show: boolean;
  className?: string;
}

export const PasswordToggle: React.FC<PasswordToggleProps> = ({
  label,
  onToggle,
  show,
  className,
}) => {
  const buttonClassName = className
    ? `${styles.passwordToggle} ${className}`
    : styles.passwordToggle;

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
};

export default PasswordToggle;

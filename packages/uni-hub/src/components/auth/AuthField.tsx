'use client';

import React from 'react';
import { TextInput } from '@una';
import styles from './AuthField.module.scss';

export interface AuthFieldProps {
  autoComplete?: string;
  icon: React.ReactNode;
  id: string;
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  value: string;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  autoComplete,
  icon,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
  type = 'text',
}) => {
  return (
    <label htmlFor={id} className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.inputWrap}>
        <span className={styles.icon}>{icon}</span>
        <TextInput
          id={id}
          name={name}
          type={type}
          size="large"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
      </div>
    </label>
  );
};

export default AuthField;

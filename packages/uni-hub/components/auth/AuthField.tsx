'use client';

import React from 'react';
import { PasswordInput, TextInput } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './AuthField.module.scss';

export interface AuthFieldProps {
  icon: React.ReactNode;
  id: string;
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
  autoComplete?: string;
  hidePasswordLabel?: string;
  rightElement?: React.ReactNode;
  showPasswordLabel?: string;
  type?: string;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  icon,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
  autoComplete,
  hidePasswordLabel,
  rightElement,
  showPasswordLabel,
  type = 'text',
}) => {
  const { formatMessage } = useLanguage();

  if (type === 'password') {
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <PasswordInput
          id={id}
          name={name}
          size="large"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete ?? 'current-password'}
          leftIcon={icon}
          showPasswordLabel={showPasswordLabel ?? formatMessage('login.showPassword')}
          hidePasswordLabel={hidePasswordLabel ?? formatMessage('login.hidePassword')}
        />
      </div>
    );
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.inputWrap} ${rightElement ? styles.hasRightElement : ''}`}>
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
        {rightElement ? <div className={styles.rightElement}>{rightElement}</div> : null}
      </div>
    </div>
  );
};

export default AuthField;

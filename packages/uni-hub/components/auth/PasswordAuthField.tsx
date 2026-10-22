'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { AuthField } from './AuthField';
import { PasswordToggle } from './PasswordToggle';

export interface PasswordAuthFieldProps {
  id: string;
  label: string;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  value: string;
  autoComplete?: string;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}

export const PasswordAuthField: React.FC<PasswordAuthFieldProps> = ({
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
  onTogglePassword,
  showPassword: controlledShowPassword,
  autoComplete = 'current-password',
}) => {
  const { formatMessage } = useLanguage();
  const [internalShow, setInternalShow] = useState(false);

  const isControlled = controlledShowPassword !== undefined;
  const show = isControlled ? controlledShowPassword : internalShow;

  const handleToggle = (): void => {
    if (onTogglePassword) {
      onTogglePassword();
    } else {
      setInternalShow((prev) => !prev);
    }
  };

  return (
    <AuthField
      id={id}
      name={name}
      type={show ? 'text' : 'password'}
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      icon={<Lock size={16} />}
      rightElement={
        <PasswordToggle
          show={show}
          onToggle={handleToggle}
          label={formatMessage(show ? 'login.hidePassword' : 'login.showPassword')}
        />
      }
    />
  );
};

export default PasswordAuthField;

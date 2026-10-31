import type { ReactNode } from 'react';
import type { TextInputProps } from '../TextInput/TextInput.types';

export interface PasswordInputProps extends Omit<TextInputProps, 'type'> {
  hidePasswordLabel: string;
  showPasswordLabel: string;
  leftIcon?: ReactNode;
  onTogglePassword?: (show: boolean) => void;
  showPassword?: boolean;
  wrapperClassName?: string;
}

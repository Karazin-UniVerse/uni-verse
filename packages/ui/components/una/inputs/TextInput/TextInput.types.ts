import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  isTransparent?: boolean;
}

export type SimpleInputProps = TextInputProps;

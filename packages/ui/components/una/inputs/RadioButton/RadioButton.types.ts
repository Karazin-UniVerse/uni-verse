import type { InputHTMLAttributes } from 'react';

export interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  variant: 'primary' | 'secondary';
}

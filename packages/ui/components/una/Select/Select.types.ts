import type { SelectHTMLAttributes } from 'react';

export type Option = {
  value: string;
  label: string;
};

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange'
> {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

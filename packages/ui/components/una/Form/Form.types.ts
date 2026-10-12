import type { FormHTMLAttributes } from 'react';

export interface FormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'action' | 'onSubmit'
> {
  action?: (formData: FormData) => void | Promise<void>;
  onData?: (data: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => void;
  variant?: 'simple' | 'card';
}

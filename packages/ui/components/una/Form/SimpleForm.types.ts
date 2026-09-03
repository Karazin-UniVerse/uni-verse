import type { FormHTMLAttributes } from 'react';

export interface SimpleFormProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'action' | 'onSubmit'
> {
  action?: (formData: FormData) => void | Promise<void>;
  onData?: (data: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => void;
  variant?: 'simple' | 'card';
}

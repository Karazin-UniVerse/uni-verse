import React from 'react';
import css from './SimpleForm.module.scss';
import clsx from 'clsx';

export interface SimpleFormProps extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'action' | 'onSubmit'
> {
  action?: (formData: FormData) => void | Promise<void>;
  onData?: (data: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => void;
  variant?: 'simple' | 'card';
}

/**
 * SimpleForm
 *
 * Lightweight form wrapper that normalizes form submission into two flows:
 * - `action(formData)` for custom server-side or async handlers
 * - `onData(data)` receives a plain object with form entries (useful for client-side handling)
 *
 * The component accepts all native <form> attributes (method, name, etc.).
 * If `action` is provided it will be invoked with the FormData on submit.
 * `onData` is invoked with an aggregated object where repeated keys become arrays.
 *
 * Props:
 * @param children
 * @param className
 * @param {(formData: FormData) => void | Promise<void>} [action] - Optional async action executed on submit.
 * @param {(data: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => void} [onData] - Callback receiving a plain object of form values.
 * @param {'simple'|'card'} [variant='card'] - Visual variant for form container.
 *
 * Example:
 * ```tsx
 * <SimpleForm onData={data => console.log(data)}>
 *   <TextInput name="email" />
 *   <Button type="submit" variant="primary">Send</Button>
 * </SimpleForm>
 * ```
 * @param props
 */
export const SimpleForm: React.FC<SimpleFormProps> = ({
  children,
  className,
  action,
  onData,
  variant = 'card',
  ...props
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (action) {
      action(formData);
    }

    if (onData) {
      const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
      const entries = Array.from(formData.entries());

      for (const [key, value] of entries) {
        if (key in data) {
          const existing = data[key];

          data[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
          const allValues = entries.filter(([k]) => k === key).map(([, v]) => v);

          data[key] = allValues.length > 1 ? allValues : value;
        }
      }

      onData(data);
    }
  };

  const classes = clsx(css.form, className, variant && css[variant]);

  return (
    <form className={classes} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
};

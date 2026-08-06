import React from 'react';
import css from './SimpleForm.module.scss';
import clsx from 'clsx';

export interface SimpleFormProps extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'action' | 'onSubmit'
> {
  action?: (formData: FormData) => void | Promise<void>;
  onData?: (data: Record<string, any>) => void;
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
 * `onData` is always invoked with Object.fromEntries(formData.entries()).
 *
 * Props:
 * @param {(formData: FormData) => void | Promise<void>} [action] - Optional async action executed on submit.
 * @param {(data: Record<string, any>) => void} [onData] - Callback receiving a plain object of form values.
 * @param {'simple'|'card'} [variant='card'] - Visual variant for form container.
 *
 * Example:
 * ```tsx
 * <SimpleForm onData={data => console.log(data)}>
 *   <SimpleInput name="email" />
 *   <Button type="submit" variant="primary">Send</Button>
 * </SimpleForm>
 * ```
 */
export const SimpleForm: React.FC<SimpleFormProps> = ({
  children,
  className,
  action,
  onData,
  variant = 'card',
  ...props
}) => {
  const handleAction = (formData: FormData) => {
    if (action) {
      action(formData);
    }

    if (onData) {
      const data = Object.fromEntries(formData.entries());
      onData(data);
    }
  };

  const classes = clsx(css.form, className, variant && css[variant]);

  return (
    <form className={classes} action={handleAction} {...props}>
      {children}
    </form>
  );
};

import React from 'react';
import css from './SimpleForm.module.scss';
import clsx from 'clsx';

import type { SimpleFormProps } from './SimpleForm.types';

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
function parseFormData(
  formData: FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const [key, value] of formData.entries()) {
    const existing = data[key];

    if (existing === undefined) {
      data[key] = value;
    } else if (Array.isArray(existing)) {
      data[key] = [...existing, value];
    } else {
      data[key] = [existing, value];
    }
  }

  return data;
}

export const SimpleForm: React.FC<Readonly<SimpleFormProps>> = ({
  children,
  className,
  action,
  onData,
  variant = 'card',
  ...props
}) => {
  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    if (action) {
      action(formData);
    }

    if (onData) {
      onData(parseFormData(formData));
    }
  };

  const classes = clsx(css.form, className, variant && css[variant]);

  return (
    <form className={classes} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
};

export default SimpleForm;

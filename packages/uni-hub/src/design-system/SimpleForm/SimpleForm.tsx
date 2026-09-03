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

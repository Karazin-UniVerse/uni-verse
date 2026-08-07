import clsx from 'clsx';
import React, { type InputHTMLAttributes, forwardRef } from 'react';
import css from './SimpleInput.module.scss';

export interface SimpleInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  isTransparent?: boolean;
}

const SimpleInput = forwardRef<HTMLInputElement, SimpleInputProps>(
  ({ variant = 'primary', size = 'medium', isTransparent = false, className, ...props }, ref) => {
    const classes = clsx(
      css.input,
      variant && css[variant],
      size && css[size],
      isTransparent && css['is-transparent'],
      className,
    );
    return <input {...props} ref={ref} className={classes} />;
  },
);

SimpleInput.displayName = 'SimpleInput';

export default SimpleInput;

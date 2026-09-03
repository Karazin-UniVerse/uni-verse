import clsx from 'clsx';
import { forwardRef } from 'react';
import type { TextInputProps } from './TextInput.types';
import css from './TextInput.module.scss';

/**
 * Simple React TextInput component.
 *
 * Behavior:
 * - Accepts props defined in TextInputProps.
 * - Forwards the ref to the native <input> (forwardRef).
 * - Automatically applies CSS classes based on variant, size, and isTransparent.
 *
 * Example:
 * ```tsx
 * <TextInput placeholder="Enter text" size="large" variant="primary" />
 * ```
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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

TextInput.displayName = 'TextInput';

export default TextInput;

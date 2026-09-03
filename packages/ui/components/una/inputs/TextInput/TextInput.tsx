import clsx from 'clsx';
import React, { type InputHTMLAttributes, forwardRef } from 'react';
import css from './TextInput.module.scss';

/**
 * Text input (a simple wrapper around HTMLInputElement).
 *
 * Describes the props supported by the TextInput component.
 *
 * @property {('primary' | 'secondary')} variant Visual variant. Defaults to 'primary'.
 * @property {('small' | 'medium' | 'large')} size Input size. Defaults to 'medium'.
 * @property {boolean} isTransparent If true, applies a transparent style (background/border). Defaults to false.
 *
 * All other standard input props (type, value, onChange, etc.) are preserved.
 * Note: the 'size' field is omitted from InputHTMLAttributes to avoid conflict with our prop.
 */
export interface SimpleInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  isTransparent?: boolean;
}

/**
 * Simple React TextInput component.
 *
 * Behavior:
 * - Accepts props defined in SimpleInputProps.
 * - Forwards the ref to the native <input> (forwardRef).
 * - Automatically applies CSS classes based on variant, size, and isTransparent.
 *
 * Example:
 * ```tsx
 * <TextInput placeholder="Enter text" size="large" variant="primary" />
 * ```
 *
 * @remarks All additional HTML attributes are proxied directly to the input.
 */
export const TextInput = forwardRef<HTMLInputElement, SimpleInputProps>(
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

export const SimpleInput = TextInput;
export default TextInput;

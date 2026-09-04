import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { ButtonProps } from './Button.types';
import css from './Button.module.scss';

/**
 * Button
 *
 * Accessible button component that supports both native <button> usage and
 * link-like behavior. It accepts the design system `variant` and `size`
 * tokens and forwards all native element attributes.
 *
 * Props:
 * @param {'primary'|'secondary'} variant - Visual variant determining color/style.
 * @param children
 * @param className
 * @param {'small'|'medium'|'large'} [size='small'] - Size token used for padding and font.
 * @param {boolean} [isLink=false] - Render as an anchor element instead of a button.
 * @param {boolean} [isTransparent=false] - Render a transparent style variant.
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> | React.AnchorHTMLAttributes<HTMLAnchorElement>} props - Native element attributes forwarded.
 *
 * Examples:
 * ```tsx
 * // Regular button
 * <Button variant="primary" size="medium" onClick={() => alert('clicked')}>Save</Button>
 *
 * // Link-style button
 * <Button isLink href="/docs" variant="secondary">Docs</Button>
 * ```
 */
export function Button({
  children,
  className,
  variant = 'primary',
  size = 'small',
  isLink = false,
  isTransparent = false,
  ...props
}: ButtonProps) {
  const classes = clsx(
    css.btn,
    variant && css[variant],
    size && css[size],
    className,
    isLink && css['is-link'],
    isTransparent && css['is-transparent'],
  );

  if (isLink) {
    const linkProps = props as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <a className={classes} {...linkProps}>
        {children}
      </a>
    );
  }

  const { type = 'button', ...buttonProps } = props as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

export default Button;

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { ButtonProps } from './Button.types';
import css from './SimpleButton.module.scss';

export type {
  BaseProps,
  ButtonAsButtonProps,
  ButtonAsLinkProps,
  ButtonProps,
} from './Button.types';

/**
 * Button
 *
 * Accessible button component that supports both native <button> usage and
 * link-like behavior. It accepts the design system `variant` and `size`
 * tokens and forwards all native element attributes.
 */
export function Button({
  children,
  variant,
  className,
  isLink = false,
  isTransparent = false,
  size = 'small',
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

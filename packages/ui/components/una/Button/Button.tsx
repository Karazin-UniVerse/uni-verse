import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import css from './SimpleButton.module.scss';
import clsx from 'clsx';
import React from 'react';

type BaseProps = {
  children: ReactNode;
  variant: 'primary' | 'secondary';
  size: 'small' | 'medium' | 'large';
  className?: string;
  isTransparent?: boolean;
};

export type ButtonAsButtonProps = BaseProps & {
  isLink?: false;
} & ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonAsLinkProps = BaseProps & { isLink: true } & AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;
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
 *
 * // Link-style button
 * <Button isLink href="/docs" variant="secondary">Docs</Button>
 * ```
 */
export function Button({
  variant,
  children,
  className,
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
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

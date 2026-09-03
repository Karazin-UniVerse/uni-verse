import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import css from './SimpleButton.module.scss';

type BaseProps = {
  children: ReactNode;
  variant: 'primary' | 'secondary';
  className?: string;
  isTransparent?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export type ButtonAsButtonProps = BaseProps & {
  isLink?: false;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export type ButtonAsLinkProps = BaseProps & {
  href: string;
  isLink: true;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export default function SimpleButton({
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

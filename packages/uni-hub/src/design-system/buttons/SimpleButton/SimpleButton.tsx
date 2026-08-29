import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import css from './SimpleButton.module.scss';
import clsx from 'clsx';

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

export default function SimpleButton({
  variant,
  size = 'small',
  children,
  className,
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

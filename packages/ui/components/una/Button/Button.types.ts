import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type BaseProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
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

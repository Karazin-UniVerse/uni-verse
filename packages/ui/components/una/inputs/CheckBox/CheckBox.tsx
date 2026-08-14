import clsx from 'clsx';
import React, { type InputHTMLAttributes } from 'react';
import css from './CheckBox.module.scss';
interface CheckBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  variant: 'primary' | 'secondary';
}
export function CheckBox({ variant, className, ...props }: CheckBoxProps) {
  const classes = clsx(css.checkBox, variant && css[variant], className);
  return <input {...props} type="checkbox" className={classes}></input>;
}

import clsx from 'clsx';
import React, { type InputHTMLAttributes } from 'react';
import css from './CheckBox.module.scss';
interface CheckBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  variant: 'primary' | 'secondary';
}
export default function CheckBox({ variant, ...props }: CheckBoxProps) {
  const classes = clsx(
    css.checkBox,
    variant && css[variant],
    props.className && css[props.className],
  );
  return <input {...props} type="checkbox" className={classes}></input>;
}

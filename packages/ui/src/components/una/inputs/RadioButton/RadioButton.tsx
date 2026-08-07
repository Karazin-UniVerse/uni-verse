import clsx from 'clsx';
import React, { type InputHTMLAttributes } from 'react';
import css from './RadioButton.module.scss';
interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  variant: 'primary' | 'secondary';
}
export default function RadioButton({ variant, className, ...props }: RadioButtonProps) {
  const classes = clsx(
    css.radioButton,
    variant && css[variant],
    className,
  );
  return <input {...props} type="radio" className={classes}></input>;
}

import clsx from 'clsx';
import React from 'react';
import css from './RadioButton.module.scss';
import type { RadioButtonProps } from './RadioButton.types';

export function RadioButton({ variant, className, ...props }: RadioButtonProps) {
  const classes = clsx(css.radioButton, variant && css[variant], className);
  return <input {...props} type="radio" className={classes}></input>;
}

export default RadioButton;

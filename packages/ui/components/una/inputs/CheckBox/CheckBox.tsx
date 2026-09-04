import clsx from 'clsx';
import React from 'react';
import css from './CheckBox.module.scss';
import type { CheckBoxProps } from './CheckBox.types';

export function CheckBox({ variant, className, ...props }: CheckBoxProps) {
  const classes = clsx(css.checkBox, variant && css[variant], className);

  return <input {...props} type="checkbox" className={classes}></input>;
}

export default CheckBox;

import React from 'react';
import clsx from 'clsx';
import type { SimpleSliderProps } from './SimpleSlider.types';
import styles from './SimpleSlider.module.scss';

export const SimpleSlider: React.FC<SimpleSliderProps> = ({
  value,
  onChange,
  className,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={clsx(styles.slider, className)}
    />
  );
};

export default SimpleSlider;

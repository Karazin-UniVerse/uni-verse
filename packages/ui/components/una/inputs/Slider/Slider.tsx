import React from 'react';
import clsx from 'clsx';
import type { SliderProps } from './Slider.types';
import styles from './Slider.module.scss';

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
  id,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}) => {
  return (
    <input
      type="range"
      id={id}
      aria-label={ariaLabel}
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

export default Slider;

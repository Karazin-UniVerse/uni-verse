import React from 'react';
import clsx from 'clsx';
import styles from './SimpleSlider.module.scss';

export type SimpleSliderProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
};

export const SimpleSlider: React.FC<SimpleSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
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

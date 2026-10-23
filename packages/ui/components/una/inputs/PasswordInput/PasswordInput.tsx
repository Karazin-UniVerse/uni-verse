import clsx from 'clsx';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextInput } from '../TextInput/TextInput';
import type { PasswordInputProps } from './PasswordInput.types';
import css from './PasswordInput.module.scss';

const ICON_SIZES: Record<NonNullable<PasswordInputProps['size']>, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      disabled,
      leftIcon,
      onTogglePassword,
      showPassword: controlledShowPassword,
      hidePasswordLabel = 'Hide password',
      showPasswordLabel = 'Show password',
      size = 'medium',
      ...props
    },
    ref,
  ) => {
    const [internalShow, setInternalShow] = useState(false);

    const isControlled = controlledShowPassword !== undefined;
    const show = isControlled ? controlledShowPassword : internalShow;

    const handleToggle = (): void => {
      const nextShow = !show;

      if (!isControlled) {
        setInternalShow(nextShow);
      }

      onTogglePassword?.(nextShow);
    };

    const toggleLabel = show ? hidePasswordLabel : showPasswordLabel;
    const iconSize = ICON_SIZES[size];

    return (
      <div className={clsx(css.wrapper, className)}>
        {leftIcon && <span className={css.leftIcon}>{leftIcon}</span>}
        <TextInput
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          size={size}
          disabled={disabled}
          className={clsx(css.input, leftIcon && css.hasLeftIcon, css.hasToggle)}
        />
        <button
          type="button"
          disabled={disabled}
          className={css.toggleBtn}
          onClick={handleToggle}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {show ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;

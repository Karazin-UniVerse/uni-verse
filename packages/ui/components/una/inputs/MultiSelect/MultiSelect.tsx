import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';
import React from 'react';
import { Dropdown } from '../../Dropdown';
import { Tag } from '../../Tag';
import { CheckBox } from '../CheckBox';
import type { MultiSelectProps } from './MultiSelect.types';
import styles from './MultiSelect.module.scss';

export function MultiSelect<T extends string>({
  groups,
  value,
  onChange,
  placeholder,
  removeLabel,
  id,
  className,
  disabled = false,
}: Readonly<MultiSelectProps<T>>): React.ReactElement {
  const selected = groups.flatMap(({ options, tone }) =>
    options.filter((option) => value.includes(option.value)).map((option) => ({ ...option, tone })),
  );

  const toggle = (optionValue: T): void => {
    const next = value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];

    onChange(
      groups.flatMap(({ options }) =>
        options.filter((option) => next.includes(option.value)).map((option) => option.value),
      ),
    );
  };

  return (
    <div className={clsx(styles.root, className)}>
      <Dropdown
        isFullWidth
        placement="bottom-start"
        width="100%"
        panelClassName={styles.panel}
        renderTrigger={(triggerProps) => (
          <button
            {...triggerProps}
            id={id}
            type="button"
            className={styles.trigger}
            disabled={disabled}
            aria-haspopup="true"
          >
            <span className={styles.placeholder}>{placeholder}</span>
            <ChevronDown size={16} aria-hidden />
          </button>
        )}
      >
        {groups.map((group) => (
          <fieldset key={group.label} className={styles.group}>
            <legend className={styles.legend}>{group.label}</legend>
            {group.options.map((option) => (
              <label key={option.value} className={styles.option}>
                <CheckBox
                  variant="primary"
                  checked={value.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                <Tag tone={group.tone} size="small">
                  {option.label}
                </Tag>
              </label>
            ))}
          </fieldset>
        ))}
      </Dropdown>

      {selected.length > 0 && (
        <div className={styles.chips}>
          {selected.map((option) => (
            <Tag key={option.value} tone={option.tone} size="small" className={styles.chip}>
              <span>{option.label}</span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => toggle(option.value)}
                aria-label={`${removeLabel} ${option.label}`}
                disabled={disabled}
              >
                <X size={12} aria-hidden />
              </button>
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;

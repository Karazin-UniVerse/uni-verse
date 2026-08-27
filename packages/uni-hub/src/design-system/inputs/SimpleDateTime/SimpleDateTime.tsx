import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import css from './SimpleDateTime.module.scss';
import SimpleInput, { type SimpleInputProps } from '../SimpleInput/SimpleInput';

export interface SimpleDateTimeProps extends Omit<SimpleInputProps, 'onChange' | 'value'> {
  selected: Date | null;
  onChange: (date: Date | null) => void;
}

export default function SimpleDateTime({
  selected,
  onChange,
  size = 'medium',
  ...props
}: SimpleDateTimeProps) {
  const CustomInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void }>(
    ({ value, onClick }, ref) => (
      <SimpleInput {...props} size={size} value={value} onClick={onClick} ref={ref} readOnly />
    ),
  );
  CustomInput.displayName = 'CustomInput';

  const dayClassName = (date: Date) => {
    if (selected && date.toDateString() === selected.toDateString()) {
      return css.selectedDay;
    }
    return css.day;
  };

  const calendarClass = css.calendar + (size !== 'medium' ? ` ${css[`calendar-${size}`]}` : '');

  return (
    <div className={css.datePickerWrapper}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        customInput={<CustomInput />}
        showTimeSelect
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="MMMM d, yyyy h:mm aa"
        popperClassName={css.popper}
        calendarClassName={calendarClass}
        dayClassName={dayClassName}
        popperPlacement="bottom-start"
      />
    </div>
  );
}

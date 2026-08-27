import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import css from './CustomDateTime.module.scss';
import SimpleInput, { type SimpleInputProps } from '../SimpleInput/SimpleInput';

export interface CustomDateTimeProps extends Omit<SimpleInputProps, 'onChange' | 'value'> {
  selected: Date | null;
  onChange: (date: Date | null) => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDateTime({
  selected,
  onChange,
  size = 'medium',
  ...props
}: CustomDateTimeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (selected) {
      setViewDate(selected);
    }
  }, [selected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && timeListRef.current && selected) {
      setTimeout(() => {
        const selectedEl = timeListRef.current?.querySelector(`.${css.selected}`);
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: 'center' });
        }
      }, 0);
    }
  };

  // Calendar logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; isCurrentMonth: boolean; monthOffset: number }[] = [];
  // Prev month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, monthOffset: -1 });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
  }
  // Next month days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
  }

  const handleDayClick = (dayInfo: (typeof days)[0]) => {
    const newDate = new Date(year, month + dayInfo.monthOffset, dayInfo.day);
    if (selected) {
      newDate.setHours(selected.getHours());
      newDate.setMinutes(selected.getMinutes());
    } else {
      newDate.setHours(0, 0, 0, 0);
    }
    onChange(newDate);
    setViewDate(newDate);
  };

  const handleTimeClick = (hours: number, minutes: number) => {
    const newDate = selected ? new Date(selected) : new Date(viewDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    onChange(newDate);
  };

  // Time options (every 15 mins)
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeOptions.push({ hours: h, minutes: m });
    }
  }

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (d: Date | null) => {
    if (!d) return '';
    const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${dateStr} ${h}:${m} ${ampm}`;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  return (
    <div className={css.wrapper} ref={containerRef}>
      <SimpleInput
        {...props}
        size={size}
        value={formatDateTime(selected)}
        onClick={handleInputClick}
        readOnly
      />

      {isOpen && (
        <div className={clsx(css.popper, css[`size-${size}`])}>
          <div className={css.calendar}>
            <div className={css.header}>
              <button
                type="button"
                className={css.navButton}
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
              >
                &lt;
              </button>
              <div className={css.selects}>
                <select
                  className={css.select}
                  value={month}
                  onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className={css.select}
                  value={year}
                  onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={css.navButton}
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
              >
                &gt;
              </button>
            </div>

            <div className={css.dayNames}>
              {WEEKDAYS.map((d) => (
                <div key={d} className={css.dayName}>
                  {d}
                </div>
              ))}
            </div>

            <div className={css.daysGrid}>
              {days.map((d, i) => {
                const isSelected =
                  selected &&
                  selected.getDate() === d.day &&
                  selected.getMonth() === (month + d.monthOffset + 12) % 12 &&
                  selected.getFullYear() === year + Math.floor((month + d.monthOffset) / 12);

                return (
                  <button
                    key={i}
                    type="button"
                    className={clsx(
                      css.day,
                      !d.isCurrentMonth && css.outside,
                      isSelected && css.selected,
                    )}
                    onClick={() => handleDayClick(d)}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={css.timeContainer}>
            <div className={css.timeHeader}>Time</div>
            <ul className={css.timeList} ref={timeListRef}>
              {timeOptions.map((t) => {
                const isSelected =
                  selected &&
                  selected.getHours() === t.hours &&
                  selected.getMinutes() === t.minutes;
                return (
                  <li
                    key={`${t.hours}-${t.minutes}`}
                    className={clsx(css.timeItem, isSelected && css.selected)}
                    onClick={() => handleTimeClick(t.hours, t.minutes)}
                  >
                    {formatTime(t.hours, t.minutes)}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

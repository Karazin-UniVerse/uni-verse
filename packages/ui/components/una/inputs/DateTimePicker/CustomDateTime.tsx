import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import css from './CustomDateTime.module.scss';
import { TextInput } from '../TextInput/TextInput';
import type { CustomDateTimeProps } from './DateTimePicker.types';

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

export function CustomDateTime({
  selected,
  onChange,
  size = 'medium',
  ...props
}: Readonly<CustomDateTimeProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [prevSelected, setPrevSelected] = useState(selected);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLDivElement>(null);

  if (selected !== prevSelected) {
    setPrevSelected(selected);

    if (selected) {
      setViewDate(selected);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && selected && timeListRef.current) {
      const selectedEl = timeListRef.current.querySelector(`.${css.selected}`);

      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen, selected]);

  const handleInputClick = () => {
    setIsOpen(!isOpen);
  };

  // Calendar logic
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; isCurrentMonth: boolean; monthOffset: number }[] = [];

  // Prev month days
  for (let offset = firstDay - 1; offset >= 0; offset--) {
    days.push({ day: daysInPrevMonth - offset, isCurrentMonth: false, monthOffset: -1 });
  }

  // Current month days
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    days.push({ day: dayNumber, isCurrentMonth: true, monthOffset: 0 });
  }

  // Next month days
  const remaining = 42 - days.length;

  for (let dayNumber = 1; dayNumber <= remaining; dayNumber++) {
    days.push({ day: dayNumber, isCurrentMonth: false, monthOffset: 1 });
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

  for (let hours = 0; hours < 24; hours++) {
    for (let minutes = 0; minutes < 60; minutes += 15) {
      timeOptions.push({ hours, minutes });
    }
  }

  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';

    const dateStr = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    const rawHours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    const displayHours = rawHours % 12 || 12;

    return `${dateStr} ${displayHours}:${minutes} ${ampm}`;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={css.wrapper} ref={containerRef}>
      <TextInput
        {...props}
        size={size}
        value={formatDateTime(selected)}
        readOnly
        onClick={handleInputClick}
        onKeyDown={handleKeyDown}
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
                  onChange={(event) => setViewDate(new Date(year, Number(event.target.value), 1))}
                >
                  {MONTHS.map((monthName, monthIndex) => (
                    <option key={monthName} value={monthIndex}>
                      {monthName}
                    </option>
                  ))}
                </select>
                <select
                  className={css.select}
                  value={year}
                  onChange={(event) => setViewDate(new Date(Number(event.target.value), month, 1))}
                >
                  {years.map((yearOption) => (
                    <option key={yearOption} value={yearOption}>
                      {yearOption}
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
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className={css.dayName}>
                  {weekday}
                </div>
              ))}
            </div>

            <div className={css.daysGrid}>
              {days.map((dayInfo) => {
                const isSelected =
                  selected?.getDate() === dayInfo.day &&
                  selected.getMonth() === (month + dayInfo.monthOffset + 12) % 12 &&
                  selected.getFullYear() === year + Math.floor((month + dayInfo.monthOffset) / 12);

                return (
                  <button
                    key={`${dayInfo.monthOffset}-${dayInfo.day}`}
                    type="button"
                    className={clsx(
                      css.day,
                      !dayInfo.isCurrentMonth && css.outside,
                      isSelected && css.selected,
                    )}
                    onClick={() => handleDayClick(dayInfo)}
                  >
                    {dayInfo.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={css.timeContainer}>
            <div className={css.timeHeader}>Time</div>
            <div className={css.timeList} ref={timeListRef}>
              {timeOptions.map((timeOption) => {
                const isSelected =
                  selected?.getHours() === timeOption.hours &&
                  selected.getMinutes() === timeOption.minutes;

                return (
                  <button
                    key={`${timeOption.hours}-${timeOption.minutes}`}
                    type="button"
                    className={clsx(css.timeItem, isSelected && css.selected)}
                    onClick={() => handleTimeClick(timeOption.hours, timeOption.minutes)}
                  >
                    {formatTime(timeOption.hours, timeOption.minutes)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

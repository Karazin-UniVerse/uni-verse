import React, { useCallback, useMemo, useState } from 'react';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { addDays, DUMMY_EVENTS, exportToICS, isSameDay, startOfWeek } from './helpers';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleMonthView } from './ScheduleMonthView';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ScheduleWeekView } from './ScheduleWeekView';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent, ScheduleViewMode } from './ScheduleView.types';

export type { ScheduleEvent };

export const ScheduleView: React.FC = () => {
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);
  const { localeTag, formatMessage } = useLanguage();
  const locale = localeTag;

  const [selectedViewMode, setSelectedViewMode] = useState<ScheduleViewMode | null>(null);
  const viewMode = selectedViewMode ?? (isMobile ? 'day' : 'month');

  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = new Date();

    initialDate.setHours(0, 0, 0, 0);

    return initialDate;
  });

  const getTypeName = useCallback(
    (type: string) => {
      switch (type) {
        case 'lecture':
          return formatMessage('schedule.typeLecture');
        case 'lab':
          return formatMessage('schedule.typeLab');
        case 'practice':
          return formatMessage('schedule.typePractice');
        case 'exam':
          return formatMessage('schedule.typeExam');
        default:
          return formatMessage('schedule.typeOther');
      }
    },
    [formatMessage],
  );

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1);

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(monday, index);
      const raw = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);

      return raw.charAt(0).toUpperCase() + raw.slice(1);
    });
  }, [locale]);

  const getEventsForDate = useCallback(
    (date: Date) =>
      DUMMY_EVENTS.filter((event) => isSameDay(event.start, date)).sort(
        (firstEvent, secondEvent) => firstEvent.start.getTime() - secondEvent.start.getTime(),
      ),
    [],
  );

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);

    return Array.from({ length: 42 }, (_, dayIndex) => addDays(start, dayIndex));
  }, [selectedDate]);

  const handleSelectDayMode = useCallback(() => {
    setSelectedViewMode('day');
  }, []);

  const handleExportICS = useCallback(() => {
    exportToICS(DUMMY_EVENTS);
  }, []);

  return (
    <div className={styles.root}>
      <ScheduleToolbar
        viewMode={viewMode}
        onViewModeChange={setSelectedViewMode}
        onExportICS={handleExportICS}
      />

      <div className={styles.body}>
        {viewMode === 'month' && (
          <ScheduleMonthView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectDayMode={handleSelectDayMode}
            getEventsForDate={getEventsForDate}
            locale={locale}
            weekdays={weekdays}
            monthDays={monthDays}
          />
        )}
        {viewMode === 'week' && (
          <ScheduleWeekView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            getEventsForDate={getEventsForDate}
            locale={locale}
            getTypeName={getTypeName}
          />
        )}
        {viewMode === 'day' && (
          <ScheduleDayView
            selectedDate={selectedDate}
            events={getEventsForDate(selectedDate)}
            locale={locale}
            getTypeName={getTypeName}
          />
        )}
      </div>
    </div>
  );
};

export default ScheduleView;

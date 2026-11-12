import React, { useCallback, useMemo, useState } from 'react';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { Button, Modal, TextInput, useToast } from '@una';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  addDays,
  DUMMY_EVENTS,
  exportToICS,
  isSafeMeetingUrl,
  isSameDay,
  startOfWeek,
} from './helpers';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleMonthView } from './ScheduleMonthView';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ScheduleWeekView } from './ScheduleWeekView';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent, ScheduleViewMode, ScheduleViewProps } from './ScheduleView.types';

export type { ScheduleEvent };

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  events: propEvents,
  isTeacher: propIsTeacher,
}) => {
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);
  const { localeTag, formatMessage } = useLanguage();
  const locale = localeTag;
  const { roles } = useCurrentUser();
  const toast = useToast();

  const isTeacher =
    propIsTeacher ??
    (roles.includes('TEACHER') ||
      roles.includes('INSTRUCTOR') ||
      roles.includes('ADMIN') ||
      roles.includes('DEAN'));

  const [events, setEvents] = useState<ScheduleEvent[]>(() => propEvents ?? DUMMY_EVENTS);
  const [selectedViewMode, setSelectedViewMode] = useState<ScheduleViewMode | null>(null);
  const viewMode = selectedViewMode ?? (isMobile ? 'day' : 'month');

  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = new Date();

    initialDate.setHours(0, 0, 0, 0);

    return initialDate;
  });

  // Subscription modal state
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // Edit meeting URL modal state
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [meetingUrlInput, setMeetingUrlInput] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [meetingUrlError, setMeetingUrlError] = useState<string | null>(null);

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
      events
        .filter((event) => isSameDay(event.start, date))
        .sort(
          (firstEvent, secondEvent) => firstEvent.start.getTime() - secondEvent.start.getTime(),
        ),
    [events],
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
    exportToICS(events);
  }, [events]);

  const handleOpenSubscribe = useCallback(async () => {
    setIsSubscribeOpen(true);
    setIsCopied(false);
    setSubscribeError(null);
    setFeedUrl('');

    try {
      const response = await timetableApi.createSubscriptionToken();

      if (response.data?.token) {
        setFeedUrl(timetableApi.getIcsFeedUrl(response.data.token));
      }
    } catch {
      const errorMsg = formatMessage('schedule.subscribeError');

      setSubscribeError(errorMsg);
      toast.error(errorMsg);
    }
  }, [formatMessage, toast]);

  const handleCopyFeedUrl = useCallback(async () => {
    if (feedUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(feedUrl);
      setIsCopied(true);
    }
  }, [feedUrl]);

  const handleEditMeetingUrl = useCallback((event: ScheduleEvent) => {
    setEditingEvent(event);
    setMeetingUrlInput(event.meetingUrl ?? '');
    setMeetingUrlError(null);
  }, []);

  const handleSaveMeetingUrl = useCallback(async () => {
    if (!editingEvent) {
      return;
    }

    const trimmedUrl = meetingUrlInput.trim();

    if (trimmedUrl !== '' && !isSafeMeetingUrl(trimmedUrl)) {
      const errorMsg = formatMessage('schedule.invalidMeetingUrl');

      setMeetingUrlError(errorMsg);
      toast.error(errorMsg);

      return;
    }

    setIsSavingUrl(true);
    setMeetingUrlError(null);

    const targetId = editingEvent.teachingAssignmentId ?? editingEvent.id;

    try {
      await timetableApi.updateMeetingUrl(targetId, trimmedUrl);
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, meetingUrl: trimmedUrl } : e)),
      );
      toast.success(formatMessage('schedule.meetingUrlSaved'));
      setEditingEvent(null);
    } catch {
      const errorMsg = formatMessage('schedule.updateMeetingUrlError');

      setMeetingUrlError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSavingUrl(false);
    }
  }, [editingEvent, formatMessage, meetingUrlInput, toast]);

  return (
    <div className={styles.root}>
      <ScheduleToolbar
        viewMode={viewMode}
        onViewModeChange={setSelectedViewMode}
        onExportICS={handleExportICS}
        onSubscribeCalendar={handleOpenSubscribe}
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
            isTeacher={isTeacher}
            onEditMeetingUrl={handleEditMeetingUrl}
          />
        )}
        {viewMode === 'day' && (
          <ScheduleDayView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={getEventsForDate(selectedDate)}
            locale={locale}
            getTypeName={getTypeName}
            isTeacher={isTeacher}
            onEditMeetingUrl={handleEditMeetingUrl}
          />
        )}
      </div>

      {/* Calendar Subscription Modal */}
      <Modal
        open={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        title={formatMessage('schedule.subscribeTitle')}
        closeLabel={formatMessage('common.close') || formatMessage('schedule.close')}
      >
        <div className={styles.modalBody}>
          <p>{formatMessage('schedule.subscribeDescription')}</p>
          {subscribeError ? (
            <p className={styles.errorText} role="alert">
              {subscribeError}
            </p>
          ) : (
            <div className={styles.feedUrlRow}>
              <TextInput
                readOnly
                value={feedUrl}
                aria-label={formatMessage('schedule.subscribeTitle')}
              />
              <Button
                type="button"
                variant="primary"
                onClick={handleCopyFeedUrl}
                disabled={!feedUrl}
              >
                {isCopied
                  ? formatMessage('schedule.feedUrlCopied')
                  : formatMessage('schedule.copyFeedUrl')}
              </Button>
            </div>
          )}
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => setIsSubscribeOpen(false)}>
              {formatMessage('schedule.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Meeting URL Modal */}
      <Modal
        open={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        title={`${formatMessage('schedule.meetingUrlTitle')}: ${editingEvent?.title ?? ''}`}
        closeLabel={formatMessage('common.close') || formatMessage('schedule.close')}
      >
        <div className={styles.modalBody}>
          {meetingUrlError && (
            <p className={styles.errorText} role="alert">
              {meetingUrlError}
            </p>
          )}
          <label htmlFor="meeting-url-input">{formatMessage('schedule.meetingUrlLabel')}</label>
          <TextInput
            id="meeting-url-input"
            type="url"
            value={meetingUrlInput}
            onChange={(e) => setMeetingUrlInput(e.target.value)}
            placeholder={formatMessage('schedule.meetingUrlPlaceholder')}
          />
          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingEvent(null)}
              disabled={isSavingUrl}
            >
              {formatMessage('schedule.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveMeetingUrl}
              disabled={isSavingUrl}
            >
              {formatMessage('schedule.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduleView;

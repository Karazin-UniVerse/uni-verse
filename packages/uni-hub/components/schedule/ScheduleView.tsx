import React, { useCallback, useMemo, useState } from 'react';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { PAIR_SCHEDULE, type PairNumber } from '@core/constants/timetable';
import { Button, Modal, Select, TextInput, useToast } from '@una';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useMySchedule } from '@uni-hub/hooks/useMySchedule';
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
  const isAdmin = roles.includes('ADMIN');
  const [rescheduledEvents, setRescheduledEvents] = useState<Map<string, ScheduleEvent>>(
    () => new Map(),
  );
  const [reschedulingEvent, setReschedulingEvent] = useState<ScheduleEvent | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newPair, setNewPair] = useState('1');
  const [reason, setReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const isTeacher =
    propIsTeacher ??
    (roles.includes('TEACHER') ||
      roles.includes('INSTRUCTOR') ||
      roles.includes('ADMIN') ||
      roles.includes('DEAN'));

  const { events: fetchedEvents } = useMySchedule();
  const [meetingUrlOverrides, setMeetingUrlOverrides] = useState<Map<string, string>>(
    () => new Map(),
  );

  const events = useMemo(() => {
    let base = propEvents;

    if (!base) {
      base = fetchedEvents.length > 0 ? fetchedEvents : DUMMY_EVENTS;
    }

    return base.map((event) => {
      const updated = rescheduledEvents.get(event.id) ?? event;

      return meetingUrlOverrides.has(event.id)
        ? { ...updated, meetingUrl: meetingUrlOverrides.get(event.id) }
        : updated;
    });
  }, [fetchedEvents, meetingUrlOverrides, propEvents, rescheduledEvents]);
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
          return formatMessage('schedule.typeLectureShort');
        case 'lab':
          return formatMessage('schedule.typeLabShort');
        case 'practice':
          return formatMessage('schedule.typePracticeShort');
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
    const nextUrl = trimmedUrl === '' ? undefined : trimmedUrl;

    try {
      await timetableApi.updateMeetingUrl(targetId, nextUrl);
      setMeetingUrlOverrides((prev) => new Map(prev).set(editingEvent.id, nextUrl ?? ''));
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

  const handleReschedule = async (): Promise<void> => {
    if (!reschedulingEvent || !isAdmin) {
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const response = await timetableApi.rescheduleEvent(reschedulingEvent.id, {
        newDate,
        newPair: Number(newPair),
        reason: reason.trim() || undefined,
      });
      const date = response.data.date.split('T')[0];
      const bell = PAIR_SCHEDULE[response.data.pair as PairNumber];
      const start = new Date(`${date}T${bell.start}:00`);
      const end = new Date(`${date}T${bell.end}:00`);

      setRescheduledEvents((previous) =>
        new Map(previous).set(reschedulingEvent.id, { ...reschedulingEvent, start, end }),
      );
      setSelectedDate(start);
      toast.success(formatMessage('schedule.rescheduleSuccess'));
      setReschedulingEvent(null);
    } catch (failure) {
      setRescheduleError(
        failure instanceof Error ? failure.message : formatMessage('schedule.rescheduleError'),
      );
    } finally {
      setIsRescheduling(false);
    }
  };

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
          {isAdmin && editingEvent && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSavingUrl}
              onClick={() => {
                setReschedulingEvent(editingEvent);
                const date = editingEvent.start;

                setNewDate(
                  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                );
                setNewPair(
                  Object.entries(PAIR_SCHEDULE).find(
                    ([, bell]) =>
                      bell.start ===
                      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
                  )?.[0] ?? '1',
                );
                setReason('');
                setRescheduleError(null);
                setEditingEvent(null);
              }}
            >
              {formatMessage('schedule.rescheduleEvent')}
            </Button>
          )}
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
      <Modal
        open={Boolean(reschedulingEvent)}
        onClose={() => {
          if (!isRescheduling) setReschedulingEvent(null);
        }}
        title={formatMessage('schedule.rescheduleEvent')}
        closeLabel={formatMessage('common.close')}
      >
        <form
          className={styles.modalBody}
          onSubmit={(event) => {
            event.preventDefault();
            void handleReschedule();
          }}
        >
          <p>{reschedulingEvent?.title}</p>
          {rescheduleError && (
            <p className={styles.errorText} role="alert">
              {rescheduleError}
            </p>
          )}
          <TextInput
            type="date"
            required
            aria-label={formatMessage('schedule.newDate')}
            value={newDate}
            disabled={isRescheduling}
            onChange={(event) => setNewDate(event.target.value)}
          />
          <Select
            aria-label={formatMessage('timetable.targetPair')}
            value={newPair}
            disabled={isRescheduling}
            onChange={setNewPair}
            options={Object.keys(PAIR_SCHEDULE).map((pair) => ({ value: pair, label: pair }))}
          />
          <TextInput
            aria-label={formatMessage('schedule.rescheduleReason')}
            value={reason}
            disabled={isRescheduling}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button type="submit" disabled={isRescheduling || !newDate}>
            {formatMessage('schedule.save')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default ScheduleView;

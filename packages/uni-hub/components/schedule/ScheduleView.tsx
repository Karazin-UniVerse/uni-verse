import React, { useCallback, useId, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { RESPONSE_CODES } from '@core/constants/response-codes';
import {
  MAX_RESCHEDULE_REASON_LENGTH,
  PAIR_SCHEDULE,
  RESCHEDULE_SCOPE,
  type RescheduleScope,
  type PairNumber,
} from '@core/constants/timetable';
import { Button, Modal, Select, TextInput, useToast } from '@una';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useMySchedule } from '@uni-hub/hooks/useMySchedule';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { addDays, exportToICS, getMonthGridDays, isSafeMeetingUrl, isSameDay } from './helpers';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleLegend } from './ScheduleLegend';
import { ScheduleMonthView } from './ScheduleMonthView';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ScheduleWeekView } from './ScheduleWeekView';
import { TeacherSlotPreferences } from '../timetable/TeacherSlotPreferences';
import { RescheduleRequests } from '../timetable/RescheduleRequests';
import type { ReschedulePreviewResponse } from '@core/types/timetable';
import styles from './ScheduleView.module.scss';

import type { ScheduleEvent, ScheduleViewMode, ScheduleViewProps } from './ScheduleView.types';

export type { ScheduleEvent };

const CONFLICT_STATUS_MARKER = `(HTTP ${RESPONSE_CODES.CONFLICT})`;
const INVALID_PROPOSAL_PATTERN =
  /Invalid rescheduling proposal|STARTED_EVENT|OUTSIDE_CALENDAR|INVALID_TARGET|NO_CHANGE/;

function getRescheduleErrorKey(
  failure: unknown,
): 'schedule.rescheduleConflict' | 'schedule.rescheduleInvalid' | 'schedule.rescheduleError' {
  const message = failure instanceof Error ? failure.message : '';

  if (message.includes(CONFLICT_STATUS_MARKER)) {
    return 'schedule.rescheduleConflict';
  }

  if (INVALID_PROPOSAL_PATTERN.test(message)) {
    return 'schedule.rescheduleInvalid';
  }

  return 'schedule.rescheduleError';
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  events: propEvents,
  isTeacher: propIsTeacher,
}) => {
  const isMobile = useMediaQuery('less', BREAKPOINTS.md);
  const rescheduleFormId = useId();
  const { localeTag, formatMessage } = useLanguage();
  const locale = localeTag;
  const { roles } = useCurrentUser();
  const toast = useToast();
  const isAdmin = roles.includes('ADMIN');
  const queryClient = useQueryClient();
  const rescheduleMutation = useMutation({
    mutationFn: async (proposal: Parameters<typeof timetableApi.previewReschedule>[0]) =>
      isAdmin
        ? timetableApi.rescheduleEvent(proposal.eventId, {
            newDate: proposal.newDate,
            newPair: proposal.newPair,
            scope: proposal.scope,
            reason: proposal.reason,
          })
        : timetableApi.createRescheduleRequest(proposal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  });
  const [reschedulingEvent, setReschedulingEvent] = useState<ScheduleEvent | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newPair, setNewPair] = useState('1');
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<RescheduleScope>(RESCHEDULE_SCOPE.ONCE);
  const [preview, setPreview] = useState<ReschedulePreviewResponse | null>(null);
  const [previewSignature, setPreviewSignature] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const isTeacher =
    propIsTeacher ??
    (roles.includes('TEACHER') ||
      roles.includes('INSTRUCTOR') ||
      roles.includes('ADMIN') ||
      roles.includes('DEAN'));
  const isInstructor = roles.includes('INSTRUCTOR') || roles.includes('TEACHER');

  const {
    events: fetchedEvents,
    isError: scheduleFailed,
    isLoading: scheduleLoading,
  } = useMySchedule();
  const [meetingUrlOverrides, setMeetingUrlOverrides] = useState<Map<string, string>>(
    () => new Map(),
  );

  const events = useMemo(() => {
    let base = propEvents;

    if (!base) {
      base = fetchedEvents;
    }

    return base.map((event) =>
      meetingUrlOverrides.has(event.id)
        ? { ...event, meetingUrl: meetingUrlOverrides.get(event.id) }
        : event,
    );
  }, [fetchedEvents, meetingUrlOverrides, propEvents]);
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
        case 'seminar':
          return formatMessage('schedule.typeSeminarShort');
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

    return Array.from({ length: 6 }, (_, index) => {
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

  const monthDays = useMemo(() => getMonthGridDays(selectedDate), [selectedDate]);

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

  const eventActions = {
    getTypeName,
    isTeacher,
    onEditMeetingUrl: handleEditMeetingUrl,
  };

  const handleReschedule = async (): Promise<void> => {
    if (!reschedulingEvent || (!isAdmin && !isInstructor)) {
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const proposal = {
        eventId: reschedulingEvent.id,
        newDate,
        newPair: Number(newPair),
        reason: reason.trim(),
        scope,
      };
      const signature = JSON.stringify(proposal);

      if (previewSignature !== signature) {
        const response = await timetableApi.previewReschedule(proposal);

        setPreview(response.data);
        setPreviewSignature(signature);

        return;
      }

      if (!isAdmin) {
        await rescheduleMutation.mutateAsync(proposal);
        toast.success(formatMessage('schedule.requestSubmitted'));
        setReschedulingEvent(null);

        return;
      }

      const response = await rescheduleMutation.mutateAsync(proposal);
      const moved = response.data.changes.find((change) => change.eventId === reschedulingEvent.id);

      if (moved) {
        const bell = PAIR_SCHEDULE[moved.newPair as PairNumber];

        setSelectedDate(new Date(`${moved.newDate}T${bell.start}:00`));
      }

      toast.success(formatMessage('schedule.rescheduleSuccess'));
      setReschedulingEvent(null);
    } catch (failure) {
      setRescheduleError(formatMessage(getRescheduleErrorKey(failure)));
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className={styles.root}>
      {!propEvents && scheduleFailed && <p role="alert">{formatMessage('schedule.loadError')}</p>}
      {!propEvents && scheduleLoading && <p role="status">{formatMessage('schedule.loading')}</p>}
      {(isAdmin || isInstructor) && <RescheduleRequests isAdmin={isAdmin} />}
      {isInstructor && <TeacherSlotPreferences />}

      <ScheduleToolbar
        viewMode={viewMode}
        onViewModeChange={setSelectedViewMode}
        onExportICS={handleExportICS}
        onSubscribeCalendar={handleOpenSubscribe}
      />

      <ScheduleLegend getTypeName={getTypeName} />

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
            isCompact={isMobile}
            {...eventActions}
          />
        )}
        {viewMode === 'week' && (
          <ScheduleWeekView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            getEventsForDate={getEventsForDate}
            locale={locale}
            isCompact={isMobile}
            {...eventActions}
          />
        )}
        {viewMode === 'day' && (
          <ScheduleDayView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            getEventsForDate={getEventsForDate}
            locale={locale}
            weekdays={weekdays}
            isCompact={isMobile}
            {...eventActions}
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
            {(isAdmin || isInstructor) && editingEvent && (
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
                  setScope(RESCHEDULE_SCOPE.ONCE);
                  setPreview(null);
                  setPreviewSignature('');
                  setRescheduleError(null);
                  setEditingEvent(null);
                }}
              >
                {formatMessage('schedule.rescheduleEvent')}
              </Button>
            )}
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
          <label htmlFor={`${rescheduleFormId}-date`}>{formatMessage('schedule.newDate')}</label>
          <TextInput
            id={`${rescheduleFormId}-date`}
            type="date"
            required
            value={newDate}
            disabled={isRescheduling}
            onChange={(event) => setNewDate(event.target.value)}
          />
          <label htmlFor={`${rescheduleFormId}-pair`}>
            {formatMessage('timetable.targetPair')}
          </label>
          <Select
            id={`${rescheduleFormId}-pair`}
            value={newPair}
            disabled={isRescheduling}
            onChange={setNewPair}
            options={Object.keys(PAIR_SCHEDULE).map((pair) => ({ value: pair, label: pair }))}
          />
          <label htmlFor={`${rescheduleFormId}-reason`}>
            {formatMessage('schedule.rescheduleReason')}
          </label>
          <TextInput
            id={`${rescheduleFormId}-reason`}
            required
            maxLength={MAX_RESCHEDULE_REASON_LENGTH}
            value={reason}
            disabled={isRescheduling}
            onChange={(event) => setReason(event.target.value)}
          />
          <label htmlFor={`${rescheduleFormId}-scope`}>
            {formatMessage('schedule.rescheduleScope')}
          </label>
          <Select
            id={`${rescheduleFormId}-scope`}
            value={scope}
            onChange={(value) => setScope(value as RescheduleScope)}
            disabled={isRescheduling}
            options={[
              { value: RESCHEDULE_SCOPE.ONCE, label: formatMessage('schedule.scopeOnce') },
              { value: RESCHEDULE_SCOPE.SERIES, label: formatMessage('schedule.scopeSeries') },
            ]}
          />
          <Button type="submit" disabled={isRescheduling || !newDate || !reason.trim()}>
            {formatMessage('schedule.save')}
          </Button>
          {preview && (
            <ul>
              {preview.changes.map((change) => (
                <li key={change.eventId}>
                  {formatMessage('schedule.occurrenceChange', {
                    oldDate: change.oldDate,
                    oldPair: change.oldPair,
                    newDate: change.newDate,
                    newPair: change.newPair,
                  })}
                </li>
              ))}
            </ul>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default ScheduleView;

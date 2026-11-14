import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { RESPONSE_CODES } from '@core/constants/response-codes';
import { hasHttpStatus } from '@uni-hub/utils/httpErrors';
import {
  PAIR_SCHEDULE,
  RESCHEDULE_SCOPE,
  type RescheduleScope,
  type PairNumber,
} from '@core/constants/timetable';
import { useToast } from '@una';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useMySchedule } from '@uni-hub/hooks/useMySchedule';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { addDays, exportToICS, getMonthGridDays, isSafeMeetingUrl, isSameDay } from './helpers';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleLegend } from './ScheduleLegend';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { ScheduleRescheduleDialog } from './ScheduleRescheduleDialog';
import { ScheduleSubscribeDialog } from './ScheduleSubscribeDialog';
import { ScheduleMonthView } from './ScheduleMonthView';
import { ScheduleToolbar } from './ScheduleToolbar';
import { ScheduleWeekView } from './ScheduleWeekView';
import { TeacherSlotPreferences } from '../timetable/TeacherSlotPreferences';
import { RescheduleRequests } from '../timetable/RescheduleRequests';
import type { ReschedulePreviewResponse } from '@core/types/timetable';
import styles from './ScheduleView.module.scss';

import type {
  RescheduleFormValues,
  ScheduleEvent,
  ScheduleViewMode,
  ScheduleViewProps,
} from './ScheduleView.types';

export type { ScheduleEvent };

const INVALID_PROPOSAL_PATTERN =
  /Invalid rescheduling proposal|STARTED_EVENT|OUTSIDE_CALENDAR|INVALID_TARGET|NO_CHANGE/;

function getRescheduleErrorKey(
  failure: unknown,
): 'schedule.rescheduleConflict' | 'schedule.rescheduleInvalid' | 'schedule.rescheduleError' {
  const message = failure instanceof Error ? failure.message : '';

  if (hasHttpStatus(failure, RESPONSE_CODES.CONFLICT)) {
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

  const rescheduleSignature = reschedulingEvent
    ? JSON.stringify({
        eventId: reschedulingEvent.id,
        newDate,
        newPair: Number(newPair),
        reason: reason.trim(),
        scope,
      })
    : '';

  const handleStartReschedule = (event: ScheduleEvent): void => {
    const pad = (value: number): string => String(value).padStart(2, '0');
    const start = `${pad(event.start.getHours())}:${pad(event.start.getMinutes())}`;

    setReschedulingEvent(event);
    setNewDate(
      `${event.start.getFullYear()}-${pad(event.start.getMonth() + 1)}-${pad(event.start.getDate())}`,
    );
    setNewPair(Object.entries(PAIR_SCHEDULE).find(([, bell]) => bell.start === start)?.[0] ?? '1');
    setReason('');
    setScope(RESCHEDULE_SCOPE.ONCE);
    setPreview(null);
    setPreviewSignature('');
    setRescheduleError(null);
    setEditingEvent(null);
  };

  const handleRescheduleChange = (patch: Partial<RescheduleFormValues>): void => {
    setNewDate((value) => patch.newDate ?? value);
    setNewPair((value) => patch.newPair ?? value);
    setReason((value) => patch.reason ?? value);
    setScope((value) => patch.scope ?? value);
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

      <ScheduleSubscribeDialog
        open={isSubscribeOpen}
        feedUrl={feedUrl}
        isCopied={isCopied}
        error={subscribeError}
        onCopy={() => void handleCopyFeedUrl()}
        onClose={() => setIsSubscribeOpen(false)}
      />
      <ScheduleMeetingDialog
        event={editingEvent}
        url={meetingUrlInput}
        error={meetingUrlError}
        isSaving={isSavingUrl}
        locale={locale}
        onUrlChange={setMeetingUrlInput}
        onSave={() => void handleSaveMeetingUrl()}
        onClose={() => setEditingEvent(null)}
        onReschedule={isAdmin || isInstructor ? handleStartReschedule : undefined}
      />
      <ScheduleRescheduleDialog
        event={reschedulingEvent}
        values={{ newDate, newPair, reason, scope }}
        preview={preview}
        isPreviewCurrent={Boolean(preview) && previewSignature === rescheduleSignature}
        isSaving={isRescheduling}
        error={rescheduleError}
        locale={locale}
        onChange={handleRescheduleChange}
        onSubmit={() => void handleReschedule()}
        onClose={() => setReschedulingEvent(null)}
      />
    </div>
  );
};

export default ScheduleView;

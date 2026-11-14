import React, { useId } from 'react';
import { Button, Modal, TextInput } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime } from './helpers';
import dialog from '../timetable/dialog.module.scss';

import type { ScheduleEvent } from './ScheduleView.types';

type ScheduleMeetingDialogProps = {
  event: ScheduleEvent | null;
  url: string;
  error: string | null;
  isSaving: boolean;
  locale: string;
  onUrlChange: (url: string) => void;
  onSave: () => void;
  onClose: () => void;
  onReschedule?: (event: ScheduleEvent) => void;
};

/** Edits a class's online link; staff can also start rescheduling the class from here. */
export const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({
  event,
  url,
  error,
  isSaving,
  locale,
  onUrlChange,
  onSave,
  onClose,
  onReschedule,
}) => {
  const { formatMessage } = useLanguage();
  const formId = useId();

  return (
    <Modal
      open={Boolean(event)}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={formatMessage('schedule.meetingUrlTitle')}
      closeLabel={formatMessage('common.close')}
      width={560}
      footer={
        <>
          {onReschedule && event && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => onReschedule(event)}
            >
              {formatMessage('schedule.rescheduleEvent')}
            </Button>
          )}
          <span className={dialog.spacer} />
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {formatMessage('schedule.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={isSaving}>
            {formatMessage('schedule.save')}
          </Button>
        </>
      }
    >
      {event && (
        <form
          id={formId}
          className={dialog.form}
          noValidate
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            onSave();
          }}
        >
          <div className={dialog.summary}>
            <span className={dialog.summaryTitle}>{event.title}</span>
            <span className={dialog.summaryMeta}>
              {formatMessage('schedule.eventSlot', {
                date: formatScheduleDate(
                  event.start,
                  { weekday: 'long', day: 'numeric', month: 'long' },
                  locale,
                ),
                start: formatScheduleTime(event.start, locale),
                end: formatScheduleTime(event.end, locale),
              })}
            </span>
          </div>
          <label className={dialog.field} htmlFor={`${formId}-url`}>
            {formatMessage('schedule.meetingUrlLabel')}
            <TextInput
              id={`${formId}-url`}
              type="url"
              value={url}
              disabled={isSaving}
              onChange={(changeEvent) => onUrlChange(changeEvent.target.value)}
              placeholder={formatMessage('schedule.meetingUrlPlaceholder')}
            />
          </label>
          {error && (
            <p className={dialog.alert} role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
};

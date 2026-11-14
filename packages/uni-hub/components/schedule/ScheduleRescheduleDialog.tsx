import React, { useId } from 'react';
import { Button, Modal, Select, TextInput } from '@una';
import {
  MAX_RESCHEDULE_REASON_LENGTH,
  PAIR_SCHEDULE,
  RESCHEDULE_SCOPE,
  type PairNumber,
} from '@core/constants/timetable';
import type { ReschedulePreviewResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { formatScheduleDate, formatScheduleTime } from './helpers';
import dialog from '../timetable/dialog.module.scss';

import type { RescheduleFormValues, ScheduleEvent } from './ScheduleView.types';

type ScheduleRescheduleDialogProps = {
  event: ScheduleEvent | null;
  values: RescheduleFormValues;
  preview: ReschedulePreviewResponse | null;
  isPreviewCurrent: boolean;
  isSaving: boolean;
  error: string | null;
  locale: string;
  onChange: (patch: Partial<RescheduleFormValues>) => void;
  onSubmit: () => void;
  onClose: () => void;
};

/** Two steps: preview what moves (one class or the rest of the series), then confirm. */
export const ScheduleRescheduleDialog: React.FC<ScheduleRescheduleDialogProps> = ({
  event,
  values,
  preview,
  isPreviewCurrent,
  isSaving,
  error,
  locale,
  onChange,
  onSubmit,
  onClose,
}) => {
  const { formatMessage } = useLanguage();
  const formId = useId();
  const pairOptions = (Object.keys(PAIR_SCHEDULE).map(Number) as PairNumber[]).map((pair) => ({
    value: String(pair),
    label: `${pair} · ${PAIR_SCHEDULE[pair].start}–${PAIR_SCHEDULE[pair].end}`,
  }));
  const scopes = [
    { value: RESCHEDULE_SCOPE.ONCE, label: formatMessage('schedule.scopeOnce') },
    { value: RESCHEDULE_SCOPE.SERIES, label: formatMessage('schedule.scopeSeries') },
  ];

  return (
    <Modal
      open={Boolean(event)}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={formatMessage('schedule.rescheduleEvent')}
      closeLabel={formatMessage('common.close')}
      width={600}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {formatMessage('schedule.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isSaving || !values.newDate || !values.reason.trim()}
          >
            {formatMessage(
              isPreviewCurrent ? 'schedule.confirmReschedule' : 'schedule.previewChanges',
            )}
          </Button>
        </>
      }
    >
      {event && (
        <form
          id={formId}
          className={dialog.form}
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            onSubmit();
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

          <div className={dialog.fields}>
            <label className={dialog.field} htmlFor={`${formId}-date`}>
              {formatMessage('schedule.newDate')}
              <TextInput
                id={`${formId}-date`}
                type="date"
                required
                value={values.newDate}
                disabled={isSaving}
                onChange={(changeEvent) => onChange({ newDate: changeEvent.target.value })}
              />
            </label>
            <label className={dialog.field} htmlFor={`${formId}-pair`}>
              {formatMessage('timetable.targetPair')}
              <Select
                id={`${formId}-pair`}
                value={values.newPair}
                disabled={isSaving}
                onChange={(newPair) => onChange({ newPair })}
                options={pairOptions}
              />
            </label>
            <div className={`${dialog.field} ${dialog.wide}`}>
              <span id={`${formId}-scope`}>{formatMessage('schedule.rescheduleScope')}</span>
              <div
                className={dialog.segmented}
                role="radiogroup"
                aria-labelledby={`${formId}-scope`}
              >
                {scopes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={values.scope === option.value}
                    className={dialog.segment}
                    disabled={isSaving}
                    onClick={() => onChange({ scope: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={`${dialog.field} ${dialog.wide}`}>
              <label htmlFor={`${formId}-reason`}>
                {formatMessage('schedule.rescheduleReason')}
              </label>
              <textarea
                id={`${formId}-reason`}
                required
                maxLength={MAX_RESCHEDULE_REASON_LENGTH}
                value={values.reason}
                disabled={isSaving}
                onChange={(changeEvent) => onChange({ reason: changeEvent.target.value })}
              />
              <span className={dialog.hint}>{formatMessage('schedule.reasonHint')}</span>
            </div>
          </div>

          {error && (
            <p className={dialog.alert} role="alert">
              {error}
            </p>
          )}

          {preview && (
            <section aria-label={formatMessage('schedule.changesTitle')}>
              <span className={dialog.summaryLabel}>{formatMessage('schedule.changesTitle')}</span>
              <ul className={dialog.changes}>
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
            </section>
          )}
        </form>
      )}
    </Modal>
  );
};

import React, { useId } from 'react';
import { Button, Modal, Select } from '@una';
import { PAIR_SCHEDULE } from '@core/constants/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getEventWeekday, getTeachingTypeLabel, PREVIEW_PAIRS } from './helpers';
import type { PreviewEvent } from './SchedulePreview.types';
import dialog from './dialog.module.scss';

type AdjustSlotDialogProps = {
  event: PreviewEvent | null;
  weekdayOptions: Array<{ value: string; label: string }>;
  targetWeekday: string;
  targetPair: string;
  hasConflict: boolean;
  isSaving: boolean;
  error: string | null;
  onWeekdayChange: (weekday: string) => void;
  onPairChange: (pair: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

/** Moves one class of a draft to another day and pair, warning about conflicts before saving. */
export const AdjustSlotDialog: React.FC<AdjustSlotDialogProps> = ({
  event,
  weekdayOptions,
  targetWeekday,
  targetPair,
  hasConflict,
  isSaving,
  error,
  onWeekdayChange,
  onPairChange,
  onClose,
  onSubmit,
}) => {
  const { formatMessage } = useLanguage();
  const formId = useId();
  const pairOptions = PREVIEW_PAIRS.map((pair) => ({
    value: String(pair),
    label: `${pair} · ${PAIR_SCHEDULE[pair].start}–${PAIR_SCHEDULE[pair].end}`,
  }));
  const currentDay =
    weekdayOptions.find((option) => event && option.value === String(getEventWeekday(event)))
      ?.label ?? '';

  return (
    <Modal
      open={Boolean(event)}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={formatMessage('timetable.adjustSlot')}
      closeLabel={formatMessage('common.close')}
      width={520}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {formatMessage('common.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={isSaving || hasConflict}>
            {formatMessage('schedule.save')}
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
            <span className={dialog.summaryLabel}>
              {getTeachingTypeLabel(event.teachingType, formatMessage)}
            </span>
            <span className={dialog.summaryTitle}>{event.disciplineTitle}</span>
            <span className={dialog.summaryMeta}>
              {formatMessage('timetable.currentSlot', { day: currentDay, pair: event.pair })}
            </span>
          </div>
          <div className={dialog.fields}>
            <label className={dialog.field} htmlFor={`${formId}-day`}>
              {formatMessage('timetable.targetWeekday')}
              <Select
                id={`${formId}-day`}
                value={targetWeekday}
                onChange={onWeekdayChange}
                options={weekdayOptions}
                disabled={isSaving}
              />
            </label>
            <label className={dialog.field} htmlFor={`${formId}-pair`}>
              {formatMessage('timetable.targetPair')}
              <Select
                id={`${formId}-pair`}
                value={targetPair}
                onChange={onPairChange}
                options={pairOptions}
                disabled={isSaving}
              />
            </label>
          </div>
          {hasConflict && (
            <p className={dialog.alert} role="alert">
              {formatMessage('timetable.adjustConflict')}
            </p>
          )}
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

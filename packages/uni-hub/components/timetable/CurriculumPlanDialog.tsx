import React, { useId, useState } from 'react';
import { Button, Modal } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { CurriculumPlanFields } from './CurriculumPlanFields';
import type {
  CurriculumPlanDialogProps,
  CurriculumPlanFieldValues,
} from './CurriculumPlanDialog.types';
import styles from './CurriculumPlanDialog.module.scss';

const ACADEMIC_YEAR_PATTERN = /^\d{4}\/\d{4}$/;

export const CurriculumPlanDialog: React.FC<CurriculumPlanDialogProps> = ({
  open,
  plans,
  onClose,
  onCreated,
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();
  const formId = `${baseId}-form`;
  const [fields, setFields] = useState<CurriculumPlanFieldValues>(() => ({
    title: '',
    faculty: plans[0]?.faculty ?? '',
    academicYear: plans[0]?.academicYear ?? '',
    semester: '1',
    studySemester: '',
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studySemester = fields.studySemester ? Number(fields.studySemester) : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const payload = {
      title: fields.title.trim(),
      faculty: fields.faculty.trim(),
      academicYear: fields.academicYear.trim(),
      semester: Number(fields.semester),
      studySemester,
    };

    if (!payload.title || !payload.faculty || !ACADEMIC_YEAR_PATTERN.test(payload.academicYear)) {
      setError(formatMessage('timetable.planRequiredFields'));

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await timetableApi.createCurriculumPlan(payload);

      onCreated(response.data);
    } catch {
      setError(formatMessage('timetable.planCreateError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={formatMessage('timetable.planDialogTitle')}
      closeLabel={formatMessage('common.close')}
      width={560}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {formatMessage('common.cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={isSaving}>
            {formatMessage(isSaving ? 'timetable.planCreating' : 'timetable.planCreate')}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <CurriculumPlanFields
          values={fields}
          disabled={isSaving}
          onChange={(patch) => setFields((previous) => ({ ...previous, ...patch }))}
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

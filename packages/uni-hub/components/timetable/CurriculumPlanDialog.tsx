import React, { useId, useState } from 'react';
import { Button, FileInput, Modal, Select } from '@una';
import type { ParsedCurriculumSheet } from '@core/types/timetable';
import { toImportedAssignments } from '@core/utils/curriculum';
import { useCurriculumFile } from '@uni-hub/hooks/useCurriculumFile';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { CurriculumPlanFields } from './CurriculumPlanFields';
import { CurriculumPreview } from './CurriculumPreview';
import type {
  CurriculumPlanDialogProps,
  CurriculumPlanFieldValues,
} from './CurriculumPlanDialog.types';
import styles from './CurriculumPlanDialog.module.scss';

const ACADEMIC_YEAR_PATTERN = /^\d{4}\/\d{4}$/;
const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const toTermKey = (sheetIndex: number, termIndex: number): string => `${sheetIndex}:${termIndex}`;

const findTerm = (
  sheets: ParsedCurriculumSheet[],
  key: string,
): { sheet: ParsedCurriculumSheet; termIndex: number } | null => {
  const [sheetIndex, termIndex] = key.split(':').map(Number);
  const sheet = sheets[sheetIndex];

  return sheet?.terms[termIndex] ? { sheet, termIndex } : null;
};

export const CurriculumPlanDialog: React.FC<CurriculumPlanDialogProps> = ({
  open,
  academicGroups,
  plans,
  onClose,
  onCreated,
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();
  const formId = `${baseId}-form`;
  const curriculumFile = useCurriculumFile();
  const [termKey, setTermKey] = useState('');
  const [fields, setFields] = useState<CurriculumPlanFieldValues>(() => ({
    title: '',
    faculty: plans[0]?.faculty ?? '',
    academicYear: plans[0]?.academicYear ?? '',
    semester: '1',
  }));
  const [groupId, setGroupId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = findTerm(curriculumFile.sheets, termKey);
  const disciplines = selected ? selected.sheet.terms[selected.termIndex].disciplines : [];
  const assignments = toImportedAssignments(disciplines);
  const termOptions = curriculumFile.sheets.flatMap((sheet, sheetIndex) =>
    sheet.terms.map((term, termIndex) => ({
      value: toTermKey(sheetIndex, termIndex),
      label: formatMessage('timetable.planTermOption', {
        sheet: sheet.sheetName,
        course: term.courseYear,
        semester: term.semester,
      }),
    })),
  );
  const groupOptions = [
    { value: '', label: formatMessage('timetable.planSelectGroup') },
    ...academicGroups.map((group) => ({ value: group.id, label: group.code })),
  ];
  const fileStatusMessage = {
    idle: null,
    ready: null,
    reading: formatMessage('timetable.planFileReading'),
    empty: formatMessage('timetable.planFileEmpty'),
    error: formatMessage('timetable.planFileError'),
  }[curriculumFile.status];

  const handleSelectTerm = (key: string, sheets = curriculumFile.sheets): void => {
    const term = findTerm(sheets, key);

    setTermKey(key);

    if (term) {
      const { courseYear, semester } = term.sheet.terms[term.termIndex];

      setFields((previous) => ({
        ...previous,
        title: formatMessage('timetable.planDefaultTitle', {
          specialty: term.sheet.specialty ?? term.sheet.sheetName,
          course: courseYear,
        }),
        semester: String(semester),
      }));
    }
  };

  const handleFiles = async (files: File[]): Promise<void> => {
    const sheets = await curriculumFile.readFile(files[0]);

    handleSelectTerm(sheets.length > 0 ? toTermKey(0, 0) : '', sheets);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const payload = {
      title: fields.title.trim(),
      faculty: fields.faculty.trim(),
      academicYear: fields.academicYear.trim(),
      semester: Number(fields.semester),
    };

    if (!payload.title || !payload.faculty || !ACADEMIC_YEAR_PATTERN.test(payload.academicYear)) {
      setError(formatMessage('timetable.planRequiredFields'));

      return;
    }

    if (assignments.length > 0 && !groupId) {
      setError(formatMessage('timetable.planGroupRequired'));

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await timetableApi.importCurriculumPlan({
        ...payload,
        groupId: groupId || undefined,
        assignments,
      });

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
      width={720}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {formatMessage('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isSaving || curriculumFile.status === 'reading'}
          >
            {formatMessage(isSaving ? 'timetable.planCreating' : 'timetable.planCreate')}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <FileInput
          label={formatMessage('timetable.planFile')}
          hint={formatMessage('timetable.planFileHint')}
          browseText={formatMessage('timetable.planFileBrowse')}
          dragText={formatMessage('timetable.planFileDrag')}
          accept={XLSX_ACCEPT}
          onFilesChange={(files) => void handleFiles(files)}
          disabled={isSaving}
        />
        {fileStatusMessage && (
          <p className={styles.status} role="status">
            {fileStatusMessage}
          </p>
        )}

        {termOptions.length > 0 && (
          <label className={styles.field} htmlFor={`${baseId}-term`}>
            {formatMessage('timetable.planTerm')}
            <Select
              id={`${baseId}-term`}
              value={termKey}
              options={termOptions}
              onChange={(key) => handleSelectTerm(key)}
              disabled={isSaving}
            />
          </label>
        )}

        <CurriculumPlanFields
          values={fields}
          disabled={isSaving}
          onChange={(patch) => setFields((previous) => ({ ...previous, ...patch }))}
        />

        {disciplines.length > 0 && (
          <>
            <label className={styles.field} htmlFor={`${baseId}-group`}>
              {formatMessage('timetable.planGroup')}
              <Select
                id={`${baseId}-group`}
                value={groupId}
                options={groupOptions}
                onChange={setGroupId}
                disabled={isSaving}
              />
            </label>
            <p className={styles.hint}>{formatMessage('timetable.planGroupHint')}</p>
            <CurriculumPreview disciplines={disciplines} assignmentCount={assignments.length} />
          </>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

import React, { useId } from 'react';
import { Select, TextInput } from '@una';
import { MAX_STUDY_SEMESTER } from '@core/constants/timetable';
import { getSemesterOfYear } from '@core/utils/study-semester';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { CurriculumPlanFieldsProps } from './CurriculumPlanDialog.types';
import styles from './CurriculumPlanDialog.module.scss';

export const CurriculumPlanFields: React.FC<CurriculumPlanFieldsProps> = ({
  values,
  disabled,
  onChange,
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();
  const semesterOptions = [1, 2].map((semester) => ({
    value: String(semester),
    label: formatMessage('timetable.planSemesterOption', { semester }),
  }));
  const studySemesterOptions = [
    { value: '', label: formatMessage('timetable.planStudySemesterNone') },
    ...Array.from({ length: MAX_STUDY_SEMESTER }, (_, index) => ({
      value: String(index + 1),
      label: formatMessage('timetable.planSemesterOption', { semester: index + 1 }),
    })),
  ];

  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field} htmlFor={`${baseId}-title`}>
        {formatMessage('timetable.planTitle')}
        <TextInput
          id={`${baseId}-title`}
          value={values.title}
          onChange={(event) => onChange({ title: event.target.value })}
          disabled={disabled}
        />
      </label>
      <label className={styles.field} htmlFor={`${baseId}-faculty`}>
        {formatMessage('timetable.planFaculty')}
        <TextInput
          id={`${baseId}-faculty`}
          value={values.faculty}
          onChange={(event) => onChange({ faculty: event.target.value })}
          disabled={disabled}
        />
      </label>
      <label className={styles.field} htmlFor={`${baseId}-year`}>
        {formatMessage('timetable.planAcademicYear')}
        <TextInput
          id={`${baseId}-year`}
          value={values.academicYear}
          placeholder={formatMessage('timetable.planAcademicYearHint')}
          onChange={(event) => onChange({ academicYear: event.target.value })}
          disabled={disabled}
        />
      </label>
      <label className={styles.field} htmlFor={`${baseId}-semester`}>
        {formatMessage('timetable.planSemester')}
        <Select
          id={`${baseId}-semester`}
          value={values.semester}
          options={semesterOptions}
          onChange={(semester) => onChange({ semester })}
          disabled={disabled || values.studySemester !== ''}
        />
      </label>
      <label className={styles.field} htmlFor={`${baseId}-study-semester`}>
        {formatMessage('timetable.planStudySemester')}
        <Select
          id={`${baseId}-study-semester`}
          value={values.studySemester}
          options={studySemesterOptions}
          onChange={(studySemester) =>
            onChange({
              studySemester,
              ...(studySemester
                ? { semester: String(getSemesterOfYear(Number(studySemester))) }
                : {}),
            })
          }
          disabled={disabled}
        />
        <span className={styles.hint}>{formatMessage('timetable.planStudySemesterHint')}</span>
      </label>
    </div>
  );
};

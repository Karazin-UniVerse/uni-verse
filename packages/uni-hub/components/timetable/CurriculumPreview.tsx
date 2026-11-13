import React from 'react';
import { Tag } from '@una';
import { CURRICULUM_DISCIPLINE_NOTE } from '@core/constants/timetable';
import type { CurriculumDiscipline } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './CurriculumPlanDialog.module.scss';

type CurriculumPreviewProps = {
  disciplines: CurriculumDiscipline[];
  assignmentCount: number;
};

const NOTE_LABEL_KEYS = {
  [CURRICULUM_DISCIPLINE_NOTE.DISTRIBUTED]: 'timetable.planNoteDistributed',
  [CURRICULUM_DISCIPLINE_NOTE.ROUNDED]: 'timetable.planNoteRounded',
} as const;

export const CurriculumPreview: React.FC<CurriculumPreviewProps> = ({
  disciplines,
  assignmentCount,
}) => {
  const { formatMessage } = useLanguage();
  const notes = new Set(disciplines.flatMap((discipline) => discipline.notes));

  return (
    <div className={styles.preview}>
      <p className={styles.summary}>
        {formatMessage('timetable.planPreviewSummary', {
          disciplines: disciplines.length,
          assignments: assignmentCount,
        })}
      </p>
      {notes.has(CURRICULUM_DISCIPLINE_NOTE.DISTRIBUTED) && (
        <p className={styles.hint}>{formatMessage('timetable.planDistributedHint')}</p>
      )}
      {notes.has(CURRICULUM_DISCIPLINE_NOTE.ROUNDED) && (
        <p className={styles.hint}>{formatMessage('timetable.planRoundedHint')}</p>
      )}
      <div
        className={styles.previewScroll}
        role="region"
        tabIndex={0}
        aria-label={formatMessage('timetable.planPreview')}
      >
        <table className={styles.previewTable}>
          <thead>
            <tr>
              <th>{formatMessage('timetable.disciplineTitle')}</th>
              <th>{formatMessage('timetable.typeLectureShort')}</th>
              <th>{formatMessage('timetable.typeLaboratoryShort')}</th>
              <th>{formatMessage('timetable.typePracticalShort')}</th>
              <th>{formatMessage('timetable.typeSeminarShort')}</th>
            </tr>
          </thead>
          <tbody>
            {disciplines.map((discipline, index) => (
              <tr key={`${index}-${discipline.title}`}>
                <td>
                  <div className={styles.disciplineCell}>
                    <span>{discipline.title}</span>
                    {discipline.notes.map((note) => (
                      <Tag key={note} size="small" tone="warning">
                        {formatMessage(NOTE_LABEL_KEYS[note])}
                      </Tag>
                    ))}
                  </div>
                </td>
                <td>{discipline.hours.LECTURE || '—'}</td>
                <td>{discipline.hours.LABORATORY || '—'}</td>
                <td>{discipline.hours.PRACTICAL || '—'}</td>
                <td>{discipline.hours.SEMINAR || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useId } from 'react';
import { Check } from 'lucide-react';
import { Tag } from '@una';
import type { GenerateTimetableDraftResult, SafeTeacherResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './TimetableManagement.module.scss';

type DraftCandidatesProps = {
  candidates: GenerateTimetableDraftResult['candidates'];
  selectedIndex: number;
  teachers: SafeTeacherResponse[];
  onSelect: (index: number) => void;
};

/** The generated variants as a radio list: penalty, then the teacher preferences each one breaks. */
export const DraftCandidates: React.FC<DraftCandidatesProps> = ({
  candidates,
  selectedIndex,
  teachers,
  onSelect,
}) => {
  const { formatMessage } = useLanguage();
  const name = useId();

  return (
    <div
      className={styles.candidatesList}
      role="radiogroup"
      aria-label={formatMessage('timetable.candidatesFound')}
    >
      {candidates.map((candidate, index) => {
        const violations = candidate.preferenceViolations ?? [];
        let scoreTone: 'success' | 'warning' | 'danger' = 'success';

        if (violations.length > 0) {
          scoreTone = 'danger';
        } else if (candidate.penaltyScore > 0) {
          scoreTone = 'warning';
        }

        return (
          <label
            key={candidate.versionId ?? index}
            className={`${styles.candidateCard} ${
              selectedIndex === index ? styles.selectedCandidate : ''
            }`}
          >
            <input
              type="radio"
              name={name}
              className={styles.candidateRadio}
              checked={selectedIndex === index}
              onChange={() => onSelect(index)}
            />
            <div className={styles.candidateHeader}>
              <span>{formatMessage('timetable.candidateNumbered', { number: index + 1 })}</span>
              <Tag tone={scoreTone}>
                {formatMessage('timetable.penaltyScoreVal', { score: candidate.penaltyScore })}
              </Tag>
            </div>
            <div className={styles.penaltyDetails}>
              {candidate.penaltyScore === 0 && violations.length === 0 ? (
                <span>
                  <Check size={14} aria-hidden="true" /> {formatMessage('timetable.noPenalties')}
                </span>
              ) : (
                <span>
                  {formatMessage('timetable.softPenaltiesVal', { score: candidate.penaltyScore })}
                </span>
              )}
              {violations.length > 0 && (
                <>
                  <Tag tone="danger">
                    {formatMessage('timetable.preferenceViolations', { count: violations.length })}
                  </Tag>
                  <ul className={styles.violationList}>
                    {violations.map((violation) => (
                      <li key={`${violation.eventId}-${violation.date}-${violation.pair}`}>
                        {formatMessage('timetable.preferenceViolationItem', {
                          teacher:
                            teachers.find((teacher) => teacher.id === violation.teacherId)?.name ??
                            violation.teacherId,
                          date: violation.date,
                          pair: violation.pair,
                        })}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
};

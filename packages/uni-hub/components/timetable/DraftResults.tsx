import React from 'react';
import { Check, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@una';
import type {
  GenerateTimetableDraftResult,
  SafeTeacherResponse,
  TeacherSlotPreference,
  AcademicGroupResponse,
} from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { DAY_LABEL_KEYS, getSourceWeekParity } from './helpers';
import { TIMETABLE_WEEK_PARITY } from '@core/constants/timetable';
import { DraftCandidates } from './DraftCandidates';
import { SchedulePreview } from './SchedulePreview';
import type { PreviewEvent } from './SchedulePreview.types';
import styles from './TimetableManagement.module.scss';

type DraftResultsProps = {
  draft: GenerateTimetableDraftResult;
  semesterStartDate: string;
  selectedIndex: number;
  executionTimeMs: number;
  scheduledEventsCount: number;
  teachers: SafeTeacherResponse[];
  academicGroups: AcademicGroupResponse[];
  isPublished: boolean;
  isPublishing: boolean;
  isGenerating: boolean;
  onSelect: (index: number) => void;
  onRegenerate: () => void;
  onPublish: () => void;
  onAdjust: (event: PreviewEvent, weekday: number) => void;
  slotPreferences?: TeacherSlotPreference[];
};

/** A generated draft: how it was found, the variants to choose from and the chosen week. */
export const DraftResults: React.FC<DraftResultsProps> = ({
  draft,
  semesterStartDate,
  selectedIndex,
  executionTimeMs,
  scheduledEventsCount,
  teachers,
  academicGroups,
  slotPreferences,
  isPublished,
  isPublishing,
  isGenerating,
  onSelect,
  onRegenerate,
  onPublish,
  onAdjust,
}) => {
  const { formatMessage } = useLanguage();
  const events = draft.candidates[selectedIndex]?.events ?? [];
  const compactSaturdays =
    (draft.candidates[selectedIndex]?.automaticMakeupDays?.length ?? 0) === 0
      ? (draft.candidates[selectedIndex]?.automaticMakeupDates ?? [])
      : [];

  return (
    <section className={styles.draft} aria-labelledby="draft-title">
      <header className={styles.draftHeader}>
        <div className={styles.draftHeading}>
          <h3 id="draft-title">{formatMessage('timetable.draftTitle')}</h3>
          <p className={styles.draftMeta}>
            <span>{formatMessage('timetable.draftMeta', { count: draft.candidates.length })}</span>
            <strong>
              {formatMessage('timetable.executionTimeVal', { time: executionTimeMs })}
            </strong>
            <span>
              {formatMessage('timetable.statesExploredMeta', {
                count: draft.diagnostics.statesExplored,
              })}
            </span>
          </p>
        </div>
        <div className={styles.draftActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onRegenerate}
            disabled={isGenerating || isPublishing}
          >
            <RefreshCw size={16} aria-hidden="true" /> {formatMessage('timetable.regenerate')}
          </Button>
          {isPublished ? (
            <span className={styles.publishedBanner}>
              <CheckCircle2 size={18} aria-hidden="true" />{' '}
              {formatMessage('timetable.publishedSuccess')}
            </span>
          ) : (
            <Button type="button" onClick={onPublish} disabled={isPublishing || isGenerating}>
              {isPublishing ? (
                <>
                  <span className={styles.inlineSpinner} aria-hidden="true" />{' '}
                  {formatMessage('timetable.publishing')}
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden="true" />{' '}
                  {formatMessage('timetable.publishCandidate', { number: selectedIndex + 1 })}
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      <div className={styles.draftBody}>
        <DraftCandidates
          candidates={draft.candidates}
          selectedIndex={selectedIndex}
          teachers={teachers}
          onSelect={onSelect}
        />
        <div className={styles.previewSection}>
          <h4>{formatMessage('timetable.previewTitle')}</h4>
          {(draft.candidates[selectedIndex]?.automaticMakeupDays?.length ?? 0) > 0 && (
            <section aria-label={formatMessage('timetable.makeupDaysTitle')}>
              <h4>{formatMessage('timetable.makeupDaysTitle')}</h4>
              <ul>
                {draft.candidates[selectedIndex].automaticMakeupDays?.map(
                  ({ date, sourceDate }) => (
                    <li key={date}>
                      {formatMessage('timetable.makeupDayItem', {
                        date,
                        sourceDate,
                        weekday: formatMessage(
                          DAY_LABEL_KEYS[new Date(sourceDate).getUTCDay() - 1],
                        ),
                        parity: formatMessage(
                          getSourceWeekParity(sourceDate, semesterStartDate) ===
                            TIMETABLE_WEEK_PARITY.NUMERATOR
                            ? 'timetable.weekNumerator'
                            : 'timetable.weekDenominator',
                        ),
                      })}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
          {compactSaturdays.length > 0 && (
            <section aria-label={formatMessage('timetable.makeupDaysTitle')}>
              <h4>{formatMessage('timetable.makeupDaysTitle')}</h4>
              <p className={styles.summaryHint}>
                {formatMessage('timetable.compactSaturdaysNote')}
              </p>
              <ul>
                {compactSaturdays.map((date) => (
                  <li key={date}>{date}</li>
                ))}
              </ul>
            </section>
          )}
          {events.length > 0 ? (
            <SchedulePreview
              events={events as PreviewEvent[]}
              academicGroups={academicGroups}
              onAdjust={isPublished ? undefined : onAdjust}
              teachers={teachers}
              slotPreferences={slotPreferences}
            />
          ) : (
            <div className={styles.emptyPreview}>
              {formatMessage('timetable.scheduledEventsCount', { count: scheduledEventsCount })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

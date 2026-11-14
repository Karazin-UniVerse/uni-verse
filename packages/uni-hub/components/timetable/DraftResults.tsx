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
import { DraftCandidates } from './DraftCandidates';
import { SchedulePreview } from './SchedulePreview';
import type { PreviewEvent } from './SchedulePreview.types';
import styles from './TimetableManagement.module.scss';

type DraftResultsProps = {
  draft: GenerateTimetableDraftResult;
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

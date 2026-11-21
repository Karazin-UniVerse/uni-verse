import React, { useCallback, useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus } from 'lucide-react';
import { Button, Select } from '@una';
import { DEFAULT_NOMINAL_WEEKS } from '@core/constants/timetable';
import type { CurriculumPlanResponse } from '@core/types/timetable';
import { useTimetableReferences } from '@uni-hub/hooks/useTimetableReferences';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { AdjustSlotDialog } from './AdjustSlotDialog';
import { CurriculumPlanDialog } from './CurriculumPlanDialog';
import { DraftResults } from './DraftResults';
import {
  semesterCalendarQueryOptions,
  semesterSlotPreferencesQueryOptions,
} from './semesterQueries';
import { useTimetableDraft } from './useTimetableDraft';
import { useWorkloadEditor } from './useWorkloadEditor';
import { WorkloadActions } from './WorkloadActions';
import { WorkloadSummary } from './WorkloadSummary';
import { WorkloadTable } from './WorkloadTable';
import type { WorkloadRow } from './workload';
import styles from './TimetableManagement.module.scss';

export interface TimetableManagementProps {
  initialPlanId?: string;
  initialWorkload?: WorkloadRow[];
}

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  initialWorkload,
  initialPlanId = '',
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();
  const [chosenPlanId, setPlanId] = useState(initialPlanId);
  const [calendarReady, setCalendarReady] = useState(false);
  const [compactSaturdays, setCompactSaturdays] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const { plans, teachers, streams, addPlan } = useTimetableReferences();
  const planId = chosenPlanId || plans[0]?.id || '';
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const calendarQuery = useQuery(
    semesterCalendarQueryOptions(selectedPlan?.academicYear ?? '', selectedPlan?.semester ?? 1),
  );
  const slotPreferencesQuery = useQuery(
    semesterSlotPreferencesQueryOptions(calendarQuery.data?.id ?? ''),
  );
  const isShortSemester =
    calendarQuery.data !== undefined && calendarQuery.data.teachingWeeks < DEFAULT_NOMINAL_WEEKS;
  const editor = useWorkloadEditor({ planId, initialWorkload, streams, onError: setError });
  const draft = useTimetableDraft({
    planId,
    canGenerate: calendarReady,
    semesterStartDate: calendarQuery.data?.startDate,
    excludedDates: calendarQuery.data?.excludedDates,
    compactSaturdays: isShortSemester && compactSaturdays,
    saveWorkload: editor.persist,
    onError: setError,
  });
  const isBusy = editor.isSaving || draft.isGenerating || draft.isAdjusting || draft.isPublishing;
  const hasPendingWorkload = editor.hasUnsavedChanges || isBusy;
  const { clear: clearWorkload } = editor;
  const { reset: resetDraft } = draft;

  const handleSelectPlan = useCallback(
    (id: string) => {
      setError(null);
      setCalendarReady(false);
      clearWorkload();
      resetDraft();
      setPlanId(id);
    },
    [clearWorkload, resetDraft],
  );

  const handlePlanCreated = (plan: CurriculumPlanResponse): void => {
    addPlan(plan);
    setIsPlanDialogOpen(false);
    handleSelectPlan(plan.id);
  };

  const planOptions = useMemo(() => {
    const options = plans.map((plan) => ({
      value: plan.id,
      label: formatMessage('timetable.planOption', {
        title: plan.title,
        academicYear: plan.academicYear,
        semester: plan.semester,
      }),
    }));

    if (options.length === 0) {
      return [{ value: '', label: formatMessage('timetable.noPlans') }];
    }

    return [{ value: '', label: formatMessage('timetable.selectPlan') }, ...options];
  }, [formatMessage, plans]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2>{formatMessage('timetable.managementTitle')}</h2>
      </header>

      {editor.isLoadFailed && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} /> {formatMessage('timetable.workloadLoadError')}
        </div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <section className={styles.planRow}>
        <label htmlFor={`${baseId}-planId`}>{formatMessage('timetable.planId')}</label>
        <Select
          id={`${baseId}-planId`}
          value={planId}
          options={planOptions}
          onChange={handleSelectPlan}
          disabled={hasPendingWorkload}
          aria-label={formatMessage('timetable.planId')}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsPlanDialogOpen(true)}
          disabled={hasPendingWorkload}
        >
          <Plus size={16} /> {formatMessage('timetable.addPlan')}
        </Button>
      </section>
      {isPlanDialogOpen && (
        <CurriculumPlanDialog
          open
          plans={plans}
          onClose={() => setIsPlanDialogOpen(false)}
          onCreated={handlePlanCreated}
        />
      )}

      {selectedPlan && (
        <WorkloadSummary
          key={planId}
          academicYear={selectedPlan.academicYear}
          semester={selectedPlan.semester}
          studySemester={selectedPlan.studySemester}
          workload={editor.workload}
          onCalendarReadyChange={setCalendarReady}
        />
      )}
      <section className={styles.section}>
        <h3>{formatMessage('timetable.workloadTitle')}</h3>
        {editor.groupsQuery.isPending && (
          <p role="status">{formatMessage('timetable.groupsLoading')}</p>
        )}
        {editor.groupsQuery.isError && (
          <div className={styles.errorBanner} role="alert">
            {formatMessage('timetable.groupsLoadError')}
            <Button type="button" onClick={() => void editor.groupsQuery.refetch()}>
              {formatMessage('common.error.retry')}
            </Button>
          </div>
        )}
        {editor.groupsQuery.isSuccess && editor.academicGroups.length === 0 && (
          <p role="status">{formatMessage('timetable.noGroups')}</p>
        )}
        <WorkloadTable editor={editor} teachers={teachers} streams={streams} disabled={isBusy} />
        <WorkloadActions
          isAddDisabled={isBusy || !editor.canAddRow}
          isGenerating={draft.isGenerating}
          isSaveDisabled={isBusy || !planId || editor.isLoadFailed}
          isGenerateDisabled={isBusy || !planId || !calendarReady || editor.isLoadFailed}
          showCompactSaturdays={isShortSemester}
          compactSaturdays={compactSaturdays}
          onCompactSaturdaysChange={setCompactSaturdays}
          onAddDiscipline={() => editor.addRow()}
          onSave={editor.save}
          onGenerate={draft.generate}
        />
      </section>

      {draft.draftResult && (
        <DraftResults
          draft={draft.draftResult}
          semesterStartDate={calendarQuery.data!.startDate}
          selectedIndex={draft.selectedCandidateIndex}
          executionTimeMs={draft.executionTimeMs}
          scheduledEventsCount={draft.scheduledEventsCount}
          teachers={teachers}
          academicGroups={editor.academicGroups}
          slotPreferences={slotPreferencesQuery.data}
          isPublished={draft.isPublished}
          isPublishing={draft.isPublishing}
          isGenerating={draft.isGenerating}
          onSelect={draft.selectCandidate}
          onRegenerate={() => void draft.generate()}
          onPublish={() => void draft.publish()}
          onAdjust={draft.startAdjust}
        />
      )}
      <AdjustSlotDialog
        event={draft.adjustingEvent}
        weekdayOptions={draft.weekdayOptions}
        targetWeekday={draft.targetWeekday}
        targetPair={draft.targetPair}
        hasConflict={draft.adjustmentConflict}
        isSaving={draft.isAdjusting}
        error={draft.adjustmentError}
        onWeekdayChange={draft.changeTargetWeekday}
        onPairChange={draft.changeTargetPair}
        onClose={draft.closeAdjust}
        onSubmit={() => void draft.adjustSlot()}
      />
    </div>
  );
};

export default TimetableManagement;

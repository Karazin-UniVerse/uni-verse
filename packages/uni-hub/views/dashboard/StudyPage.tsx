'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GradeSimulator } from '@uni-hub/components/gamification';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { STUDY_VIEW, type StudyView } from './constants';
import { useDashboardData } from './hooks/useDashboardData';
import { getAssignmentHref } from './routes';
import { AssignmentsTab } from './tabs/AssignmentsTab';
import { CoursesTab } from './tabs/CoursesTab';
import { GradesTab } from './tabs/GradesTab';
import { StudyTab } from './tabs/StudyTab';
import { isStudyView } from './utils';

export const StudyPage: React.FC = () => {
  const router = useRouter();
  const { data } = useDashboardData();
  const dateFrom = useMoodleStore((state) => state.dateFrom);
  const dateTo = useMoodleStore((state) => state.dateTo);
  const sortOrder = useMoodleStore((state) => state.sortOrder);
  const hideCompleted = useMoodleStore((state) => state.hideCompleted);
  const setDateFrom = useMoodleStore((state) => state.setDateFrom);
  const setDateTo = useMoodleStore((state) => state.setDateTo);
  const setSortOrder = useMoodleStore((state) => state.setSortOrder);
  const setHideCompleted = useMoodleStore((state) => state.setHideCompleted);
  const soundEnabled = useGamificationStore((state) => state.soundEnabled);
  const requestedView = useSearchParams().get('view');
  const requestedStudyView =
    requestedView && isStudyView(requestedView) ? requestedView : STUDY_VIEW.Subjects;

  const [viewSelection, setViewSelection] = useState<{
    requestedView: string | null;
    view: StudyView;
  } | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const studyView =
    viewSelection?.requestedView === requestedView ? viewSelection.view : requestedStudyView;

  const renderStudyView = (): React.ReactNode => {
    switch (studyView) {
      case STUDY_VIEW.Subjects:
        return <CoursesTab courses={data.courses} soundEnabled={soundEnabled} />;
      case STUDY_VIEW.Grades:
        return <GradesTab grades={data.grades} onOpenSimulator={() => setSimulatorOpen(true)} />;
      case STUDY_VIEW.Assignments:
        return (
          <AssignmentsTab
            assignments={data.assignments}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            hideCompleted={hideCompleted}
            onHideCompletedChange={setHideCompleted}
            soundEnabled={soundEnabled}
            onOpenAssignment={(assignment) => router.push(getAssignmentHref(assignment.id))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <StudyTab view={studyView} onViewChange={(view) => setViewSelection({ requestedView, view })}>
        {renderStudyView()}
      </StudyTab>
      <GradeSimulator
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        grades={data.grades}
        assignments={data.assignments}
      />
    </>
  );
};

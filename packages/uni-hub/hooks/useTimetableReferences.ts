import { useCallback, useEffect, useState } from 'react';
import type { CurriculumPlanResponse, SafeTeacherResponse } from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';

interface TimetableReferenceLists {
  plans: CurriculumPlanResponse[];
  teachers: SafeTeacherResponse[];
}

export interface TimetableReferences extends TimetableReferenceLists {
  addPlan: (plan: CurriculumPlanResponse) => void;
}

const EMPTY_REFERENCES: TimetableReferenceLists = { plans: [], teachers: [] };

/** Loads the curriculum plans and teachers the dean may pick from, so ids are never typed by hand. */
export function useTimetableReferences(): TimetableReferences {
  const [references, setReferences] = useState<TimetableReferenceLists>(EMPTY_REFERENCES);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([timetableApi.listCurriculumPlans(), timetableApi.listTeachers()]).then(
      ([plansResult, teachersResult]) => {
        if (!isActive) {
          return;
        }

        setReferences({
          plans: plansResult.status === 'fulfilled' ? (plansResult.value?.data ?? []) : [],
          teachers: teachersResult.status === 'fulfilled' ? (teachersResult.value?.data ?? []) : [],
        });
      },
    );

    return () => {
      isActive = false;
    };
  }, []);

  const addPlan = useCallback((plan: CurriculumPlanResponse) => {
    setReferences((previous) => ({ ...previous, plans: [plan, ...previous.plans] }));
  }, []);

  return { ...references, addPlan };
}

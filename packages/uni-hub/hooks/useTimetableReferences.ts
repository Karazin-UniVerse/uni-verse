import { useEffect, useState } from 'react';
import type { CurriculumPlanResponse, SafeTeacherResponse } from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';

export interface TimetableReferences {
  plans: CurriculumPlanResponse[];
  teachers: SafeTeacherResponse[];
}

const EMPTY_REFERENCES: TimetableReferences = { plans: [], teachers: [] };

/** Loads the curriculum plans and teachers the dean may pick from, so ids are never typed by hand. */
export function useTimetableReferences(): TimetableReferences {
  const [references, setReferences] = useState<TimetableReferences>(EMPTY_REFERENCES);

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

  return references;
}

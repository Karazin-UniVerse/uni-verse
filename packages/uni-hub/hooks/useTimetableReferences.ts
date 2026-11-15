import { useCallback, useEffect, useState } from 'react';
import type {
  AcademicStreamResponse,
  CurriculumPlanResponse,
  SafeTeacherResponse,
} from '@core/types/timetable';
import { timetableApi } from '@uni-hub/services/api.timetable';

interface TimetableReferenceLists {
  plans: CurriculumPlanResponse[];
  teachers: SafeTeacherResponse[];
  streams: AcademicStreamResponse[];
}

export interface TimetableReferences extends TimetableReferenceLists {
  addPlan: (plan: CurriculumPlanResponse) => void;
}

const EMPTY_REFERENCES: TimetableReferenceLists = { plans: [], teachers: [], streams: [] };

/** Loads the curriculum plans, teachers and streams the dean may pick from, so ids are never typed by hand. */
export function useTimetableReferences(): TimetableReferences {
  const [references, setReferences] = useState<TimetableReferenceLists>(EMPTY_REFERENCES);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      timetableApi.listCurriculumPlans(),
      timetableApi.listTeachers(),
      timetableApi.listAcademicStreams(),
    ]).then(([plansResult, teachersResult, streamsResult]) => {
      if (!isActive) {
        return;
      }

      setReferences({
        plans: plansResult.status === 'fulfilled' ? (plansResult.value?.data ?? []) : [],
        teachers: teachersResult.status === 'fulfilled' ? (teachersResult.value?.data ?? []) : [],
        streams: streamsResult.status === 'fulfilled' ? (streamsResult.value?.data ?? []) : [],
      });
    });

    return () => {
      isActive = false;
    };
  }, []);

  const addPlan = useCallback((plan: CurriculumPlanResponse) => {
    setReferences((previous) => ({ ...previous, plans: [plan, ...previous.plans] }));
  }, []);

  return { ...references, addPlan };
}

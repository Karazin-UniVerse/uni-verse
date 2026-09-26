import { useState, useEffect, useRef } from 'react';
import type { Assignment } from '@uni-hub/types';
import { moodleApi } from '@uni-hub/services/api';

export type AssignmentLocalStatuses = Record<number, { status?: string; grade?: string }>;

export function useAssignmentStatuses(assignments: Assignment[]): AssignmentLocalStatuses {
  const [localStatuses, setLocalStatuses] = useState<AssignmentLocalStatuses>({});
  const requestedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const assignmentsNeedingStatus = assignments.filter(
      (item) => !item.submissionStatus && !requestedIdsRef.current.has(item.id),
    );

    if (assignmentsNeedingStatus.length === 0) return;

    const batch = assignmentsNeedingStatus.slice(0, 10);

    for (const item of batch) {
      requestedIdsRef.current.add(item.id);
    }

    for (const item of batch) {
      void (async () => {
        try {
          const res = await moodleApi.getAssignmentStatus(item.id);

          if (!cancelled && res?.data) {
            const data = res.data as { status?: string; grade?: string };

            setLocalStatuses((prev) => ({
              ...prev,
              [item.id]: { status: data.status, grade: data.grade },
            }));
          }
        } catch {
          // Ignore status fetch error for individual item
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [assignments]);

  return localStatuses;
}

import { useState, useEffect, useRef } from 'react';
import type { Assignment } from '@uni-hub/types';
import { moodleApi } from '@uni-hub/services/api';

export type AssignmentLocalStatuses = Record<number, { status?: string; grade?: string }>;

const BATCH_SIZE = 10;

export function useAssignmentStatuses(assignments: Assignment[]): AssignmentLocalStatuses {
  const [localStatuses, setLocalStatuses] = useState<AssignmentLocalStatuses>({});
  const requestedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const requestedIds = requestedIdsRef.current;
    const inFlightIds = new Set<number>();

    const processNextBatch = async (): Promise<void> => {
      if (cancelled) return;

      const assignmentsNeedingStatus = assignments.filter(
        (item) => !item.submissionStatus && !requestedIds.has(item.id),
      );

      if (assignmentsNeedingStatus.length === 0) {
        return;
      }

      const batch = assignmentsNeedingStatus.slice(0, BATCH_SIZE);

      for (const item of batch) {
        requestedIds.add(item.id);
        inFlightIds.add(item.id);
      }

      await Promise.allSettled(
        batch.map(async (item) => {
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
          } finally {
            inFlightIds.delete(item.id);
          }
        }),
      );

      return processNextBatch();
    };

    void processNextBatch();

    return () => {
      cancelled = true;

      for (const id of inFlightIds) {
        requestedIds.delete(id);
      }
    };
  }, [assignments]);

  return localStatuses;
}

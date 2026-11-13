'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@una';
import {
  DEFAULT_RESCHEDULE_PAGE_SIZE,
  MAX_RESCHEDULE_REASON_LENGTH,
  RESCHEDULE_REQUEST_STATUS,
} from '@core/constants/timetable';
import { useCurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import styles from './RescheduleRequests.module.scss';

export function RescheduleRequests({ isAdmin }: { isAdmin: boolean }): React.JSX.Element {
  const { formatMessage } = useLanguage();
  const { userId } = useCurrentUser();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const status = isAdmin ? RESCHEDULE_REQUEST_STATUS.PENDING : undefined;
  const queryKey = ['timetable', 'rescheduleRequests', userId, isAdmin, status, page];
  const requests = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await timetableApi.listRescheduleRequests(
          { page, pageSize: DEFAULT_RESCHEDULE_PAGE_SIZE, ...(status && { status }) },
          !isAdmin,
        )
      ).data,
    enabled: Boolean(userId),
  });
  const decision = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      approve
        ? timetableApi.approveRescheduleRequest(id)
        : timetableApi.rejectRescheduleRequest(id, explanations[id].trim()),
    onSuccess: () => client.invalidateQueries({ queryKey: ['timetable'] }),
  });

  return (
    <section className={styles.root}>
      <h3>{formatMessage('schedule.requestsTitle')}</h3>
      {requests.isLoading && <p role="status">{formatMessage('schedule.requestsLoading')}</p>}
      {(requests.isError || decision.isError) && (
        <p role="alert">{formatMessage('schedule.requestsError')}</p>
      )}
      {requests.isError && (
        <Button type="button" onClick={() => void requests.refetch()}>
          {formatMessage('schedule.retryRequests')}
        </Button>
      )}
      {requests.data?.items.length === 0 && <p>{formatMessage('schedule.requestsEmpty')}</p>}
      {requests.data?.items.map((request) => (
        <article key={request.id} className={styles.card}>
          <h4>{request.disciplineTitle}</h4>
          <p>{request.requesterName}</p>
          <p>{formatMessage(`schedule.requestStatus.${request.status}`)}</p>
          <p>
            {formatMessage(
              request.scope === 'ONCE' ? 'schedule.scopeOnce' : 'schedule.scopeSeries',
            )}
          </p>
          <p>{request.reason}</p>
          <ul>
            {request.changes.map((change) => (
              <li key={change.eventId}>
                {formatMessage('schedule.occurrenceChange', {
                  oldDate: change.oldDate,
                  oldPair: change.oldPair,
                  newDate: change.newDate,
                  newPair: change.newPair,
                })}
              </li>
            ))}
          </ul>
          {request.decisionExplanation && <p>{request.decisionExplanation}</p>}
          {isAdmin && request.status === 'PENDING' && (
            <div className={styles.actions}>
              <Button
                type="button"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ id: request.id, approve: true })}
              >
                {formatMessage('schedule.approveRequest')}
              </Button>
              <label>
                {formatMessage('schedule.rejectionExplanation')}
                <textarea
                  maxLength={MAX_RESCHEDULE_REASON_LENGTH}
                  value={explanations[request.id] ?? ''}
                  disabled={decision.isPending}
                  onChange={(event) =>
                    setExplanations({ ...explanations, [request.id]: event.target.value })
                  }
                />
              </label>
              <Button
                type="button"
                disabled={decision.isPending || !explanations[request.id]?.trim()}
                onClick={() => decision.mutate({ id: request.id, approve: false })}
              >
                {formatMessage('schedule.rejectRequest')}
              </Button>
            </div>
          )}
        </article>
      ))}
      {requests.data && requests.data.total > DEFAULT_RESCHEDULE_PAGE_SIZE && (
        <div className={styles.actions}>
          <Button
            type="button"
            disabled={page <= 1 || requests.isFetching}
            onClick={() => setPage(page - 1)}
          >
            {formatMessage('schedule.previousRequests')}
          </Button>
          <Button
            type="button"
            disabled={
              page * DEFAULT_RESCHEDULE_PAGE_SIZE >= requests.data.total || requests.isFetching
            }
            onClick={() => setPage(page + 1)}
          >
            {formatMessage('schedule.nextRequests')}
          </Button>
        </div>
      )}
    </section>
  );
}

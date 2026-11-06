'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GripBrowserIdentity, GripSubmissionRequest } from '@core/types/grip-hosted';
import { GripBoard } from '@ui';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { gripApi, GripApiError } from '@uni-hub/services/api.grip';
import { gripCheckOptions, gripKeys } from './queries';
import styles from './HostedBoardPage.module.scss';
import { HostedPushSummary } from './HostedPushSummary';

export function HostedBoardDefense({
  identity,
  checkId,
}: {
  identity: GripBrowserIdentity;
  checkId: string;
}): React.ReactElement {
  const { formatMessage } = useLanguage();
  const client = useQueryClient();
  const check = useQuery(gripCheckOptions(identity.githubId, checkId));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<GripSubmissionRequest | null>(null);
  const submit = useMutation({
    mutationKey: gripKeys.check(identity.githubId, checkId),
    gcTime: 0,
    mutationFn: (input: GripSubmissionRequest) =>
      gripApi.submit({ checkId, input, csrfToken: identity.csrfToken }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: gripKeys.check(identity.githubId, checkId) }),
    onError: () =>
      client.invalidateQueries({ queryKey: gripKeys.check(identity.githubId, checkId) }),
  });

  useEffect(
    () => () => {
      const mutationCache = client.getMutationCache();

      for (const mutation of mutationCache.findAll({
        mutationKey: gripKeys.check(identity.githubId, checkId),
        exact: true,
      })) {
        mutationCache.remove(mutation);
      }
    },
    [client, identity.githubId, checkId],
  );

  if (check.isPending) {
    return <p role="status">{formatMessage('grip.loading')}</p>;
  }

  const denied =
    check.error instanceof GripApiError && [401, 403, 404].includes(check.error.status);

  if (!check.data || denied) {
    return (
      <section>
        <p role="alert">{formatMessage('grip.error')}</p>
        {!(check.error instanceof GripApiError && check.error.status === 429) && (
          <Button onClick={() => void check.refetch()}>{formatMessage('grip.retry')}</Button>
        )}
      </section>
    );
  }

  const view = check.data;

  return (
    <>
      <p role="status">{formatMessage(`grip.state.${view.state}`)}</p>
      <HostedPushSummary manifest={view.manifest} label={formatMessage('grip.pushSummary')} />
      {view.score !== undefined && <h2>{formatMessage('grip.score', { score: view.score })}</h2>}
      {view.truncated && <p role="note">{formatMessage('grip.truncated')}</p>}
      {submit.isError && <p role="alert">{formatMessage('grip.submitError')}</p>}
      {view.board && (
        <GripBoard
          board={view.board}
          answers={answers}
          onAnswerChange={(id, value) => {
            setIntent(null);
            setAnswers((previous) => ({ ...previous, [id]: value }));
          }}
          onSubmit={() => {
            const input = intent ?? {
              requestId: crypto.randomUUID(),
              boardRevision: view.board!.revision,
              answers: view.board!.questions.map((question) => ({
                questionId: question.id,
                answer: answers[question.id] ?? '',
              })),
            };

            setIntent(input);
            submit.mutate(input);
          }}
          submitting={submit.isPending || view.state === 'GRADING'}
          disabled={view.state !== 'READY'}
          labels={{
            structure: formatMessage('grip.structure'),
            questions: formatMessage('grip.questions'),
            answer: (index) => formatMessage('grip.answer', { index }),
            submit: formatMessage('grip.submit'),
            submitting: formatMessage('grip.submitting'),
            untrusted: formatMessage('grip.untrusted'),
            files: formatMessage('grip.files'),
          }}
        />
      )}
      {view.feedback && (
        <ul>
          {view.feedback.map((grade) => (
            <li key={grade.questionId}>{grade.feedback}</li>
          ))}
        </ul>
      )}
      <details className={styles.diff}>
        <summary>{formatMessage('grip.diff')}</summary>
        <pre>{view.diff}</pre>
      </details>
    </>
  );
}

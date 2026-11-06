'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@una';
import { useLanguage } from '@grip/i18n/LanguageContext';
import { gripApi, GripApiError } from '@grip/services/api.grip';
import { HostedBoardDefense } from './HostedBoardDefense';
import { gripSessionOptions } from './queries';
import styles from './HostedBoardPage.module.scss';

export function HostedBoardPage({ checkId }: { checkId: string }): React.ReactElement {
  const { formatMessage } = useLanguage();
  const client = useQueryClient();
  const [sessionChanged, setSessionChanged] = useState(false);
  const session = useQuery(gripSessionOptions());
  const denied = session.error instanceof GripApiError && [401, 403].includes(session.error.status);
  const logout = useMutation({
    mutationFn: () => gripApi.logout(session.data!.csrfToken),
    onSettled: () => {
      client.clear();
      window.location.reload();
    },
  });
  const sessionBackoff = session.error instanceof GripApiError && session.error.status === 429;

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === 'grip-session-change') {
        setSessionChanged(true);
        client.clear();
      }
    };

    window.addEventListener('storage', onStorage);

    const url = new URL(window.location.href);

    if (url.searchParams.get('sessionChanged') === '1') {
      try {
        localStorage.setItem('grip-session-change', crypto.randomUUID());
      } catch {}

      url.searchParams.delete('sessionChanged');
      window.history.replaceState(null, '', url);
    }

    return () => window.removeEventListener('storage', onStorage);
  }, [client]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{formatMessage('grip.title')}</h1>
        {session.data && !denied && (
          <Button
            variant="secondary"
            onClick={() => {
              try {
                localStorage.setItem('grip-session-change', crypto.randomUUID());
              } catch {}

              logout.mutate();
            }}
            disabled={logout.isPending}
          >
            {formatMessage('grip.logout')}
          </Button>
        )}
      </header>
      <p className={styles.privacy}>{formatMessage('grip.privacy')}</p>
      {session.isPending && <p role="status">{formatMessage('grip.loading')}</p>}
      {session.isError && (!session.data || denied) && (
        <section>
          <p role="alert">
            {formatMessage(
              session.error instanceof GripApiError && session.error.status === 401
                ? 'grip.loginNotice'
                : 'grip.error',
            )}
          </p>
          {session.error instanceof GripApiError && session.error.status === 401 ? (
            <Button
              isLink
              href={`/dev-tools/grip/api/auth/start?checkId=${encodeURIComponent(checkId)}`}
            >
              {formatMessage('grip.login')}
            </Button>
          ) : (
            !sessionBackoff && (
              <Button onClick={() => void session.refetch()}>{formatMessage('grip.retry')}</Button>
            )
          )}
        </section>
      )}
      {session.data && !denied && !logout.isPending && !sessionChanged && (
        <HostedBoardDefense
          key={`${session.data.githubId}:${checkId}`}
          identity={session.data}
          checkId={checkId}
        />
      )}
      {sessionChanged && (
        <Button onClick={() => window.location.reload()}>{formatMessage('grip.retry')}</Button>
      )}
    </main>
  );
}

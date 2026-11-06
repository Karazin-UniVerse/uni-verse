import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { withLanguage, withQueryClient } from '@grip/utils/test-utils';
import { gripApi, GripApiError } from '@grip/services/api.grip';
import type { GripBrowserIdentity, GripCheckView } from '@core/types/grip-hosted';
import { HostedBoardPage } from './HostedBoardPage';
import { gripKeys } from './queries';

vi.mock('@grip/services/api.grip', async (importActual) => ({
  ...(await importActual<typeof import('@grip/services/api.grip')>()),
  gripApi: { session: vi.fn(), view: vi.fn(), submit: vi.fn(), logout: vi.fn() },
}));

const identity: GripBrowserIdentity = {
  githubId: '123',
  login: 'developer',
  csrfToken: 'csrf',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};
const view: GripCheckView = {
  checkId: 'a'.repeat(43),
  state: 'READY',
  bindingDigest: 'digest',
  policyVersion: 'hosted-v1',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  passValidUntil: new Date(Date.now() + 86_400_000).toISOString(),
  manifest: {
    repository: 'Karazin-UniVerse/uni-verse',
    updates: [
      {
        localRef: 'refs/heads/feature',
        localOid: 'a'.repeat(40),
        remoteRef: 'refs/heads/feature',
        remoteOid: 'b'.repeat(40),
      },
      {
        localRef: '(delete)',
        localOid: '0'.repeat(40),
        remoteRef: 'refs/heads/old',
        remoteOid: 'c'.repeat(40),
      },
    ],
    policyVersion: 'hosted-v1',
    diffDigest: 'digest',
  },
  diff: '<script>private diff</script>',
  truncated: false,
  board: {
    revision: 'revision',
    summary: 'Private board',
    nodes: [],
    edges: [],
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index + 1}`,
      on: 'handler',
      kind: 'how it works',
      question: `Explain ${index + 1}`,
    })),
  },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const rendered = render(
    withLanguage(withQueryClient(<HostedBoardPage checkId={view.checkId} />, client)),
  );

  return { ...rendered, client };
}

describe('HostedBoardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('universe-lang', 'uk');
    vi.mocked(gripApi.session).mockResolvedValue(identity);
    vi.mocked(gripApi.view).mockResolvedValue(view);
  });

  it.each([
    'CREATED',
    'GENERATING',
    'GRADING',
    'PASSED',
    'FAILED',
    'EXPIRED',
    'TECHNICAL_ERROR',
  ] as const)('should render %s without permitting another submission', async (state) => {
    vi.mocked(gripApi.view).mockResolvedValue({
      ...view,
      state,
      score: state === 'PASSED' ? 70 : undefined,
    });
    renderPage();

    await screen.findByText('Private board');
    expect(
      screen.getByRole('button', {
        name: state === 'GRADING' ? 'Оцінювання відповідей…' : 'Перевірити відповіді',
      }),
    ).toBeDisabled();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>private diff</script>')).toBeInTheDocument();
  });

  it('should show exact ref updates including deletions before the defense', async () => {
    renderPage();
    await screen.findByText('Private board');

    expect(screen.getByText('Karazin-UniVerse/uni-verse')).toBeInTheDocument();
    expect(screen.getAllByText(/refs\/heads\/feature/).length).toBeGreaterThan(0);
    expect(screen.getByText(/refs\/heads\/old/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp('0'.repeat(40)))).toBeInTheDocument();
  });

  it('should retain answers and the same request intent when a submission response is lost', async () => {
    const user = userEvent.setup();

    vi.mocked(gripApi.submit).mockRejectedValue(new TypeError('Network unavailable'));
    renderPage();
    const fields = await screen.findAllByRole('textbox');

    for (const field of fields) await user.type(field, 'My explanation');

    await user.click(screen.getByRole('button', { name: 'Перевірити відповіді' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Перевірити відповіді' }));
    await waitFor(() => expect(gripApi.submit).toHaveBeenCalledTimes(2));
    expect(vi.mocked(gripApi.submit).mock.calls[0][0].input.requestId).toBe(
      vi.mocked(gripApi.submit).mock.calls[1][0].input.requestId,
    );
    expect(fields[0]).toHaveValue('My explanation');
  });

  it.each([429, 502])(
    'should retain drafts during a recoverable session refetch failure (%s)',
    async (status) => {
      const user = userEvent.setup();
      const { client } = renderPage();

      await user.type((await screen.findAllByRole('textbox'))[0], 'Keep this draft');
      vi.mocked(gripApi.session).mockRejectedValueOnce(new GripApiError(status));
      await act(async () => {
        await client.invalidateQueries({ queryKey: gripKeys.session() });
      });

      await waitFor(() => expect(client.getQueryState(gripKeys.session())?.status).toBe('error'));

      expect(screen.getByDisplayValue('Keep this draft')).toBeInTheDocument();
    },
  );

  it('should keep draft fields mounted while a board refresh is temporarily unavailable', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();

    await user.type((await screen.findAllByRole('textbox'))[0], 'Keep this private draft');
    vi.mocked(gripApi.view).mockRejectedValueOnce(new GripApiError(502));
    await act(async () => {
      await client.invalidateQueries({ queryKey: gripKeys.check(identity.githubId, view.checkId) });
    });
    await waitFor(() =>
      expect(client.getQueryState(gripKeys.check(identity.githubId, view.checkId))?.status).toBe(
        'error',
      ),
    );
    expect(screen.getByDisplayValue('Keep this private draft')).toBeInTheDocument();
  });

  it('should recover an initial board-read failure through a localized retry action', async () => {
    const user = userEvent.setup();

    vi.mocked(gripApi.view).mockRejectedValueOnce(new GripApiError(502));
    renderPage();
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Повторити' }));

    expect(await screen.findByText('Private board')).toBeInTheDocument();
  });

  it('should offer retry rather than GitHub login when the first session read fails technically', async () => {
    const user = userEvent.setup();

    vi.mocked(gripApi.session).mockRejectedValueOnce(new GripApiError(502));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Повторити' }));
    expect(await screen.findByText('Private board')).toBeInTheDocument();
  });

  it('should not allow manual retry of an active read throttle', async () => {
    vi.mocked(gripApi.view).mockRejectedValue(new GripApiError(429, Date.now() + 30_000));
    renderPage();
    await screen.findByRole('alert');

    expect(screen.queryByRole('button', { name: 'Повторити' })).not.toBeInTheDocument();
  });

  it('should discard previous-account private queries and drafts when identity changes', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();

    await user.type((await screen.findAllByRole('textbox'))[0], 'Private draft');
    vi.mocked(gripApi.session).mockResolvedValue({
      ...identity,
      githubId: '456',
      csrfToken: 'new-csrf',
    });
    vi.mocked(gripApi.view).mockRejectedValue(new Error('Not owner'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: gripKeys.session() });
    });
    await screen.findByRole('alert');

    expect(screen.queryByDisplayValue('Private draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Private board')).not.toBeInTheDocument();
    expect(client.getQueryData(gripKeys.check('123', view.checkId))).toBeUndefined();
  });

  it('should hide private content immediately while logout is still pending', async () => {
    const user = userEvent.setup();

    vi.mocked(gripApi.logout).mockReturnValue(new Promise(() => {}));
    renderPage();
    await screen.findByText('Private board');
    await user.click(screen.getByRole('button', { name: 'Вийти з GitHub-сесії' }));

    expect(screen.queryByText('Private board')).not.toBeInTheDocument();
    expect(screen.queryByText('<script>private diff</script>')).not.toBeInTheDocument();
  });

  it('should remove drafts when navigating to a different check owned by the same account', async () => {
    const user = userEvent.setup();
    const { rerender, client } = renderPage();

    await user.type((await screen.findAllByRole('textbox'))[0], 'Only for the first check');
    rerender(withLanguage(withQueryClient(<HostedBoardPage checkId={'b'.repeat(43)} />, client)));
    await screen.findAllByRole('textbox');

    expect(screen.queryByDisplayValue('Only for the first check')).not.toBeInTheDocument();
  });

  it('should remove submitted answers from the mutation cache on account change even while pending', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();

    vi.mocked(gripApi.submit).mockReturnValue(new Promise(() => {}));

    for (const field of await screen.findAllByRole('textbox'))
      await user.type(field, 'Private submitted answer');

    await user.click(screen.getByRole('button', { name: 'Перевірити відповіді' }));
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.variables),
      ),
    ).toContain('Private submitted answer');
    vi.mocked(gripApi.session).mockResolvedValue({ ...identity, githubId: '456' });
    vi.mocked(gripApi.view).mockRejectedValue(new Error('Not owner'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: gripKeys.session() });
    });
    await screen.findByRole('alert');

    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.variables),
      ),
    ).not.toContain('Private submitted answer');
  });

  it('should clear answers immediately when the server revokes the authenticated session', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();

    await user.type((await screen.findAllByRole('textbox'))[0], 'Private revoked draft');
    vi.mocked(gripApi.session).mockRejectedValueOnce(new GripApiError(401));
    await act(async () => {
      await client.invalidateQueries({ queryKey: gripKeys.session() });
    });
    await screen.findByRole('alert');

    expect(screen.queryByDisplayValue('Private revoked draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Private board')).not.toBeInTheDocument();
  });

  it('should hide and clear private data when another tab changes the GitHub session', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();

    await user.type((await screen.findAllByRole('textbox'))[0], 'Cross-tab private draft');
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'grip-session-change', newValue: 'signal' }),
      );
    });

    expect(screen.queryByDisplayValue('Cross-tab private draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Private board')).not.toBeInTheDocument();
    expect(client.getQueryData(gripKeys.check(identity.githubId, view.checkId))).toBeUndefined();
  });
});

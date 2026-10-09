import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrAge,
  formatCommentsCount,
  analyzePrReviewStatus,
  formatPrLine,
  chunkLines,
  getEmbedLength,
  partitionFieldsIntoEmbeds,
  partitionEmbedsIntoMessages,
  groupPullRequests,
  buildReminderDiscordPayload,
  fetchPullRequestsGraphQL,
  fetchOpenPullRequests,
  fetchPullRequestDetails,
  buildPullRequestPayload,
} from '../discord-pr-notify.mjs';

test('formatPrAge calculates friendly Ukrainian time strings', () => {
  const now = Date.now();
  const halfHourAgo = new Date(now - 30 * 60 * 1000).toISOString();
  const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(formatPrAge(halfHourAgo), '< 1г');
  assert.equal(formatPrAge(fiveHoursAgo), '5г');
  assert.equal(formatPrAge(threeDaysAgo), '3д');
});

test('formatCommentsCount formats Ukrainian plurals correctly', () => {
  assert.equal(formatCommentsCount(1), '1 відкритий коментар');
  assert.equal(formatCommentsCount(2), '2 відкритих коментарі');
  assert.equal(formatCommentsCount(4), '4 відкритих коментарі');
  assert.equal(formatCommentsCount(5), '5 відкритих коментарів');
  assert.equal(formatCommentsCount(11), '11 відкритих коментарів');
  assert.equal(formatCommentsCount(21), '21 відкритий коментар');
  assert.equal(formatCommentsCount(24), '24 відкритих коментарі');
});

test('analyzePrReviewStatus flags ACTION_REQUIRED when unresolved thread has last comment from reviewer', () => {
  const pr = {
    user: { login: 'brodion-230' },
    reviewDecision: 'REVIEW_REQUIRED',
    reviewThreads: [
      {
        isResolved: false,
        isOutdated: false,
        comments: [{ author: { login: 'brodion-230' } }, { author: { login: 'iamredl-lab' } }],
      },
    ],
    requested_reviewers: [],
  };

  const status = analyzePrReviewStatus(pr, { 'iamredl-lab': '493400648851914753' });

  assert.equal(status.statusType, 'ACTION_REQUIRED');
  assert.equal(status.pendingAuthorThreadsCount, 1);
  assert.equal(status.lastReviewerLogin, 'iamredl-lab');
  assert.match(status.reviewStr, /Потрібні правки/);
  assert.match(status.reviewStr, /1 відкритий коментар/);
  assert.match(status.reviewStr, /<@493400648851914753>/);
});

test('analyzePrReviewStatus flags WAITING_FOR_REVIEWER when author replied to all unresolved threads', () => {
  const pr = {
    user: { login: 'brodion-230' },
    reviewDecision: 'REVIEW_REQUIRED',
    reviewThreads: [
      {
        isResolved: false,
        isOutdated: false,
        comments: [{ author: { login: 'iamredl-lab' } }, { author: { login: 'brodion-230' } }],
      },
    ],
    requested_reviewers: [],
  };

  const status = analyzePrReviewStatus(pr, {});

  assert.equal(status.statusType, 'WAITING_FOR_REVIEWER');
  assert.match(status.reviewStr, /Автор відповів/);
});

test('analyzePrReviewStatus ignores resolved and outdated threads', () => {
  const pr = {
    user: { login: 'brodion-230' },
    reviewDecision: 'REVIEW_REQUIRED',
    reviewThreads: [
      {
        isResolved: true,
        isOutdated: false,
        comments: [{ author: { login: 'iamredl-lab' } }],
      },
      {
        isResolved: false,
        isOutdated: true,
        comments: [{ author: { login: 'iamredl-lab' } }],
      },
    ],
    requested_reviewers: [{ login: 'iamredl-lab' }],
  };

  const status = analyzePrReviewStatus(pr, {});

  assert.equal(status.statusType, 'NEEDS_REVIEW');
  assert.match(status.reviewStr, /Очікує рев'ю/);
});

test('analyzePrReviewStatus flags ACTION_REQUIRED when reviewDecision is CHANGES_REQUESTED', () => {
  const pr = {
    user: { login: 'brodion-230' },
    reviewDecision: 'CHANGES_REQUESTED',
    reviewThreads: [],
    requested_reviewers: [],
  };

  const status = analyzePrReviewStatus(pr, {});

  assert.equal(status.statusType, 'ACTION_REQUIRED');
  assert.match(status.reviewStr, /Потрібні правки/);
});

test('analyzePrReviewStatus flags APPROVED when reviewDecision is APPROVED and no pending threads', () => {
  const pr = {
    user: { login: 'brodion-230' },
    reviewDecision: 'APPROVED',
    reviewThreads: [],
    requested_reviewers: [],
  };

  const status = analyzePrReviewStatus(pr, {});

  assert.equal(status.statusType, 'APPROVED');
  assert.match(status.reviewStr, /Схвалено/);
});

test('formatPrLine truncates oversized titles and bounds total line length', () => {
  const giantTitle = 'A'.repeat(500);
  const pr = {
    number: 99,
    title: giantTitle,
    html_url: 'https://github.com/repo/pull/99',
    head: { ref: 'feat/test' },
    base: { ref: 'develop' },
    created_at: new Date().toISOString(),
    additions: 100,
    deletions: 20,
    requested_reviewers: [{ login: 'reviewer1' }],
  };

  const line = formatPrLine(pr, {});

  assert.ok(line.length <= 900, `Line length ${line.length} must be <= 900`);
  assert.match(line, /#99/);
  assert.match(line, /\(\+100\/-20\)/);
  assert.match(line, /reviewer1/);
});

test('chunkLines splits lines correctly under maxChunkLength', () => {
  const lines = [
    'Line 1: ' + 'A'.repeat(300),
    'Line 2: ' + 'B'.repeat(300),
    'Line 3: ' + 'C'.repeat(300),
  ];
  const chunks = chunkLines(lines, 500);

  assert.equal(chunks.length, 3);

  for (const chunk of chunks) {
    assert.ok(chunk.length <= 500);
  }
});

test('getEmbedLength calculates total characters in an embed correctly', () => {
  const embed = {
    title: 'Title',
    description: 'Desc',
    footer: { text: 'Footer' },
    fields: [
      { name: 'F1', value: 'V1' },
      { name: 'F2', value: 'V2' },
    ],
  };

  assert.equal(getEmbedLength(embed), 23);
});

test('groupPullRequests filters drafts, segregates dependabot and groups by author', () => {
  const mockPrs = [
    {
      number: 101,
      title: 'feat: add buttons',
      draft: false,
      user: { login: 'brodion-230' },
      head: { ref: 'feat/btn' },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
      requested_reviewers: [{ login: 'Kostik565' }],
    },
    {
      number: 102,
      title: 'wip: work in progress',
      draft: true,
      user: { login: 'brodion-230' },
      head: { ref: 'draft-feature' },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
    },
    {
      number: 103,
      title: 'fix: navbar styling',
      draft: false,
      user: { login: 'Kostik565' },
      head: { ref: 'fix/nav' },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
      requested_reviewers: [],
    },
    {
      number: 104,
      title: 'bump: vite from 5 to 6',
      draft: false,
      user: { login: 'dependabot[bot]' },
      head: { ref: 'dependabot/npm_and_yarn/vite' },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
    },
  ];

  const result = groupPullRequests(mockPrs);

  assert.equal(result.totalCount, 3);
  assert.equal(result.authorPrs.get('brodion-230')?.length, 1);
  assert.equal(result.authorPrs.get('brodion-230')?.[0].number, 101);
  assert.equal(result.authorPrs.get('Kostik565')?.length, 1);
  assert.equal(result.authorPrs.get('Kostik565')?.[0].number, 103);
  assert.equal(result.dependabotPrs.length, 1);
  assert.equal(result.dependabotPrs[0].number, 104);
  assert.equal(result.authorPrs.has('dependabot[bot]'), false);
});

test('buildReminderDiscordPayload returns null when no open PRs exist', () => {
  const payload = buildReminderDiscordPayload({
    authorPrs: new Map(),
    dependabotPrs: [],
    repoName: 'Karazin-UniVerse/uni-verse',
    discordUsers: {},
  });

  assert.equal(payload, null);
});

test('buildReminderDiscordPayload formats valid Discord payload with action required warning', () => {
  const discordUsers = {
    'brodion-230': '1412361252935565382',
    Kostik565: '1055920927306694697',
  };

  const authorPrs = new Map([
    [
      'brodion-230',
      [
        {
          number: 101,
          title: 'feat: add buttons',
          html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/101',
          head: { ref: 'feat/btn' },
          base: { ref: 'develop' },
          created_at: new Date().toISOString(),
          requested_reviewers: [],
          reviewThreads: [
            {
              isResolved: false,
              isOutdated: false,
              comments: [{ author: { login: 'Kostik565' } }],
            },
          ],
          additions: 45,
          deletions: 12,
        },
      ],
    ],
  ]);

  const dependabotPrs = [
    {
      number: 104,
      title: 'bump vite',
      html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/104',
      head: { ref: 'dependabot/vite' },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
    },
  ];

  const messages = buildReminderDiscordPayload({
    authorPrs,
    dependabotPrs,
    repoName: 'Karazin-UniVerse/uni-verse',
    discordUsers,
  });

  assert.ok(Array.isArray(messages));
  assert.equal(messages.length, 1);

  const payload = messages[0];

  assert.match(payload.content, /незарезолвані коментарі/);
  assert.match(payload.content, /<@1412361252935565382>/);

  const embed = payload.embeds[0];

  assert.match(embed.title, /Щоденний дайджест Pull Requests/i);

  const authorField = embed.fields.find((field) => field.name.includes('brodion-230'));

  assert.ok(authorField);
  assert.match(authorField.value, /Потрібні правки/);
  assert.match(authorField.value, /<@1055920927306694697>/);
});

test('buildReminderDiscordPayload splits Dependabot into multiple fields when exceeding 1000 chars without dropping links', () => {
  const dependabotPrs = [];

  for (let i = 1; i <= 25; i++) {
    dependabotPrs.push({
      number: 300 + i,
      title: `bump package-${i} from 1.0.0 to 1.1.0 in /some/deep/subpath`,
      html_url: `https://github.com/repo/pull/${300 + i}`,
      base: { ref: 'develop' },
    });
  }

  const messages = buildReminderDiscordPayload({
    authorPrs: new Map(),
    dependabotPrs,
    repoName: 'test/repo',
    discordUsers: {},
  });

  assert.ok(Array.isArray(messages));

  const embed = messages[0].embeds[0];
  const depFields = embed.fields.filter((field) => field.name.includes('Dependabot'));

  assert.ok(depFields.length > 1, 'Should split Dependabot across multiple fields');

  for (const field of depFields) {
    assert.ok(field.value.length <= 1024);
  }
});

test('partitionFieldsIntoEmbeds partitions fields across multiple embeds when exceeding 25 fields', () => {
  const fields = [];

  for (let i = 1; i <= 30; i++) {
    fields.push({
      name: `Author ${i}`,
      value: `• [#${i} Test PR](url) ➔ develop`,
      inline: false,
    });
  }

  const embeds = partitionFieldsIntoEmbeds({
    fields,
    repoName: 'test/repo',
    totalPrCount: 30,
    humanPrCount: 30,
    dependabotCount: 0,
  });

  assert.ok(embeds.length >= 2, 'Must split across embeds when fields count > 25');

  for (const embed of embeds) {
    assert.ok(embed.fields.length <= 25, 'Each embed must have <= 25 fields');
  }
});

test('partitionEmbedsIntoMessages splits embeds across multiple messages when exceeding 5500 chars or 10 embeds', () => {
  const embeds = [];

  for (let i = 1; i <= 12; i++) {
    embeds.push({
      title: `Embed ${i}`,
      description: 'A'.repeat(500),
      fields: [{ name: 'Field', value: 'B'.repeat(50) }],
    });
  }

  const messages = partitionEmbedsIntoMessages(embeds, 'Main content announcement');

  assert.ok(messages.length >= 2, 'Must split into multiple messages');

  for (const message of messages) {
    assert.ok(message.embeds.length <= 10, 'Each message must have <= 10 embeds');

    const totalChars =
      (message.content?.length || 0) +
      message.embeds.reduce((sum, embed) => sum + getEmbedLength(embed), 0);

    assert.ok(totalChars <= 5500);
  }
});

test('fetchPullRequestsGraphQL parses GraphQL response into normalized PR objects', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        repository: {
          pullRequests: {
            nodes: [
              {
                number: 10,
                title: 'GraphQL PR',
                url: 'https://github.com/repo/pull/10',
                isDraft: false,
                createdAt: new Date().toISOString(),
                additions: 50,
                deletions: 10,
                baseRefName: 'develop',
                headRefName: 'feat/test',
                author: { login: 'alice' },
                reviewDecision: 'CHANGES_REQUESTED',
                reviewRequests: { nodes: [] },
                reviewThreads: {
                  nodes: [
                    {
                      isResolved: false,
                      isOutdated: false,
                      comments: { nodes: [{ author: { login: 'bob' } }] },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    }),
  });

  try {
    const prs = await fetchPullRequestsGraphQL({ repo: 'owner/repo', token: 'token' });

    assert.ok(Array.isArray(prs));
    assert.equal(prs.length, 1);
    assert.equal(prs[0].number, 10);
    assert.equal(prs[0].user.login, 'alice');
    assert.equal(prs[0].reviewDecision, 'CHANGES_REQUESTED');
    assert.equal(prs[0].reviewThreads.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchPullRequestsGraphQL paginates pullRequests across multiple pages', async () => {
  const originalFetch = globalThis.fetch;
  let callIndex = 0;

  globalThis.fetch = async () => {
    callIndex++;

    if (callIndex === 1) {
      return {
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                pageInfo: { hasNextPage: true, endCursor: 'cursor-page-1' },
                nodes: [
                  {
                    number: 101,
                    title: 'PR Page 1',
                    url: 'https://github.com/repo/pull/101',
                    isDraft: false,
                    createdAt: new Date().toISOString(),
                    additions: 10,
                    deletions: 5,
                    baseRefName: 'develop',
                    headRefName: 'feat/p1',
                    author: { login: 'alice' },
                    reviewDecision: 'APPROVED',
                    reviewRequests: { nodes: [] },
                    reviewThreads: {
                      pageInfo: { hasNextPage: false, endCursor: null },
                      nodes: [],
                    },
                  },
                ],
              },
            },
          },
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  number: 102,
                  title: 'PR Page 2',
                  url: 'https://github.com/repo/pull/102',
                  isDraft: false,
                  createdAt: new Date().toISOString(),
                  additions: 20,
                  deletions: 10,
                  baseRefName: 'develop',
                  headRefName: 'feat/p2',
                  author: { login: 'bob' },
                  reviewDecision: null,
                  reviewRequests: { nodes: [] },
                  reviewThreads: {
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [],
                  },
                },
              ],
            },
          },
        },
      }),
    };
  };

  try {
    const prs = await fetchPullRequestsGraphQL({ repo: 'owner/repo', token: 'token' });

    assert.ok(Array.isArray(prs));
    assert.equal(prs.length, 2);
    assert.equal(prs[0].number, 101);
    assert.equal(prs[1].number, 102);
    assert.equal(callIndex, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchPullRequestsGraphQL paginates and aggregates reviewThreads across pages for a PR', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);

    calls.push(body);

    if (calls.length === 1) {
      return {
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    number: 201,
                    title: 'PR with many threads',
                    url: 'https://github.com/repo/pull/201',
                    isDraft: false,
                    createdAt: new Date().toISOString(),
                    additions: 100,
                    deletions: 20,
                    baseRefName: 'develop',
                    headRefName: 'feat/threads',
                    author: { login: 'alice' },
                    reviewDecision: 'CHANGES_REQUESTED',
                    reviewRequests: { nodes: [] },
                    reviewThreads: {
                      pageInfo: { hasNextPage: true, endCursor: 'thread-cur-1' },
                      nodes: [
                        {
                          isResolved: false,
                          isOutdated: false,
                          comments: { nodes: [{ author: { login: 'bob' } }] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    isResolved: false,
                    isOutdated: false,
                    comments: { nodes: [{ author: { login: 'charlie' } }] },
                  },
                ],
              },
            },
          },
        },
      }),
    };
  };

  try {
    const prs = await fetchPullRequestsGraphQL({ repo: 'owner/repo', token: 'token' });

    assert.ok(Array.isArray(prs));
    assert.equal(prs.length, 1);
    assert.equal(prs[0].reviewThreads.length, 2);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].variables.number, 201);
    assert.equal(calls[1].variables.cursor, 'thread-cur-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchOpenPullRequests follows rel="next" Link headers across pages', async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount++;

    if (callCount === 1) {
      return {
        ok: true,
        headers: new Headers({
          link: '<https://api.github.com/repos/test/repo/pulls?page=2>; rel="next"',
        }),
        json: async () => [{ number: 1, title: 'PR 1' }],
      };
    }

    return {
      ok: true,
      headers: new Headers(),
      json: async () => [{ number: 2, title: 'PR 2' }],
    };
  };

  try {
    const prs = await fetchOpenPullRequests({ repo: 'test/repo', token: 'fake' });

    assert.equal(prs.length, 2);
    assert.equal(prs[0].number, 1);
    assert.equal(prs[1].number, 2);
    assert.equal(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchPullRequestDetails retrieves single PR details', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ number: 42, additions: 150, deletions: 30 }),
  });

  try {
    const details = await fetchPullRequestDetails({
      repo: 'test/repo',
      prNumber: 42,
      token: 'fake',
    });

    assert.equal(details.number, 42);
    assert.equal(details.additions, 150);
    assert.equal(details.deletions, 30);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchPullRequestDetails returns null and warns on non-2xx response', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    text: async () => 'Not Found',
  });

  try {
    const details = await fetchPullRequestDetails({
      repo: 'test/repo',
      prNumber: 999,
      token: 'fake',
    });

    assert.equal(details, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('buildPullRequestPayload formats open PR with reviewer mentions when requested_reviewers is populated', () => {
  const users = {
    Skyzary: '1283760288402898964',
    Kostik565: '1055920927306694697',
  };

  const pr = {
    number: 164,
    title: 'feat: reviewers automation',
    html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/164',
    body: 'Automate PR reviewers assignment',
    head: { ref: 'feat/reviewers' },
    base: { ref: 'develop' },
    user: { login: 'brodion-230' },
    requested_reviewers: [{ login: 'Skyzary' }, { login: 'Kostik565' }],
    additions: 120,
    deletions: 15,
    changed_files: 3,
  };

  const payload = buildPullRequestPayload({
    pr,
    action: 'opened',
    repository: { full_name: 'Karazin-UniVerse/uni-verse' },
    users,
  });

  assert.ok(payload);
  assert.match(payload.content, /🔔 Запит на рев'ю:/);
  assert.match(payload.content, /<@1283760288402898964>/);
  assert.match(payload.content, /<@1055920927306694697>/);
  assert.equal(payload.embeds[0].title, 'PR #164: feat: reviewers automation');
});

test('buildPullRequestPayload falls back to @here when requested_reviewers is empty', () => {
  const pr = {
    number: 165,
    title: 'chore: cleanup',
    html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/165',
    head: { ref: 'chore/cleanup' },
    base: { ref: 'develop' },
    user: { login: 'brodion-230' },
    requested_reviewers: [],
  };

  const payload = buildPullRequestPayload({
    pr,
    action: 'opened',
    repository: { full_name: 'Karazin-UniVerse/uni-verse' },
    users: {},
  });

  assert.ok(payload);
  assert.match(payload.content, /@here новий PR потребує перегляду!/);
});

test('buildPullRequestPayload formats merged and closed without merge events', () => {
  const prMerged = {
    number: 166,
    title: 'feat: done',
    html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/166',
    head: { ref: 'feat/done' },
    base: { ref: 'develop' },
    merged: true,
  };

  const mergedPayload = buildPullRequestPayload({
    pr: prMerged,
    action: 'closed',
    repository: { full_name: 'Karazin-UniVerse/uni-verse' },
    users: {},
  });

  assert.ok(mergedPayload);
  assert.match(mergedPayload.content, /успішно вмерджено в `develop`/);

  const prClosed = {
    number: 167,
    title: 'feat: abandoned',
    html_url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/167',
    head: { ref: 'feat/abandoned' },
    base: { ref: 'develop' },
    merged: false,
  };

  const closedPayload = buildPullRequestPayload({
    pr: prClosed,
    action: 'closed',
    repository: { full_name: 'Karazin-UniVerse/uni-verse' },
    users: {},
  });

  assert.ok(closedPayload);
  assert.match(closedPayload.content, /закрито без мержа/);
});

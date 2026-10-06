import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrAge,
  formatPrLine,
  chunkLines,
  partitionFieldsIntoEmbeds,
  groupPullRequests,
  buildReminderDiscordPayload,
  fetchOpenPullRequests,
  fetchPullRequestDetails,
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

  // Drafts must be skipped
  assert.equal(result.totalCount, 3);
  assert.equal(result.authorPrs.get('brodion-230')?.length, 1);
  assert.equal(result.authorPrs.get('brodion-230')?.[0].number, 101);
  assert.equal(result.authorPrs.get('Kostik565')?.length, 1);
  assert.equal(result.authorPrs.get('Kostik565')?.[0].number, 103);

  // Dependabot must be segregated
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

test('buildReminderDiscordPayload formats valid Discord payload with author fields and dependabot section', () => {
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
          requested_reviewers: [{ login: 'Kostik565' }],
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

  const payload = buildReminderDiscordPayload({
    authorPrs,
    dependabotPrs,
    repoName: 'Karazin-UniVerse/uni-verse',
    discordUsers,
  });

  assert.ok(payload);
  assert.ok(payload.embeds);
  assert.equal(payload.embeds.length, 1);

  const embed = payload.embeds[0];

  assert.match(embed.title, /Щоденний дайджест Pull Requests/i);

  // Author field
  const authorField = embed.fields.find((f) => f.name.includes('brodion-230'));

  assert.ok(authorField);
  assert.match(authorField.name, /<@1412361252935565382>/);
  assert.match(authorField.value, /#101/);
  assert.match(authorField.value, /feat: add buttons/);
  assert.match(authorField.value, /<@1055920927306694697>/);
  assert.match(authorField.value, /\(\+45\/-12\)/);

  // Dependabot field
  const dependabotField = embed.fields.find((f) => f.name.includes('Dependabot'));

  assert.ok(dependabotField);
  assert.match(dependabotField.value, /#104/);
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

  const payload = buildReminderDiscordPayload({
    authorPrs: new Map(),
    dependabotPrs,
    repoName: 'test/repo',
    discordUsers: {},
  });

  assert.ok(payload);
  const embed = payload.embeds[0];
  const depFields = embed.fields.filter((f) => f.name.includes('Dependabot'));

  assert.ok(depFields.length > 1, 'Should split Dependabot across multiple fields');

  for (const f of depFields) {
    assert.ok(f.value.length <= 1024);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrAge,
  groupPullRequests,
  buildReminderDiscordPayload,
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
  assert.match(authorField.value, /<@1055920927306694697>/); // Reviewer mentioned

  // Dependabot field
  const dependabotField = embed.fields.find((f) => f.name.includes('Dependabot'));

  assert.ok(dependabotField);
  assert.match(dependabotField.value, /#104/);
});

test('buildReminderDiscordPayload splits author fields when lines exceed 1000 chars', () => {
  const longTitle = 'A'.repeat(150);
  const prs = [];

  for (let i = 1; i <= 15; i++) {
    prs.push({
      number: 200 + i,
      title: `${longTitle} #${i}`,
      html_url: `https://github.com/Karazin-UniVerse/uni-verse/pull/${200 + i}`,
      head: { ref: `feat/long-${i}` },
      base: { ref: 'develop' },
      created_at: new Date().toISOString(),
      requested_reviewers: [],
    });
  }

  const authorPrs = new Map([['alice', prs]]);
  const payload = buildReminderDiscordPayload({
    authorPrs,
    dependabotPrs: [],
    repoName: 'test/repo',
    discordUsers: {},
  });

  assert.ok(payload);
  const fields = payload.embeds[0].fields;

  assert.ok(fields.length > 1, 'Should split into multiple fields for long content');

  for (const f of fields) {
    assert.ok(f.value.length <= 1024, `Field value length ${f.value.length} must be <= 1024`);
  }
});

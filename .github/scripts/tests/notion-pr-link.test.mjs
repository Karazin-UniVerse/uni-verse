import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNotionPageId,
  extractTaskKey,
  extractTaskInfo,
  formatPrItem,
  mergePrRichText,
  determineStatusTransition,
  resolveMatchingTask,
} from '../notion-pr-link.mjs';

test('extractNotionPageId extracts 32-hex UUID from various Notion URL formats', () => {
  const url1 =
    'https://www.notion.so/Add-integration-for-Notion-to-link-task-with-Github-PR-3f1f8cf15c6180b5897cd9aa240d8e0c';
  const url2 =
    'https://app.notion.com/p/Add-integration-for-Notion-3f1f8cf15c6180b5897cd9aa240d8e0c';
  const url3 = 'https://notion.so/3f1f8cf15c6180b5897cd9aa240d8e0c?pvs=4';
  const hyphenated = '3f1f8cf1-5c61-80b5-897c-d9aa240d8e0c';

  assert.equal(extractNotionPageId(url1), '3f1f8cf15c6180b5897cd9aa240d8e0c');
  assert.equal(extractNotionPageId(url2), '3f1f8cf15c6180b5897cd9aa240d8e0c');
  assert.equal(extractNotionPageId(url3), '3f1f8cf15c6180b5897cd9aa240d8e0c');
  assert.equal(extractNotionPageId(hyphenated), '3f1f8cf15c6180b5897cd9aa240d8e0c');
  assert.equal(extractNotionPageId('https://github.com/pull/199'), null);
  assert.equal(extractNotionPageId(''), null);
  assert.equal(extractNotionPageId(null), null);
});

test('extractTaskKey extracts project prefix and task ID number', () => {
  assert.deepEqual(extractTaskKey('feature/RS-148-notion-pr-link'), {
    prefix: 'RS',
    taskId: 148,
    ticketCode: 'RS-148',
  });

  assert.deepEqual(extractTaskKey('fix/OP-102_login_error'), {
    prefix: 'OP',
    taskId: 102,
    ticketCode: 'OP-102',
  });

  assert.deepEqual(extractTaskKey('[UNID-142] Reconsider menu bar'), {
    prefix: 'UNID',
    taskId: 142,
    ticketCode: 'UNID-142',
  });

  assert.deepEqual(extractTaskKey('RS-140: remind PR authors'), {
    prefix: 'RS',
    taskId: 140,
    ticketCode: 'RS-140',
  });

  assert.equal(extractTaskKey('main'), null);
  assert.equal(extractTaskKey('develop'), null);
  assert.equal(extractTaskKey(''), null);
});

test('extractTaskInfo prioritizes Notion URL from body, then branch and title keys', () => {
  const resultWithUrl = extractTaskInfo({
    branch: 'feature/RS-148-test',
    title: 'RS-148: Title',
    body: '## Notion Task\nLink: https://notion.so/Task-3f1f8cf15c6180b5897cd9aa240d8e0c',
  });

  assert.equal(resultWithUrl.pageId, '3f1f8cf15c6180b5897cd9aa240d8e0c');
  assert.equal(resultWithUrl.ticketCode, 'RS-148');
  assert.equal(resultWithUrl.taskId, 148);

  const resultBranchOnly = extractTaskInfo({
    branch: 'feature/OP-102-test',
    title: 'Some general title',
    body: 'No link here',
  });

  assert.equal(resultBranchOnly.pageId, null);
  assert.equal(resultBranchOnly.ticketCode, 'OP-102');
  assert.equal(resultBranchOnly.taskId, 102);
});

test('formatPrItem creates formatted Notion rich_text object with correct status label and color', () => {
  const openItem = formatPrItem({
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'open',
    isMerged: false,
    isDraft: false,
  });

  assert.equal(openItem.text.content, '#148 (Open)');
  assert.equal(openItem.text.link.url, 'https://github.com/Karazin-UniVerse/uni-verse/pull/148');
  assert.equal(openItem.annotations.bold, true);
  assert.equal(openItem.annotations.color, 'default');

  const mergedItem = formatPrItem({
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'closed',
    isMerged: true,
    isDraft: false,
  });

  assert.equal(mergedItem.text.content, '#148 (Merged)');
  assert.equal(mergedItem.annotations.color, 'green');

  const draftItem = formatPrItem({
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'open',
    isMerged: false,
    isDraft: true,
  });

  assert.equal(draftItem.text.content, '#148 (Draft)');
});

test('mergePrRichText adds first PR cleanly', () => {
  const result = mergePrRichText({
    existingRichText: [],
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'open',
    isMerged: false,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].text.content, '#148 (Open)');
});

test('mergePrRichText updates existing PR in place when state changes to merged', () => {
  const initial = [
    {
      type: 'text',
      text: {
        content: '#148 (Open)',
        link: { url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148' },
      },
    },
  ];

  const updated = mergePrRichText({
    existingRichText: initial,
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'closed',
    isMerged: true,
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0].text.content, '#148 (Merged)');
  assert.equal(updated[0].annotations.color, 'green');
});

test('mergePrRichText handles multiple PRs without overwriting previous links', () => {
  const initial = [
    {
      type: 'text',
      text: {
        content: '#140 (Merged)',
        link: { url: 'https://github.com/Karazin-UniVerse/uni-verse/pull/140' },
      },
    },
  ];

  const updated = mergePrRichText({
    existingRichText: initial,
    prNumber: 148,
    prUrl: 'https://github.com/Karazin-UniVerse/uni-verse/pull/148',
    state: 'open',
    isMerged: false,
  });

  // Expect: PR 140, separator, PR 148
  assert.equal(updated.length, 3);
  assert.equal(updated[0].text.content, '#140 (Merged)');
  assert.equal(updated[1].text.content, ', ');
  assert.equal(updated[2].text.content, '#148 (Open)');
});

test('determineStatusTransition computes valid status changes', () => {
  // Opening non-draft PR moves 'Not Started' to 'In Review'
  assert.equal(
    determineStatusTransition({ currentStatus: 'Not Started', action: 'opened', isDraft: false }),
    'In Review',
  );

  // If already 'In Progress', does not force 'In Review'
  assert.equal(
    determineStatusTransition({ currentStatus: 'In Progress', action: 'opened', isDraft: false }),
    null,
  );

  // Draft PR does not trigger status change
  assert.equal(
    determineStatusTransition({ currentStatus: 'Not Started', action: 'opened', isDraft: true }),
    null,
  );

  // Merging PR moves task to 'Done'
  assert.equal(
    determineStatusTransition({ currentStatus: 'In Review', action: 'closed', isMerged: true }),
    'Done',
  );

  // Closing unmerged PR does not move to 'Done'
  assert.equal(
    determineStatusTransition({ currentStatus: 'In Review', action: 'closed', isMerged: false }),
    null,
  );

  // Missing or empty status does not trigger transition
  assert.equal(
    determineStatusTransition({ currentStatus: '', action: 'opened', isDraft: false }),
    null,
  );
  assert.equal(
    determineStatusTransition({ currentStatus: undefined, action: 'opened', isDraft: false }),
    null,
  );
});

test('resolveMatchingTask verifies Ticket Code integrity and avoids cross-project mismatch', () => {
  const taskRS148 = {
    id: 'page-rs-148',
    properties: {
      'Ticket Code': { formula: { string: 'RS-148' } },
    },
  };
  const taskUNID148 = {
    id: 'page-unid-148',
    properties: {
      'Ticket Code': { formula: { string: 'UNID-148' } },
    },
  };

  // Empty results
  assert.equal(resolveMatchingTask({ results: [] }), null);

  // Without ticketCode fallback to first result
  assert.deepEqual(resolveMatchingTask({ results: [taskRS148] }), taskRS148);

  // Matches exact Ticket Code
  assert.deepEqual(
    resolveMatchingTask({
      results: [taskUNID148, taskRS148],
      ticketCode: 'RS-148',
      taskId: 148,
    }),
    taskRS148,
  );

  // Case-insensitive match
  assert.deepEqual(
    resolveMatchingTask({
      results: [taskRS148],
      ticketCode: 'rs-148',
      taskId: 148,
    }),
    taskRS148,
  );

  // Single result with different project prefix returns null and prevents cross-project linking
  assert.equal(
    resolveMatchingTask({
      results: [taskRS148],
      ticketCode: 'UNID-148',
      taskId: 148,
    }),
    null,
  );
});

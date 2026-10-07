#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';

export const NOTION_API_VERSION = '2022-06-28';
export const NOTION_BASE_URL = 'https://api.notion.com/v1';
export const DEFAULT_TASKS_DATABASE_ID = 'cfaf8cf15c6183b4836b013e7e8cd25c';

/**
 * Extracts Notion page UUID from string or URL
 */
export function extractNotionPageId(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // 1. Matches query param ?p=... or &p=... within Notion URLs (used when copying links from Notion peek/modal views)
  const queryParamMatch = text.match(
    /(?:https?:\/\/(?:[a-zA-Z0-9-]+\.)?notion\.(?:so|com)\/[^\s)]*?[?&]p=([0-9a-f]{32}))/i,
  );

  if (queryParamMatch?.[1]) {
    return queryParamMatch[1].toLowerCase();
  }

  // 2. Matches 32-hex UUID with or without hyphens at the end of notion URLs or standalone
  const urlMatch = text.match(
    /(?:notion\.(?:so|com)\/(?:[^/\s?#]+\/)?(?:[^/\s?#]+-)?([0-9a-f]{32}))/i,
  );

  if (urlMatch?.[1]) {
    return urlMatch[1].toLowerCase();
  }

  const hyphenatedMatch = text.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );

  if (hyphenatedMatch) {
    return hyphenatedMatch[0].replace(/-/g, '').toLowerCase();
  }

  return null;
}

/**
 * Extracts task key info (e.g. RS-148) from branch name, title, or body
 */
export function extractTaskKey(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Matches patterns like RS-148, OP-102, MI-145, UNID-142, feat/RS-148-name
  const match = text.match(/(?:^|[/_\s\-[])([A-Za-z]{2,6})\s*[-_]\s*(\d+)(?:[/_\s\-[\]:)]|$)/);

  if (!match) {
    return null;
  }

  const prefix = match[1].toUpperCase();
  const taskId = parseInt(match[2], 10);
  const ticketCode = `${prefix}-${taskId}`;

  return { prefix, taskId, ticketCode };
}

/**
 * Parses all candidate task identifiers from PR data
 */
export function extractTaskInfo({ branch = '', title = '', body = '' } = {}) {
  // 1. Direct Notion Page ID from body
  const pageId = extractNotionPageId(body);

  // 2. Ticket key from branch, title, or body (in order of priority)
  const taskKey = extractTaskKey(branch) ?? extractTaskKey(title) ?? extractTaskKey(body) ?? null;

  return {
    pageId,
    ticketCode: taskKey?.ticketCode ?? null,
    prefix: taskKey?.prefix ?? null,
    taskId: taskKey?.taskId ?? null,
  };
}

/**
 * Formats a single PR into a Notion rich_text object
 */
export function formatPrItem({ prNumber, prUrl, state, isMerged = false, isDraft = false }) {
  let statusText = 'Open';

  if (isMerged) {
    statusText = 'Merged';
  } else if (state === 'closed') {
    statusText = 'Closed';
  } else if (isDraft) {
    statusText = 'Draft';
  }

  const content = `#${prNumber} (${statusText})`;

  return {
    type: 'text',
    text: {
      content,
      link: { url: prUrl },
    },
    annotations: {
      bold: true,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: isMerged ? 'green' : state === 'closed' ? 'gray' : 'default',
    },
  };
}

/**
 * Merges a PR into existing rich_text elements, supporting multiple PRs
 */
export function mergePrRichText({
  prNumber,
  prUrl,
  state,
  existingRichText = [],
  isMerged = false,
  isDraft = false,
}) {
  const newPrItem = formatPrItem({ prNumber, prUrl, state, isMerged, isDraft });
  const prPattern = new RegExp(`^#${prNumber}\\b`, 'i');
  const prUrlPattern = new RegExp(`/pull/${prNumber}(?:$|[?#/])`, 'i');

  const existingItems = Array.isArray(existingRichText) ? [...existingRichText] : [];
  let foundIndex = -1;

  for (let index = 0; index < existingItems.length; index++) {
    const item = existingItems[index];
    const textContent = item?.text?.content || item?.plain_text || '';
    const itemUrl = item?.text?.link?.url || item?.href || '';

    if (prPattern.test(textContent) || prUrlPattern.test(itemUrl)) {
      foundIndex = index;
      break;
    }
  }

  if (foundIndex >= 0) {
    // Update existing PR element in place
    existingItems[foundIndex] = newPrItem;

    return existingItems;
  }

  // PR not present: if there are already items, add a separator
  if (existingItems.length > 0) {
    existingItems.push({
      type: 'text',
      text: { content: ', ' },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
    });
  }

  existingItems.push(newPrItem);

  return existingItems;
}

/**
 * Determines task status transition based on PR action and status
 */
export function determineStatusTransition({
  currentStatus = '',
  action = 'opened',
  isMerged = false,
  isDraft = false,
}) {
  if (action === 'closed' && isMerged) {
    return 'Done';
  }

  if ((action === 'opened' || action === 'ready_for_review') && !isDraft) {
    if (currentStatus === 'Not Started' || currentStatus === 'Done') {
      return 'In Review';
    }
  }

  return null;
}

/**
 * Fetches Notion page by ID
 */
export async function fetchNotionPage({ pageId, token }) {
  const url = `${NOTION_BASE_URL}/pages/${pageId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.warn(`Notion fetch page failed (${response.status}): ${errorText}`);

    return null;
  }

  return await response.json();
}

/**
 * Resolves matching task page from query results, verifying Ticket Code integrity
 */
export function resolveMatchingTask({ results = [], ticketCode = null, taskId = null } = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  if (!ticketCode) {
    return results[0];
  }

  const matching = results.find((page) => {
    const code = page.properties?.['Ticket Code']?.formula?.string || '';

    return code.toLowerCase() === ticketCode.toLowerCase();
  });

  if (!matching) {
    console.warn(
      `Found task with ID #${taskId}, but Ticket Code does not match expected "${ticketCode}".`,
    );

    return null;
  }

  return matching;
}

/**
 * Queries Notion Tasks database by Task ID
 */
export async function queryTaskByNumber({ databaseId, taskId, ticketCode, token }) {
  const url = `${NOTION_BASE_URL}/databases/${databaseId}/query`;
  const body = {
    filter: {
      property: 'Task ID',
      unique_id: {
        equals: taskId,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.warn(`Notion database query failed (${response.status}): ${errorText}`);

    return null;
  }

  const data = await response.json();
  const results = data.results || [];

  return resolveMatchingTask({ results, ticketCode, taskId });
}

/**
 * Updates Notion Task properties
 */
export async function updateNotionPage({ pageId, richText, token, statusTransition = null }) {
  const url = `${NOTION_BASE_URL}/pages/${pageId}`;
  const properties = {
    'GitHub PRs': {
      rich_text: richText,
    },
  };

  if (statusTransition) {
    properties['Status'] = {
      status: {
        name: statusTransition,
      },
    };
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 403) {
      throw new Error(
        `Notion update page failed (403 Forbidden). Ensure your Notion integration has "Update content" enabled in https://www.notion.so/profile/integrations and "Can edit" access to the Tasks database. Details: ${errorText}`,
      );
    }

    throw new Error(`Notion update page failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Main execution handler
 */
export async function handlePullRequestEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_TASKS_DATABASE_ID || DEFAULT_TASKS_DATABASE_ID;
  const isDryRun = process.env.DRY_RUN === 'true';

  if (!notionToken) {
    console.info('::warning::NOTION_TOKEN is not set. Skipping Notion task linking.');

    return;
  }

  if (!eventPath || !existsSync(eventPath)) {
    console.info('GITHUB_EVENT_PATH not found. Skipping.');

    return;
  }

  const eventData = JSON.parse(readFileSync(eventPath, 'utf8'));
  const { action, pull_request: pr } = eventData;

  if (!pr) {
    console.info('No pull_request object in event data. Skipping.');

    return;
  }

  const branch = pr.head?.ref || '';
  const title = pr.title || '';
  const body = pr.body || '';
  const prNumber = pr.number;
  const prUrl = pr.html_url;
  const state = pr.state || 'open';
  const isMerged = Boolean(pr.merged);
  const isDraft = Boolean(pr.draft);

  console.info(
    `Processing PR #${prNumber} ("${title}") on branch "${branch}" [action: ${action}]...`,
  );

  const taskInfo = extractTaskInfo({ branch, title, body });

  if (!taskInfo.pageId && !taskInfo.taskId) {
    console.info('No Notion Task reference found in branch, title, or body. Skipping.');

    return;
  }

  console.info(
    `Identified Task target: pageId=${taskInfo.pageId || 'none'}, ticketCode=${taskInfo.ticketCode || 'none'} (Task ID: ${taskInfo.taskId || 'none'})`,
  );

  let page = null;

  if (taskInfo.pageId) {
    const fetchedPage = await fetchNotionPage({ pageId: taskInfo.pageId, token: notionToken });

    if (fetchedPage) {
      const hasPrProperty = Boolean(fetchedPage.properties?.['GitHub PRs']);
      const pageTicketCode = fetchedPage.properties?.['Ticket Code']?.formula?.string || '';
      const isCodeMismatch = Boolean(
        taskInfo.ticketCode && pageTicketCode.toLowerCase() !== taskInfo.ticketCode.toLowerCase(),
      );

      if (hasPrProperty && !isCodeMismatch) {
        page = fetchedPage;
      } else {
        console.warn(
          `Page ${taskInfo.pageId} is not a valid task item (hasPrProperty=${hasPrProperty}, isCodeMismatch=${isCodeMismatch}). Falling back to database query.`,
        );
      }
    }
  }

  if (!page && taskInfo.taskId) {
    page = await queryTaskByNumber({
      databaseId,
      taskId: taskInfo.taskId,
      ticketCode: taskInfo.ticketCode,
      token: notionToken,
    });
  }

  if (!page) {
    console.warn(
      `Could not find matching Notion task for ID ${taskInfo.taskId || taskInfo.pageId}.`,
    );

    return;
  }

  if (!page.properties?.['GitHub PRs']) {
    console.warn(
      `Target Notion page "${page.id}" does not have property "GitHub PRs". Skipping Notion PR link.`,
    );

    return;
  }

  const pageId = page.id;
  const taskName = page.properties?.['Task name']?.title?.[0]?.plain_text || 'Unnamed Task';
  const currentStatus = page.properties?.['Status']?.status?.name || '';
  const existingRichText = page.properties?.['GitHub PRs']?.rich_text || [];

  console.info(`Found Notion task "${taskName}" (ID: ${pageId}, Status: "${currentStatus}").`);

  const updatedRichText = mergePrRichText({
    existingRichText,
    prNumber,
    prUrl,
    state,
    isMerged,
    isDraft,
  });

  const statusTransition = determineStatusTransition({
    currentStatus,
    action,
    isMerged,
    isDraft,
  });

  console.info(
    `Updating task: GitHub PRs count=${updatedRichText.filter((item) => item.text?.link).length}, Status transition=${statusTransition || 'no change'}.`,
  );

  if (isDryRun) {
    console.info('DRY_RUN is enabled. Payload:');
    console.info(
      JSON.stringify({ properties: { 'GitHub PRs': updatedRichText, statusTransition } }, null, 2),
    );

    return;
  }

  await updateNotionPage({
    pageId,
    richText: updatedRichText,
    statusTransition,
    token: notionToken,
  });

  console.info(`✅ Successfully linked PR #${prNumber} to Notion task "${taskName}"!`);
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  process.argv[1].replace(/\\/g, '/').endsWith('.github/scripts/notion-pr-link.mjs');

if (isDirectRun) {
  handlePullRequestEvent().catch((err) => {
    console.error('Unhandled error in notion-pr-link script:', err);
    process.exit(1);
  });
}

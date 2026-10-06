#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Load user mappings
let discordUsers = {};
const mappingPath = resolve(process.cwd(), '.github', 'discord-users.json');

if (existsSync(mappingPath)) {
  try {
    discordUsers = JSON.parse(readFileSync(mappingPath, 'utf8'));
  } catch (err) {
    console.warn('Could not parse .github/discord-users.json:', err.message);
  }
}

export function formatUserMention(githubUser, customUsersMap = discordUsers) {
  if (!githubUser) {
    return 'Unknown';
  }

  const entry =
    customUsersMap[githubUser] ??
    Object.entries(customUsersMap).find(
      ([userKey]) => userKey.toLowerCase() === githubUser.toLowerCase(),
    )?.[1];
  const target = entry ? String(entry).trim() : '';

  if (target.length > 0) {
    const mention = /^\d+$/.test(target) ? `<@${target}>` : `@${target.replace(/^@/, '')}`;

    return `${mention} (\`${githubUser}\`)`;
  }

  return `[@${githubUser}](https://github.com/${githubUser})`;
}

export function truncateText(text, maxLength = 250) {
  if (!text) {
    return '_Без опису_';
  }

  const clean = text.replace(/\r\n/g, '\n').trim();

  if (clean.length === 0) {
    return '_Без опису_';
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, maxLength).trim() + '...';
}

export function formatPrAge(createdAt) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - created);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return `${diffDays}д`;
  }

  if (diffHours >= 1) {
    return `${diffHours}г`;
  }

  return '< 1г';
}

export function formatCommentsCount(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} відкритий коментар`;
  }

  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) {
    return `${count} відкритих коментарі`;
  }

  return `${count} відкритих коментарів`;
}

export function analyzePrReviewStatus(pr, users = discordUsers) {
  const authorLogin = pr.user?.login || pr.author?.login;
  const rawThreads = Array.isArray(pr.reviewThreads)
    ? pr.reviewThreads
    : pr.reviewThreads?.nodes || [];

  let pendingAuthorThreadsCount = 0;
  let authorRepliedThreadsCount = 0;
  let lastReviewerLogin = null;

  for (const thread of rawThreads) {
    if (thread.isResolved || thread.isOutdated) {
      continue;
    }

    const comments = Array.isArray(thread.comments)
      ? thread.comments
      : thread.comments?.nodes || [];

    if (comments.length === 0) {
      continue;
    }

    const lastComment = comments.at(-1);
    const lastAuthor = lastComment?.author?.login || lastComment?.user?.login;

    if (lastAuthor && lastAuthor.toLowerCase() === authorLogin?.toLowerCase()) {
      authorRepliedThreadsCount++;
    } else {
      pendingAuthorThreadsCount++;

      if (lastAuthor) {
        lastReviewerLogin = lastAuthor;
      }
    }
  }

  const reviewDecision = pr.reviewDecision;

  // 1. Action required: unresolved comments from reviewer OR CHANGES_REQUESTED
  if (pendingAuthorThreadsCount > 0 || reviewDecision === 'CHANGES_REQUESTED') {
    const reviewerMention = lastReviewerLogin ? formatUserMention(lastReviewerLogin, users) : null;
    let detail = '';

    if (pendingAuthorThreadsCount > 0) {
      const countText = formatCommentsCount(pendingAuthorThreadsCount);

      detail = reviewerMention ? `${countText} (останній від ${reviewerMention})` : countText;
    } else {
      detail = reviewerMention
        ? `запитано зміни від ${reviewerMention}`
        : "запитано зміни від рев'ювера";
    }

    return {
      statusType: 'ACTION_REQUIRED',
      pendingAuthorThreadsCount,
      lastReviewerLogin,
      reviewStr: ` • 🛠️ **Потрібні правки:** ${detail}`,
    };
  }

  // 2. Waiting for re-review: author replied to all unresolved threads
  if (authorRepliedThreadsCount > 0) {
    return {
      statusType: 'WAITING_FOR_REVIEWER',
      pendingAuthorThreadsCount: 0,
      lastReviewerLogin: null,
      reviewStr: ' • 💬 **Автор відповів:** очікує перевірки',
    };
  }

  // 3. Approved: ready to merge
  if (reviewDecision === 'APPROVED') {
    return {
      statusType: 'APPROVED',
      pendingAuthorThreadsCount: 0,
      lastReviewerLogin: null,
      reviewStr: ' • ✅ **Схвалено:** готовий до мержа!',
    };
  }

  // 4. Default: awaiting initial review
  const reviewers = (pr.requested_reviewers || [])
    .map((reviewer) => formatUserMention(reviewer.login, users))
    .join(', ');

  const reviewStr =
    reviewers.length > 0 ? ` • 🔍 **Очікує рев'ю:** ${reviewers}` : ' • ⚠️ *Очікує призначення*';

  return {
    statusType: 'NEEDS_REVIEW',
    pendingAuthorThreadsCount: 0,
    lastReviewerLogin: null,
    reviewStr,
  };
}

export function formatPrLine(pr, users = discordUsers) {
  const age = formatPrAge(pr.created_at);
  const baseRef = pr.base?.ref || 'develop';
  const additions = pr.additions;
  const deletions = pr.deletions;
  const hasDiff = typeof additions === 'number' && typeof deletions === 'number';
  const sizeStr = hasDiff ? ` *(+${additions}/-${deletions})*` : '';

  const { reviewStr } = analyzePrReviewStatus(pr, users);

  // Discord field limit is 1024 chars. Cap title so the line safely stays <= 900 chars
  const maxTitleLen = 120;
  const rawTitle = pr.title || 'Untitled';
  const title =
    rawTitle.length > maxTitleLen ? `${rawTitle.slice(0, maxTitleLen - 3)}...` : rawTitle;

  let line = `• [**#${pr.number}** ${title}](${pr.html_url}) ➔ \`${baseRef}\` (⏳ ${age}${sizeStr})${reviewStr}`;

  if (line.length > 900) {
    line = `${line.slice(0, 897)}...`;
  }

  return line;
}

export function chunkLines(lines, maxChunkLength = 1000) {
  const chunks = [];
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk && (currentChunk + '\n' + line).length > maxChunkLength) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function getEmbedLength(embed) {
  let length =
    (embed.title?.length || 0) +
    (embed.description?.length || 0) +
    (embed.footer?.text?.length || 0);

  for (const field of embed.fields || []) {
    length += (field.name?.length || 0) + (field.value?.length || 0);
  }

  return length;
}

export function partitionFieldsIntoEmbeds({
  fields,
  repoName,
  totalPrCount,
  humanPrCount,
  dependabotCount,
}) {
  const MAX_FIELDS_PER_EMBED = 25;
  const MAX_EMBED_CHARS = 5000;

  const embeds = [];
  let currentFields = [];
  let currentChars = 0;

  const baseTitle = `📋 Щоденний дайджест Pull Requests: ${repoName}`;
  const baseDescription = `Зараз відкрито **${totalPrCount}** PR (${humanPrCount} від розробників, ${dependabotCount} від Dependabot). Будь ласка, знайдіть час для рев'ю!`;
  const footerText = `UniVerse PR Reminder • ${repoName}`;

  let isFirst = true;
  let overhead = baseTitle.length + baseDescription.length + footerText.length;

  function flushEmbed() {
    if (currentFields.length === 0) {
      return;
    }

    embeds.push({
      title: isFirst ? baseTitle : undefined,
      description: isFirst ? baseDescription : undefined,
      color: 0x5865f2,
      fields: currentFields,
      footer: { text: footerText },
      timestamp: new Date().toISOString(),
    });

    currentFields = [];
    currentChars = 0;
    isFirst = false;
    overhead = footerText.length;
  }

  for (const field of fields) {
    const fieldChars = (field.name?.length || 0) + (field.value?.length || 0);

    if (
      currentFields.length >= MAX_FIELDS_PER_EMBED ||
      currentChars + fieldChars + (currentFields.length === 0 ? overhead : 0) > MAX_EMBED_CHARS
    ) {
      flushEmbed();
    }

    currentFields.push(field);
    currentChars += fieldChars;
  }

  flushEmbed();

  return embeds;
}

export function partitionEmbedsIntoMessages(embeds, mainContent = '') {
  const MAX_EMBEDS_PER_MESSAGE = 10;
  const MAX_MESSAGE_CHARS = 5500;

  const messages = [];
  let currentEmbeds = [];
  let currentChars = 0;
  let isFirstMessage = true;

  function flushMessage() {
    if (currentEmbeds.length === 0) {
      return;
    }

    messages.push({
      content: isFirstMessage ? mainContent : undefined,
      embeds: currentEmbeds,
    });

    currentEmbeds = [];
    currentChars = 0;
    isFirstMessage = false;
  }

  for (const embed of embeds) {
    const embedCharCount = getEmbedLength(embed);
    const contentOverhead =
      currentEmbeds.length === 0 && isFirstMessage ? mainContent?.length || 0 : 0;

    if (
      currentEmbeds.length >= MAX_EMBEDS_PER_MESSAGE ||
      currentChars + embedCharCount + contentOverhead > MAX_MESSAGE_CHARS
    ) {
      flushMessage();
    }

    currentEmbeds.push(embed);
    currentChars += embedCharCount;
  }

  flushMessage();

  return messages;
}

export function groupPullRequests(pullRequests) {
  const authorPrs = new Map();
  const dependabotPrs = [];

  for (const pr of pullRequests) {
    // Skip drafts
    if (pr.draft) {
      continue;
    }

    const authorLogin = pr.user?.login || pr.author?.login || 'unknown';

    if (authorLogin.toLowerCase().startsWith('dependabot')) {
      dependabotPrs.push(pr);
      continue;
    }

    if (!authorPrs.has(authorLogin)) {
      authorPrs.set(authorLogin, []);
    }

    authorPrs.get(authorLogin).push(pr);
  }

  let totalCount = dependabotPrs.length;

  for (const list of authorPrs.values()) {
    totalCount += list.length;
  }

  return {
    authorPrs,
    dependabotPrs,
    totalCount,
  };
}

export function buildReminderDiscordPayload({
  authorPrs,
  dependabotPrs = [],
  repoName = process.env.GITHUB_REPOSITORY || 'Karazin-UniVerse/uni-verse',
  discordUsers: users = discordUsers,
}) {
  let totalPrCount = dependabotPrs.length;

  for (const list of authorPrs.values()) {
    totalPrCount += list.length;
  }

  if (totalPrCount === 0) {
    return null;
  }

  const fields = [];
  const authorsNeedingAction = new Set();

  // Grouped per author
  for (const [authorLogin, prs] of authorPrs.entries()) {
    const authorMention = formatUserMention(authorLogin, users);
    const prLines = prs.map((pr) => {
      const status = analyzePrReviewStatus(pr, users);

      if (status.statusType === 'ACTION_REQUIRED') {
        authorsNeedingAction.add(authorLogin);
      }

      return formatPrLine(pr, users);
    });

    const chunks = chunkLines(prLines, 1000);

    chunks.forEach((chunk, index) => {
      fields.push({
        name:
          index === 0
            ? `👤 ${authorMention} (${prs.length} PR)`
            : `👤 ${authorMention} (продовження)`,
        value: chunk,
        inline: false,
      });
    });
  }

  // Dependabot separate compact section
  if (dependabotPrs.length > 0) {
    const depLines = dependabotPrs.map((pr) => {
      const maxTitleLen = 100;
      const rawTitle = pr.title || 'Untitled';
      const title =
        rawTitle.length > maxTitleLen ? `${rawTitle.slice(0, maxTitleLen - 3)}...` : rawTitle;

      return `• [**#${pr.number}** ${title}](${pr.html_url}) ➔ \`${pr.base?.ref || 'develop'}\``;
    });

    const depChunks = chunkLines(depLines, 1000);

    depChunks.forEach((chunk, index) => {
      fields.push({
        name:
          index === 0
            ? `🤖 Dependabot (${dependabotPrs.length} оновлень)`
            : `🤖 Dependabot (продовження)`,
        value: chunk,
        inline: false,
      });
    });
  }

  const humanPrCount = totalPrCount - dependabotPrs.length;
  const embeds = partitionFieldsIntoEmbeds({
    fields,
    repoName,
    totalPrCount,
    humanPrCount,
    dependabotCount: dependabotPrs.length,
  });

  let content = '';

  if (authorsNeedingAction.size > 0) {
    const authorMentions = Array.from(authorsNeedingAction)
      .map((login) => formatUserMention(login, users))
      .join(', ');

    content = `🔔 **Щоденне нагадування:** у репозиторії є відкриті Pull Requests!\n⚠️ ${authorMentions}, у ваших PR є незарезолвані коментарі, які очікують на виправлення!`;
  } else if (humanPrCount > 0) {
    content = `🔔 **Щоденне нагадування:** у репозиторії є відкриті Pull Requests, які очікують на рев'ю!`;
  } else {
    content = `🤖 **Щоденний статус:** очікують на розгляд тільки оновлення Dependabot.`;
  }

  return partitionEmbedsIntoMessages(embeds, content);
}

export async function sendDiscordWebhook(payload) {
  if (Array.isArray(payload)) {
    for (const message of payload) {
      await sendDiscordWebhook(message);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return;
  }

  const webhookUrl = process.env.DISCORD_PR_WEBHOOK;

  if (!webhookUrl) {
    console.info('::warning::DISCORD_PR_WEBHOOK is not set. Skipping Discord notification.');

    return;
  }

  console.info(`Sending webhook to Discord...`);

  const bodyPayload = {
    allowed_mentions: { parse: ['users', 'everyone'] },
    ...payload,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error(`Discord Webhook failed with status ${response.status}: ${errorText}`);
    process.exit(1);
  }

  console.info('Discord notification sent successfully.');
}

export const PULL_REQUESTS_GRAPHQL_QUERY = `
  query($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: OPEN, first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          isDraft
          createdAt
          additions
          deletions
          baseRefName
          headRefName
          author {
            login
          }
          reviewDecision
          reviewRequests(first: 20) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                }
              }
            }
          }
          reviewThreads(first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              isResolved
              isOutdated
              comments(last: 10) {
                nodes {
                  author {
                    login
                  }
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const REVIEW_THREADS_GRAPHQL_QUERY = `
  query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            isResolved
            isOutdated
            comments(last: 10) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }
      }
    }
  }
`;

export async function executeGraphQLQuery({ query, variables, token }) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'uni-verse-discord-pr-reminder',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.warn(`GraphQL API returned HTTP ${response.status}: ${errorText}`);

    return null;
  }

  const result = await response.json();

  if (result.errors) {
    console.warn('GraphQL API errors:', JSON.stringify(result.errors));

    return null;
  }

  return result.data;
}

export async function fetchPullRequestsGraphQL({ repo, token }) {
  if (!token) {
    return null;
  }

  const [owner, name] = repo.split('/');

  if (!owner || !name) {
    return null;
  }

  const allPullRequests = [];
  let pullRequestCursor = null;
  let hasMorePullRequests = true;

  while (hasMorePullRequests) {
    const data = await executeGraphQLQuery({
      query: PULL_REQUESTS_GRAPHQL_QUERY,
      variables: { owner, name, cursor: pullRequestCursor },
      token,
    });

    const connection = data?.repository?.pullRequests;

    if (!connection || !Array.isArray(connection.nodes)) {
      return null;
    }

    allPullRequests.push(...connection.nodes);
    hasMorePullRequests = Boolean(connection.pageInfo?.hasNextPage);
    pullRequestCursor = connection.pageInfo?.endCursor || null;
  }

  for (const node of allPullRequests) {
    const threads = [...(node.reviewThreads?.nodes || [])];
    let threadPageInfo = node.reviewThreads?.pageInfo;

    while (threadPageInfo?.hasNextPage && threadPageInfo.endCursor) {
      const threadData = await executeGraphQLQuery({
        query: REVIEW_THREADS_GRAPHQL_QUERY,
        variables: { owner, name, number: node.number, cursor: threadPageInfo.endCursor },
        token,
      });

      const threadConnection = threadData?.repository?.pullRequest?.reviewThreads;

      if (!threadConnection || !Array.isArray(threadConnection.nodes)) {
        return null;
      }

      threads.push(...threadConnection.nodes);
      threadPageInfo = threadConnection.pageInfo;
    }

    node.aggregatedReviewThreads = threads;
  }

  return allPullRequests.map((node) => ({
    number: node.number,
    title: node.title,
    html_url: node.url,
    draft: node.isDraft,
    created_at: node.createdAt,
    additions: node.additions,
    deletions: node.deletions,
    base: { ref: node.baseRefName },
    head: { ref: node.headRefName },
    user: { login: node.author?.login || 'unknown' },
    reviewDecision: node.reviewDecision,
    requested_reviewers: (node.reviewRequests?.nodes || [])
      .map((request) => request.requestedReviewer)
      .filter((user) => Boolean(user?.login)),
    reviewThreads: node.aggregatedReviewThreads || node.reviewThreads?.nodes || [],
  }));
}

export async function fetchOpenPullRequests({ repo, token }) {
  let nextUrl = `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`;
  const allPrs = [];

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'uni-verse-discord-pr-reminder',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });

    if (!response.ok) {
      const text = await response.text();

      throw new Error(`GitHub API error (${response.status}): ${text}`);
    }

    const prs = await response.json();

    if (!Array.isArray(prs) || prs.length === 0) {
      break;
    }

    allPrs.push(...prs);

    const linkHeader = response.headers.get('link');

    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);

      nextUrl = match ? match[1] : null;
    } else {
      nextUrl = null;
    }
  }

  return allPrs;
}

export async function fetchPullRequestDetails({ repo, prNumber, token }) {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'uni-verse-discord-pr-reminder',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

export async function handlePrReminder() {
  const repo = process.env.GITHUB_REPOSITORY || 'Karazin-UniVerse/uni-verse';
  const token = process.env.GITHUB_TOKEN;
  const isDryRun = process.env.DRY_RUN === 'true';

  console.info(`Fetching open pull requests for ${repo}...`);
  let prs = null;

  if (token) {
    try {
      prs = await fetchPullRequestsGraphQL({ repo, token });

      if (prs) {
        console.info(`Retrieved ${prs.length} open pull requests via GraphQL API.`);
      }
    } catch (err) {
      console.warn('GraphQL fetch failed, falling back to REST:', err.message);
    }
  }

  if (!prs) {
    prs = await fetchOpenPullRequests({ repo, token });

    console.info(`Retrieved ${prs.length} open pull requests via REST API.`);

    // Enrich non-draft developer PRs with diff details in batches of 10
    const eligiblePrs = prs.filter(
      (pullRequest) =>
        !pullRequest.draft && !pullRequest.user?.login?.toLowerCase().startsWith('dependabot'),
    );

    const BATCH_SIZE = 10;

    for (let i = 0; i < eligiblePrs.length; i += BATCH_SIZE) {
      const batch = eligiblePrs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (pr) => {
          try {
            const details = await fetchPullRequestDetails({ repo, prNumber: pr.number, token });

            if (details) {
              pr.additions = details.additions;
              pr.deletions = details.deletions;
            }
          } catch {
            // Non-fatal, fallback to list data
          }
        }),
      );
    }
  }

  const { authorPrs, dependabotPrs, totalCount } = groupPullRequests(prs);

  if (totalCount === 0) {
    console.info('No open non-draft pull requests pending review. Skipping Discord notification.');

    return;
  }

  const payloads = buildReminderDiscordPayload({
    authorPrs,
    dependabotPrs,
    repoName: repo,
    discordUsers,
  });

  if (!payloads || payloads.length === 0) {
    console.info('Payload is empty. Skipping notification.');

    return;
  }

  if (isDryRun) {
    console.info('DRY_RUN enabled. Payload to send:');
    console.info(JSON.stringify(payloads, null, 2));

    return;
  }

  await sendDiscordWebhook(payloads);
}

export async function handleCiFailure() {
  const repo = process.env.GITHUB_REPOSITORY || 'unknown/repo';
  const runId = process.env.GITHUB_RUN_ID || '';
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const workflowName = process.env.GITHUB_WORKFLOW || 'CI';

  let refName = process.env.GITHUB_REF_NAME || 'develop';
  let actor = process.env.GITHUB_ACTOR || 'unknown';
  let commitSha = (process.env.GITHUB_SHA || '').slice(0, 7);

  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (eventPath && existsSync(eventPath)) {
    try {
      const eventData = JSON.parse(readFileSync(eventPath, 'utf8'));

      if (eventData.pull_request) {
        const pr = eventData.pull_request;

        refName = pr.head?.ref || refName;
        actor = pr.user?.login || actor;
        commitSha = (pr.head?.sha || process.env.GITHUB_SHA || '').slice(0, 7);
      }
    } catch (err) {
      console.warn('Could not parse GITHUB_EVENT_PATH in handleCiFailure:', err.message);
    }
  }

  const runUrl = `${serverUrl}/${repo}/actions/runs/${runId}`;
  const authorMention = formatUserMention(actor);

  const payload = {
    content: `⚠️ ${authorMention}, у твоєму білді на гілці \`${refName}\` впали перевірки CI!`,
    embeds: [
      {
        title: `❌ CI Pipeline Failed: ${repo}`,
        url: runUrl,
        color: 0xed4245, // Red
        fields: [
          {
            name: 'Workflow',
            value: `\`${workflowName}\``,
            inline: true,
          },
          {
            name: 'Гілка',
            value: `\`${refName}\``,
            inline: true,
          },
          {
            name: 'Автор',
            value: authorMention,
            inline: true,
          },
          {
            name: 'Комміт',
            value: `[\`${commitSha}\`](${serverUrl}/${repo}/commit/${process.env.GITHUB_SHA})`,
            inline: true,
          },
          {
            name: 'Деталі збою',
            value: `[Переглянути логи в GitHub Actions](${runUrl})`,
            inline: false,
          },
        ],
        footer: {
          text: `UniVerse CI • ${repo}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await sendDiscordWebhook(payload);
}

export async function handlePullRequest() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath || !existsSync(eventPath)) {
    console.warn('GITHUB_EVENT_PATH not found. Cannot process PR event.');
    process.exit(0);
  }

  const eventData = JSON.parse(readFileSync(eventPath, 'utf8'));
  const { action, pull_request: pr, repository } = eventData;

  if (!pr) {
    console.info('No pull_request payload found. Skipping.');
    process.exit(0);
  }

  // Skip draft PR creation; notify only when marked ready for review
  if (action === 'opened' && pr.draft) {
    console.info('Pull Request is a Draft. Skipping notification until ready for review.');
    process.exit(0);
  }

  let statusLabel = '';
  let color = 0x5865f2; // Blurple
  let content = '';

  const authorMention = formatUserMention(pr.user?.login);
  const reviewers = pr.requested_reviewers || [];
  const reviewersMentions = reviewers.map((reviewer) => formatUserMention(reviewer.login));

  if (action === 'closed') {
    if (pr.merged) {
      statusLabel = `✅ Вмерджено в \`${pr.base?.ref}\``;
      color = 0x57f287; // Green
      content = `🎉 Pull Request **#${pr.number}** успішно вмерджено в \`${pr.base?.ref}\`!`;
    } else {
      statusLabel = '🚫 Закрито без мержа';
      color = 0x95a5a6; // Grey
      content = `Pull Request **#${pr.number}** закрито без мержа.`;
    }
  } else if (action === 'opened' || action === 'ready_for_review') {
    statusLabel = action === 'opened' ? '🚀 Відкрито новий PR' : "🔍 Готовий до рев'ю";
    color = 0x5865f2; // Blurple

    content =
      reviewersMentions.length > 0
        ? `🔔 Запит на рев'ю: ${reviewersMentions.join(', ')}`
        : '@here новий PR потребує перегляду!';
  } else if (action === 'reopened') {
    statusLabel = '🔄 Перевідкрито PR';
    color = 0xfee75c; // Yellow
    content = `@here Pull Request **#${pr.number}** було перевідкрито.`;
  } else {
    console.info(`Action "${action}" does not require a notification.`);
    process.exit(0);
  }

  const additions = pr.additions ?? 0;
  const deletions = pr.deletions ?? 0;
  const changedFiles = pr.changed_files ?? 0;

  const payload = {
    content,
    embeds: [
      {
        title: `PR #${pr.number}: ${pr.title}`,
        url: pr.html_url,
        color,
        fields: [
          {
            name: 'Статус',
            value: statusLabel,
            inline: true,
          },
          {
            name: 'Автор',
            value: authorMention,
            inline: true,
          },
          {
            name: 'Гілки',
            value: `\`${pr.head?.ref}\` ➔ \`${pr.base?.ref}\``,
            inline: true,
          },
          {
            name: 'Зміни в коді',
            value: `\`+${additions}\` / \`-${deletions}\` (${changedFiles} файлів)`,
            inline: true,
          },
          {
            name: 'Опис',
            value: truncateText(pr.body),
            inline: false,
          },
        ],
        footer: {
          text: `UniVerse • ${repository?.full_name || 'uni-verse'}`,
          icon_url: pr.user?.avatar_url,
        },
        timestamp: pr.updated_at || new Date().toISOString(),
      },
    ],
  };

  await sendDiscordWebhook(payload);
}

export async function main() {
  const isCiFailure =
    process.argv.includes('--ci-failure') || process.env.NOTIFY_MODE === 'ci-failure';
  const isReminder = process.argv.includes('--reminder') || process.env.NOTIFY_MODE === 'reminder';

  if (isCiFailure) {
    await handleCiFailure();
  } else if (isReminder) {
    await handlePrReminder();
  } else {
    await handlePullRequest();
  }
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (isDirectRun) {
  main().catch((err) => {
    console.error('Unhandled error in discord-notify script:', err);
    process.exit(1);
  });
}

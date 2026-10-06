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
    Object.entries(customUsersMap).find(([k]) => k.toLowerCase() === githubUser.toLowerCase())?.[1];
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

export function groupPullRequests(pullRequests) {
  const authorPrs = new Map();
  const dependabotPrs = [];

  for (const pr of pullRequests) {
    // Skip drafts
    if (pr.draft) {
      continue;
    }

    const authorLogin = pr.user?.login || 'unknown';

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

  // Grouped per author
  for (const [authorLogin, prs] of authorPrs.entries()) {
    const authorMention = formatUserMention(authorLogin, users);
    const prLines = prs.map((pr) => {
      const age = formatPrAge(pr.created_at);
      const baseRef = pr.base?.ref || 'develop';
      const additions = pr.additions ?? 0;
      const deletions = pr.deletions ?? 0;
      const sizeStr = additions || deletions ? ` *(+${additions}/-${deletions})*` : '';

      const reviewers = (pr.requested_reviewers || [])
        .map((r) => formatUserMention(r.login, users))
        .join(', ');
      const reviewStr = reviewers.length > 0 ? ` • 🔍 ${reviewers}` : ' • ⚠️ *Очікує призначення*';

      return `• [**#${pr.number}** ${pr.title}](${pr.html_url}) ➔ \`${baseRef}\` (⏳ ${age}${sizeStr})${reviewStr}`;
    });

    // Discord embed field value limit is 1024 chars
    const chunks = [];
    let currentChunk = '';

    for (const line of prLines) {
      if ((currentChunk + '\n' + line).length > 1000) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        currentChunk = line;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

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
    const depLines = dependabotPrs
      .map(
        (pr) =>
          `• [**#${pr.number}** ${pr.title}](${pr.html_url}) ➔ \`${pr.base?.ref || 'develop'}\``,
      )
      .join('\n');

    fields.push({
      name: `🤖 Dependabot (${dependabotPrs.length} оновлень)`,
      value: depLines.length > 1000 ? depLines.slice(0, 990) + '...' : depLines,
      inline: false,
    });
  }

  const humanPrCount = totalPrCount - dependabotPrs.length;

  return {
    content:
      humanPrCount > 0
        ? `🔔 **Щоденне нагадування:** у репозиторії є відкриті Pull Requests, які очікують на рев'ю!`
        : `🤖 **Щоденний статус:** очікують на розгляд тільки оновлення Dependabot.`,
    embeds: [
      {
        title: `📋 Щоденний дайджест Pull Requests: ${repoName}`,
        description: `Зараз відкрито **${totalPrCount}** PR (${humanPrCount} від розробників, ${dependabotPrs.length} від Dependabot). Будь ласка, знайдіть час для рев'ю!`,
        color: 0x5865f2, // Blurple
        fields,
        footer: {
          text: `UniVerse PR Reminder • ${repoName}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function sendDiscordWebhook(payload) {
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

export async function fetchOpenPullRequests({ repo, token }) {
  const url = `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`;
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
    const text = await response.text();

    throw new Error(`GitHub API error (${response.status}): ${text}`);
  }

  return await response.json();
}

export async function handlePrReminder() {
  const repo = process.env.GITHUB_REPOSITORY || 'Karazin-UniVerse/uni-verse';
  const token = process.env.GITHUB_TOKEN;
  const isDryRun = process.env.DRY_RUN === 'true';

  console.info(`Fetching open pull requests for ${repo}...`);
  const prs = await fetchOpenPullRequests({ repo, token });

  console.info(`Retrieved ${prs.length} open pull requests.`);

  const { authorPrs, dependabotPrs, totalCount } = groupPullRequests(prs);

  if (totalCount === 0) {
    console.info('No open non-draft pull requests pending review. Skipping Discord notification.');

    return;
  }

  const payload = buildReminderDiscordPayload({
    authorPrs,
    dependabotPrs,
    repoName: repo,
    discordUsers,
  });

  if (!payload) {
    console.info('Payload is empty. Skipping notification.');

    return;
  }

  if (isDryRun) {
    console.info('DRY_RUN enabled. Payload to send:');
    console.info(JSON.stringify(payload, null, 2));

    return;
  }

  await sendDiscordWebhook(payload);
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
  const reviewersMentions = reviewers.map((r) => formatUserMention(r.login));

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

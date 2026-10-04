#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const WEBHOOK_URL = process.env.DISCORD_PR_WEBHOOK;

if (!WEBHOOK_URL) {
  console.info('::warning::DISCORD_PR_WEBHOOK is not set. Skipping Discord notification.');
  process.exit(0);
}

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

function formatUserMention(githubUser) {
  if (!githubUser) {
    return 'Unknown';
  }

  const entry =
    discordUsers[githubUser] ??
    Object.entries(discordUsers).find(([k]) => k.toLowerCase() === githubUser.toLowerCase())?.[1];
  const target = entry ? String(entry).trim() : '';

  if (target.length > 0) {
    const mention = /^\d+$/.test(target) ? `<@${target}>` : `@${target.replace(/^@/, '')}`;

    return `${mention} (\`${githubUser}\`)`;
  }

  return `[@${githubUser}](https://github.com/${githubUser})`;
}

function truncateText(text, maxLength = 250) {
  if (!text) {
    return '_Без опису_';
  }

  const clean = text.replace(/\r\n/g, '\n').trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, maxLength).trim() + '...';
}

async function sendDiscordWebhook(payload) {
  console.info(`Sending webhook to Discord...`);

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error(`Discord Webhook failed with status ${response.status}: ${errorText}`);
    process.exit(1);
  }

  console.info('Discord notification sent successfully.');
}

async function handleCiFailure() {
  const repo = process.env.GITHUB_REPOSITORY || 'unknown/repo';
  const actor = process.env.GITHUB_ACTOR || 'unknown';
  const runId = process.env.GITHUB_RUN_ID || '';
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const workflowName = process.env.GITHUB_WORKFLOW || 'CI';
  const refName = process.env.GITHUB_REF_NAME || 'develop';
  const commitSha = (process.env.GITHUB_SHA || '').slice(0, 7);
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

async function handlePullRequest() {
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

async function main() {
  const isCiFailure =
    process.argv.includes('--ci-failure') || process.env.NOTIFY_MODE === 'ci-failure';

  if (isCiFailure) {
    await handleCiFailure();
  } else {
    await handlePullRequest();
  }
}

main().catch((err) => {
  console.error('Unhandled error in discord-notify script:', err);
  process.exit(1);
});

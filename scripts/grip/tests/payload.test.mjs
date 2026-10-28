import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const config = readFileSync(new URL('../../../.grip.toml', import.meta.url), 'utf8');
const diffBudget = Number(config.match(/^max_diff_bytes\s*=\s*(\d+)/m)?.[1] ?? 200_000);

// Grip 0.5.0 serializes requests with Python json.dumps (ensure_ascii=True).
function wireBytes(payload) {
  return Buffer.byteLength(
    JSON.stringify(payload).replace(
      /[\u0080-\uffff]/g,
      (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
    ),
    'utf8',
  );
}

for (const character of ['a', 'ї']) {
  for (const phase of ['Board', 'GradeSheet']) {
    test(`configured diff budget leaves room for ${phase} with ${character === 'a' ? 'ASCII' : 'Ukrainian'} text`, () => {
      const patch = character.repeat(Math.floor(diffBudget / Buffer.byteLength(character)));
      const overhead =
        'synthetic instructions, file paths, statistics and commit messages\n'.repeat(100);
      const answers =
        phase === 'GradeSheet'
          ? Array.from(
              { length: 5 },
              () => `${character.repeat(4000)}\nquestion and rubric: ${character.repeat(500)}`,
            ).join('\n')
          : '';
      const payload = {
        model: 'gemini-3.5-flash-lite',
        messages: [
          { role: 'system', content: overhead },
          { role: 'user', content: `${patch}\n${overhead}\n${answers}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: phase, schema: { type: 'object' } },
        },
      };

      assert.ok(
        payload.messages.reduce(
          (bytes, message) => bytes + Buffer.byteLength(message.content),
          0,
        ) <= 200_000,
      );
      assert.ok(
        wireBytes(payload) < 256 * 1024,
        'Python JSON escaping must fit the gateway HTTP body limit',
      );
    });
  }
}

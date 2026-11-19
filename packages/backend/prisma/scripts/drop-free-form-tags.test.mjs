import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';

test('drops legacy tag storage without deleting opportunities and can run twice', async () => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    'Set TEST_DATABASE_URL to a disposable PostgreSQL database',
  );

  const client = new pg.Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });

  await client.connect();

  try {
    // Temporary tables shadow public tables, so cleanup cannot touch application data.
    await client.query(`
      CREATE TEMP TABLE "Opportunity" (id text, title text, "proposedTags" text[]);
      CREATE TEMP TABLE "Tag" (id text, name text);
      CREATE TEMP TABLE "_OpportunityToTag" ("A" text, "B" text);
      INSERT INTO "Opportunity" VALUES ('opportunity', 'Keep me', ARRAY['legacy']);
      INSERT INTO "Tag" VALUES ('tag', 'legacy');
      INSERT INTO "_OpportunityToTag" VALUES ('opportunity', 'tag');
    `);

    // Restrict resolution to the temporary schema, including on the second run.
    await client.query('SET search_path TO pg_temp');

    const sql = await readFile(
      new URL('./drop-free-form-tags.sql', import.meta.url),
      'utf8',
    );

    await client.query(sql);
    await client.query(sql);

    const { rows } = await client.query('SELECT * FROM "Opportunity"');

    assert.deepEqual(rows, [{ id: 'opportunity', title: 'Keep me' }]);

    const tables = await client.query(`
      SELECT relname FROM pg_class
      WHERE relnamespace = pg_my_temp_schema() AND relname IN ('Tag', '_OpportunityToTag')
    `);

    assert.deepEqual(tables.rows, []);
  } finally {
    await client.end();
  }
});

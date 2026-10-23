const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const script = path.resolve(__dirname, '../graphify.cjs');

test('uses the project virtual environment or PATH even in a graphify-rs205 checkout', async () => {
  for (const useProjectVenv of [true, false]) {
    const calls = [];
    const exits = [];
    const child = new EventEmitter();
    const projectRoot = path.resolve(__dirname, '../../graphify-rs205');
    const projectExecutable = path.join(projectRoot, '.venv', 'Scripts', 'graphify.exe');

    vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
      __dirname: path.join(projectRoot, 'scripts'),
      console,
      process: {
        argv: ['node', script, 'query', 'OpportunitiesService'],
        env: {},
        exit: (code) => exits.push(code),
      },
      require: (name) => {
        if (name === 'node:fs') {
          return {
            existsSync: (file) =>
              file.endsWith('graph.json') || (useProjectVenv && file === projectExecutable),
          };
        }

        if (name === 'node:child_process') {
          return {
            spawn: (...args) => {
              calls.push(args);

              return child;
            },
          };
        }

        return require(name);
      },
    });
    assert.equal(calls[0][0], useProjectVenv ? projectExecutable : 'graphify');
    assert.deepEqual(Array.from(calls[0][1]), ['query', 'OpportunitiesService']);
    assert.equal(calls[0][2].cwd, projectRoot);
    child.emit('close', 0, null);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(exits, [0]);
  }
});

function runWrapper(args) {
  const calls = [];
  const exits = [];

  vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
    __dirname: path.dirname(script),
    console: { error: () => undefined },
    process: {
      argv: ['node', script, ...args],
      env: {},
      exit: (code) => {
        exits.push(code);
      },
    },
    require: (name) => {
      if (name === 'node:fs') {
        return { existsSync: () => false };
      }

      if (name === 'node:child_process') {
        return {
          spawn: (...spawnArgs) => {
            calls.push(spawnArgs);

            return new EventEmitter();
          },
        };
      }

      return require(name);
    },
  });

  return { calls, exits };
}

test('rejects custom extraction output before spawning instead of clustering the wrong graph', () => {
  for (const option of ['--out', '--output', '--out=other', '--output=other']) {
    const { calls, exits } = runWrapper(['extract', option, 'other']);

    assert.equal(calls.length, 0);
    assert.equal(exits[0], 1);
  }
});

test('passes explicit graph paths to Graphify without requiring the default graph', () => {
  for (const command of ['query', 'path', 'explain', 'god-nodes']) {
    for (const option of [['--graph', 'other/graph.json'], ['--graph=other/graph.json']]) {
      const args = [command, 'OpportunitiesService', ...option];
      const { calls, exits } = runWrapper(args);

      assert.equal(exits.length, 0);
      assert.equal(calls.length, 1);
      assert.deepEqual(Array.from(calls[0][1]), args);
    }
  }
});

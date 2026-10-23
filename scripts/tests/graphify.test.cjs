const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const script = path.resolve(__dirname, '../graphify.cjs');

test('uses the project virtual environment or PATH, never a developer-specific executable', async () => {
  for (const useProjectVenv of [true, false]) {
    const calls = [];
    const exits = [];
    const child = new EventEmitter();
    const projectRoot = path.resolve(__dirname, '../..');
    const projectExecutable = path.join(projectRoot, '.venv', 'Scripts', 'graphify.exe');

    vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
      __dirname: path.dirname(script),
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
              file.includes('graphify-rs205') ||
              file.endsWith('graph.json') ||
              (useProjectVenv && file === projectExecutable),
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

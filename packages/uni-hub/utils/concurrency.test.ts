import { describe, expect, it } from 'vitest';
import { createLimiter } from './concurrency';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

describe('createLimiter', () => {
  it('never runs more tasks at once than the limit', async () => {
    const limit = createLimiter(2);
    const gates = [deferred(), deferred(), deferred(), deferred()];
    let running = 0;
    let peak = 0;

    const results = gates.map((gate) =>
      limit(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await gate.promise;
        running -= 1;
      }),
    );

    await Promise.resolve();
    expect(running).toBe(2);

    for (const gate of gates) {
      gate.resolve();
      await Promise.resolve();
    }

    await Promise.all(results);

    expect(peak).toBe(2);
  });

  it('starts the next waiting task when one finishes, even if it fails', async () => {
    const limit = createLimiter(1);
    const order: string[] = [];

    const failing = limit(async () => {
      order.push('first');
      throw new Error('boom');
    });
    const following = limit(async () => {
      order.push('second');
    });

    await expect(failing).rejects.toThrow('boom');
    await following;

    expect(order).toEqual(['first', 'second']);
  });

  it('returns the task result', async () => {
    const limit = createLimiter(3);

    await expect(limit(async () => 42)).resolves.toBe(42);
  });
});

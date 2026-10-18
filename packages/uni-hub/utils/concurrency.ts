export function createLimiter(maxConcurrent: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = (): void => {
    const startNext = waiting.shift();

    if (startNext) {
      startNext();
    } else {
      active -= 1;
    }
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < maxConcurrent) {
      active += 1;
    } else {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }

    try {
      return await task();
    } finally {
      release();
    }
  };
}

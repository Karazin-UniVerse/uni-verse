import { Worker } from 'node:worker_threads';
import { DEFAULT_TIMEOUT_MS } from '@universe/core/constants/timetable';
import type {
  GenerateTimetableParams,
  GenerateTimetableResult,
} from '@universe/core/types/timetable';

const WORKER_TIMEOUT_BUFFER_MS = 5000;

export function runTimetableSolver(
  params: GenerateTimetableParams,
  compactSaturdays: boolean,
): Promise<GenerateTimetableResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(require.resolve('./timetable-solver.worker'), {
      workerData: { params, compactSaturdays },
    });
    const timeoutMs =
      (params.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) +
      WORKER_TIMEOUT_BUFFER_MS;
    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timer);
      worker.removeListener('message', handleMessage);
      worker.removeListener('error', handleError);
      worker.removeListener('exit', handleExit);
    };

    const handleMessage = (result: GenerateTimetableResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const handleError = (error: Error): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    const handleExit = (code: number): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(
        new Error(
          `Timetable worker exited before returning a result (code ${code})`,
        ),
      );
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      void worker.terminate();
      reject(new Error('Timetable worker timed out'));
    }, timeoutMs);

    timer.unref();
    worker.once('message', handleMessage);
    worker.once('error', handleError);
    worker.once('exit', handleExit);
  });
}

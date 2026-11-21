import { Worker } from 'node:worker_threads';
import type {
  GenerateTimetableParams,
  GenerateTimetableResult,
} from '@universe/core/types/timetable';

export function runTimetableSolver(
  params: GenerateTimetableParams,
  compactSaturdays: boolean,
): Promise<GenerateTimetableResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(require.resolve('./timetable-solver.worker'), {
      workerData: { params, compactSaturdays },
    });

    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) =>
      reject(
        new Error(
          `Timetable worker exited before returning a result (code ${code})`,
        ),
      ),
    );
  });
}

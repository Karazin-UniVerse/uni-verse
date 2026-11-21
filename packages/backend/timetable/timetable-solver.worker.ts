import { parentPort, workerData } from 'node:worker_threads';
import type { GenerateTimetableParams } from '@universe/core/types/timetable';
import { generateTimetableCandidates } from '@universe/core/utils/timetable';
import { generateCompactTimetableCandidates } from '@universe/core/utils/timetable-compaction';

const { params, compactSaturdays } = workerData as {
  params: GenerateTimetableParams;
  compactSaturdays: boolean;
};
const generate = compactSaturdays
  ? generateCompactTimetableCandidates
  : generateTimetableCandidates;

parentPort!.postMessage(generate(params));

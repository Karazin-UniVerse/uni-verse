import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { CourseSection } from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { courseContentsQueryOptions, loadAssignmentStatus } from './queries';

const sections: CourseSection[] = [
  { id: 1, name: 'Week 1', summary: '', modules: [{ id: 10, name: 'Lab', modname: 'assign' }] },
];

describe('moodle queries', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('loads the contents of a course', async () => {
    const getCourseContents = vi
      .spyOn(moodleApi, 'getCourseContents')
      .mockResolvedValue({ data: sections });

    await expect(queryClient.fetchQuery(courseContentsQueryOptions(7))).resolves.toEqual(sections);
    expect(getCourseContents).toHaveBeenCalledWith(7);
  });

  it('drops sections without a name or without modules from the course contents', async () => {
    const visibleSection = sections[0];

    vi.spyOn(moodleApi, 'getCourseContents').mockResolvedValue({
      data: [
        { id: 2, name: '', summary: '', modules: visibleSection.modules },
        { id: 3, name: 'Empty week', summary: '', modules: [] },
        visibleSection,
      ],
    });

    await expect(queryClient.fetchQuery(courseContentsQueryOptions(7))).resolves.toEqual([
      visibleSection,
    ]);
  });

  it('rejects instead of returning an empty list when the contents request fails', async () => {
    vi.spyOn(moodleApi, 'getCourseContents').mockRejectedValue(new Error('HTTP error 500'));

    await expect(queryClient.fetchQuery(courseContentsQueryOptions(7))).rejects.toThrow(
      'HTTP error 500',
    );
  });

  it('loads the submission status of one assignment', async () => {
    const getAssignmentStatus = vi
      .spyOn(moodleApi, 'getAssignmentStatus')
      .mockResolvedValue({ data: { status: 'submitted', grade: '95' } });

    await expect(loadAssignmentStatus(5)).resolves.toEqual({ status: 'submitted', grade: '95' });
    expect(getAssignmentStatus).toHaveBeenCalledWith(5);
  });

  it('never has more than 10 status requests in flight', async () => {
    const pendingRequests: Array<() => void> = [];
    let inFlight = 0;
    let peak = 0;

    vi.spyOn(moodleApi, 'getAssignmentStatus').mockImplementation(() => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);

      return new Promise((resolve) => {
        pendingRequests.push(() => {
          inFlight -= 1;
          resolve({ data: { status: 'new' } });
        });
      });
    });

    const results = Array.from({ length: 25 }, (_, id) => loadAssignmentStatus(id));
    let finished = 0;

    await vi.waitFor(() => expect(pendingRequests.length).toBe(10));

    while (finished < 25) {
      const batch = pendingRequests.splice(0);

      for (const finish of batch) {
        finish();
      }

      finished += batch.length;
      await vi.waitFor(() => expect(pendingRequests.length > 0 || finished >= 25).toBe(true));
    }

    await Promise.all(results);

    expect(peak).toBe(10);
  });
});

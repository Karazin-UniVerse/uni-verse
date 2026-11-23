import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CourseSection } from '@core/types/moodle';
import { moodleApi } from '@uni-hub/services/api.moodle';
import { withAppProviders } from '@uni-hub/utils/test-utils';
import { AssignmentDetail } from './AssignmentDetail';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('AssignmentDetail component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads attachments via backend proxy without exposing Moodle URLs or tokens in links', async () => {
    const user = userEvent.setup();
    const attachmentUrl = 'https://moodle.test/webservice/pluginfile.php/15/task.pdf';
    const sections: CourseSection[] = [
      {
        id: 1,
        name: 'Week 1',
        summary: '',
        modules: [
          {
            id: 42,
            instance: 99,
            modname: 'assign',
            name: 'Practical 1',
            contents: [{ filename: 'task.pdf', fileurl: attachmentUrl }],
          },
        ],
      },
    ];

    vi.spyOn(moodleApi, 'getCourseContents').mockResolvedValue({ data: sections });
    vi.spyOn(moodleApi, 'getAssignmentStatus').mockResolvedValue({
      data: { status: 'new', grade: '' },
    });

    const downloadSpy = vi
      .spyOn(moodleApi, 'downloadFile')
      .mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:task');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    render(
      withAppProviders(
        <AssignmentDetail
          assignmentId={99}
          courseId={10}
          assignment={{
            id: 99,
            name: 'Practical 1',
            courseName: 'Algorithms',
            duedate: 1735689600,
            description: '',
          }}
        />,
      ),
    );

    const downloadButton = await screen.findByRole('button', { name: /завантажити/i });

    expect(screen.queryByRole('link', { name: /завантажити/i })).not.toBeInTheDocument();

    await user.click(downloadButton);

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith(attachmentUrl);
      expect(createObjectUrlSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:task');
    });
  });

  it('shows an error toast when attachment download fails', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.spyOn(moodleApi, 'getCourseContents').mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Week 1',
          summary: '',
          modules: [
            {
              id: 42,
              instance: 99,
              modname: 'assign',
              name: 'Practical 1',
              contents: [
                {
                  filename: 'task.pdf',
                  fileurl: 'https://moodle.test/webservice/pluginfile.php/15/task.pdf',
                },
              ],
            },
          ],
        },
      ],
    });
    vi.spyOn(moodleApi, 'getAssignmentStatus').mockResolvedValue({
      data: { status: 'new', grade: '' },
    });
    vi.spyOn(moodleApi, 'downloadFile').mockRejectedValue(new Error('Network error'));

    render(
      withAppProviders(
        <AssignmentDetail
          assignmentId={99}
          courseId={10}
          assignment={{
            id: 99,
            name: 'Practical 1',
            courseName: 'Algorithms',
            duedate: 1735689600,
            description: '',
          }}
        />,
      ),
    );

    await user.click(await screen.findByRole('button', { name: /завантажити/i }));

    expect(await screen.findByText('Не вдалося завантажити файл')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('disables all attachment download buttons while any download is pending', async () => {
    const user = userEvent.setup();
    let resolveDownload: ((value: Blob) => void) | undefined;

    vi.spyOn(moodleApi, 'getCourseContents').mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Week 1',
          summary: '',
          modules: [
            {
              id: 42,
              instance: 99,
              modname: 'assign',
              name: 'Practical 1',
              contents: [
                {
                  filename: 'first.pdf',
                  fileurl: 'https://moodle.test/webservice/pluginfile.php/15/first.pdf',
                },
                {
                  filename: 'second.pdf',
                  fileurl: 'https://moodle.test/webservice/pluginfile.php/15/second.pdf',
                },
              ],
            },
          ],
        },
      ],
    });
    vi.spyOn(moodleApi, 'getAssignmentStatus').mockResolvedValue({
      data: { status: 'new', grade: '' },
    });
    vi.spyOn(moodleApi, 'downloadFile').mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          resolveDownload = resolve;
        }),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:first');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(
      withAppProviders(
        <AssignmentDetail
          assignmentId={99}
          courseId={10}
          assignment={{
            id: 99,
            name: 'Practical 1',
            courseName: 'Algorithms',
            duedate: 1735689600,
            description: '',
          }}
        />,
      ),
    );

    const buttons = await screen.findAllByRole('button', { name: /завантажити/i });

    expect(buttons).toHaveLength(2);

    await user.click(buttons[0]);

    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();

    resolveDownload?.(new Blob(['pdf'], { type: 'application/pdf' }));

    await waitFor(() => {
      expect(buttons[0]).not.toBeDisabled();
      expect(buttons[1]).not.toBeDisabled();
    });
  });
});

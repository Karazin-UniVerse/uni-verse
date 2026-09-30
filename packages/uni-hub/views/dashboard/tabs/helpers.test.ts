import { describe, it, expect } from 'vitest';
import {
  getAssignmentStatusInfo,
  formatLastSync,
  trimTrailingPunctuation,
  extractMeetingUrl,
} from './helpers';
import type { MoodleEvent } from '@uni-hub/types';

describe('getAssignmentStatusInfo', () => {
  it('returns graded status when completed and status is graded', () => {
    const result = getAssignmentStatusInfo('graded', true, false);

    expect(result).toEqual({
      tone: 'success',
      label: 'Оцінено',
    });
  });

  it('supports object argument signature', () => {
    const result = getAssignmentStatusInfo({
      status: 'submitted',
      isGraded: false,
      isAwaitingReview: true,
      isOverdue: false,
    });

    expect(result).toEqual({
      tone: 'warning',
      label: 'Очікує перевірки',
    });
  });

  it('returns submitted status when completed and status is submitted', () => {
    const result = getAssignmentStatusInfo('submitted', true, false);

    expect(result).toEqual({
      tone: 'success',
      label: 'Здано на перевірку',
    });
  });

  it('returns overdue status when overdue and not completed', () => {
    const result = getAssignmentStatusInfo('new', false, true);

    expect(result).toEqual({
      tone: 'danger',
      label: 'Прострочено',
    });
  });

  it('returns in-progress status when neither completed nor overdue', () => {
    const result = getAssignmentStatusInfo('new', false, false);

    expect(result).toEqual({
      tone: 'info',
      label: 'В процесі',
    });
  });

  it('returns awaiting review status when isAwaitingReview is true in 4-arg signature', () => {
    const result = getAssignmentStatusInfo('submitted', false, true, false);

    expect(result).toEqual({
      tone: 'warning',
      label: 'Очікує перевірки',
    });
  });

  it('returns graded status when isGraded is true in 4-arg signature', () => {
    const result = getAssignmentStatusInfo('graded', true, false, false);

    expect(result).toEqual({
      tone: 'success',
      label: 'Оцінено',
    });
  });

  it('returns overdue status when isOverdue is true in 4-arg signature', () => {
    const result = getAssignmentStatusInfo('new', false, false, true);

    expect(result).toEqual({
      tone: 'danger',
      label: 'Прострочено',
    });
  });
});

describe('formatLastSync', () => {
  it('formats a timestamp as DD.MM.YYYY HH:MM', () => {
    const timestamp = new Date('2026-01-05T09:07:00').getTime();
    const result = formatLastSync(timestamp);

    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  });
});

describe('trimTrailingPunctuation', () => {
  it('removes trailing punctuation marks like closing parens, dots, commas, semicolons', () => {
    expect(trimTrailingPunctuation('https://zoom.us/j/123).')).toBe('https://zoom.us/j/123');
    expect(trimTrailingPunctuation('https://meet.google.com/abc-defg-hij,')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
    expect(trimTrailingPunctuation('https://teams.microsoft.com;')).toBe(
      'https://teams.microsoft.com',
    );
  });

  it('leaves clean URLs unchanged', () => {
    expect(trimTrailingPunctuation('https://zoom.us/j/123')).toBe('https://zoom.us/j/123');
  });
});

describe('extractMeetingUrl', () => {
  it('extracts URL directly from event.url if matching pattern', () => {
    const event: MoodleEvent = {
      id: 1,
      name: 'Lecture',
      description: '',
      courseName: 'CS',
      timestart: 1000,
      formattedtime: '10:00',
      eventtype: 'course',
      url: 'https://zoom.us/j/999888777',
    };

    expect(extractMeetingUrl(event)).toBe('https://zoom.us/j/999888777');
  });

  it('extracts URL from description if event.url is missing', () => {
    const event: MoodleEvent = {
      id: 2,
      name: 'Seminar',
      description: 'Join Google Meet: https://meet.google.com/xyz-uvwx-rst! See you there.',
      courseName: 'CS',
      timestart: 1000,
      formattedtime: '12:00',
      eventtype: 'course',
    };

    expect(extractMeetingUrl(event)).toBe('https://meet.google.com/xyz-uvwx-rst');
  });

  it('returns null if no meeting link is present', () => {
    const event: MoodleEvent = {
      id: 3,
      name: 'Self-study',
      description: 'Read chapter 4',
      courseName: 'CS',
      timestart: 1000,
      formattedtime: '14:00',
      eventtype: 'course',
    };

    expect(extractMeetingUrl(event)).toBeNull();
  });
});

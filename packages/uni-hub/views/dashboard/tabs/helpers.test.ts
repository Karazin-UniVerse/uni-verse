import { describe, it, expect } from 'vitest';
import { getAssignmentStatusInfo, formatLastSync } from './helpers';

describe('getAssignmentStatusInfo', () => {
  it('returns graded status when completed and status is graded', () => {
    const result = getAssignmentStatusInfo({
      status: 'graded',
      isGraded: true,
      isAwaitingReview: false,
    });

    expect(result).toEqual({
      tone: 'success',
      label: 'Оцінено',
    });
  });

  it('returns submitted status when completed and status is submitted', () => {
    const result = getAssignmentStatusInfo({
      status: 'submitted',
      isGraded: true,
      isAwaitingReview: false,
    });

    expect(result).toEqual({
      tone: 'success',
      label: 'Здано на перевірку',
    });
  });

  it('returns overdue status when overdue and not completed', () => {
    const result = getAssignmentStatusInfo({
      status: 'new',
      isGraded: false,
      isAwaitingReview: true,
    });

    expect(result).toEqual({
      tone: 'danger',
      label: 'Прострочено',
    });
  });

  it('returns in-progress status when neither completed nor overdue', () => {
    const result = getAssignmentStatusInfo({
      status: 'new',
      isGraded: false,
      isAwaitingReview: false,
    });

    expect(result).toEqual({
      tone: 'info',
      label: 'В процесі',
    });
  });

  it('returns awaiting review status when isAwaitingReview is true with isOverdue=false', () => {
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

  it('returns graded status when isGraded is true with isOverdue=false', () => {
    const result = getAssignmentStatusInfo({
      status: 'graded',
      isGraded: true,
      isAwaitingReview: false,
      isOverdue: false,
    });

    expect(result).toEqual({
      tone: 'success',
      label: 'Оцінено',
    });
  });

  it('returns overdue status when isOverdue is true', () => {
    const result = getAssignmentStatusInfo({
      status: 'new',
      isGraded: false,
      isAwaitingReview: false,
      isOverdue: true,
    });

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

  it('pads single-digit values', () => {
    const d = new Date(2026, 0, 5, 9, 7);
    const result = formatLastSync(d.getTime());

    expect(result).toContain('05.01.2026');
  });
});

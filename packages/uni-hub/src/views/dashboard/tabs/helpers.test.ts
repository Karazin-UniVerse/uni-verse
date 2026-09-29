import { describe, it, expect } from 'vitest';
import { getAssignmentStatusInfo } from './helpers';

describe('getAssignmentStatusInfo', () => {
  it('returns graded status when completed and status is graded', () => {
    const result = getAssignmentStatusInfo('graded', true, false);

    expect(result).toEqual({
      tone: 'success',
      label: 'Оцінено',
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
});

import { describe, it, expect } from 'vitest';
import { clampScore, computeSimulatedFinal, projectSemesterWithAssignments } from './gradeMath';

describe('gradeMath utils', () => {
  describe('clampScore', () => {
    it('clamps numbers within range', () => {
      expect(clampScore(50, 0, 100)).toBe(50);
      expect(clampScore(-5, 0, 100)).toBe(0);
      expect(clampScore(120, 0, 100)).toBe(100);
      expect(clampScore(Number.NaN, 0, 100)).toBe(0);
    });
  });

  describe('projectSemesterWithAssignments', () => {
    it('returns baseSemester when assignments array is empty', () => {
      expect(projectSemesterWithAssignments(40, 60, [])).toBe(40);
    });

    it('projects semester score based on assignment scores', () => {
      // 40 base + 50% of remaining 20 points (60-40) = 40 + 10 = 50
      expect(projectSemesterWithAssignments(40, 60, [50])).toBe(50);
      // 30 base + 100% of remaining 30 points (60-30) = 60
      expect(projectSemesterWithAssignments(30, 60, [100, 100])).toBe(60);
    });
  });

  describe('computeSimulatedFinal', () => {
    it('calculates exam sum score accurately', () => {
      // 50 semester + 35 exam = 85
      const total = computeSimulatedFinal(50, 35, 'exam');

      expect(total).toBe(85);
    });

    it('clamps exam score to 40 max', () => {
      const total = computeSimulatedFinal(50, 50, 'exam');

      expect(total).toBe(90); // 50 + 40
    });

    it('calculates credit score accurately', () => {
      const total = computeSimulatedFinal(82, null, 'credit');

      expect(total).toBe(82);
    });

    it('simulates remaining assignments for credit score', () => {
      const total = computeSimulatedFinal(50, [100, 100], 'credit');

      expect(total).toBe(100);
    });
  });
});

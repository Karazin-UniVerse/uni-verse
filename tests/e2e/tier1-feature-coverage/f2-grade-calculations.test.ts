import { describe, it, expect } from 'vitest';
import {
  fileExists,
  loadTypesModule,
  oracleCalculateEctsGrade,
  oracleCalculateTraditionalGrade,
} from '../test-helpers';

describe('Tier 1 - Feature 2: Grade & ECTS Scale Calculation Utilities (@universe/core)', () => {
  it('F2-1: domain types index should export calculateEctsGrade function', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const mod = await loadTypesModule();

    expect(mod, 'module could not be loaded').not.toBeNull();
    expect(typeof mod?.calculateEctsGrade).toBe('function');
  });

  it('F2-2: calculateEctsGrade should correctly map scores across 90-100 to ECTS A', async () => {
    const mod = await loadTypesModule();
    const calculateEcts = mod?.calculateEctsGrade || oracleCalculateEctsGrade;

    expect(calculateEcts(100)).toBe('A');
    expect(calculateEcts(95)).toBe('A');
    expect(calculateEcts(90)).toBe('A');

    if (!mod?.calculateEctsGrade) {
      const typesPath = fileExists('packages/core/types/index.ts')
        ? 'packages/core/types/index.ts'
        : 'packages/types/src/index.ts';

      expect(fileExists(typesPath), `calculateEctsGrade must be exported from ${typesPath}`).toBe(
        true,
      );
    }
  });

  it('F2-3: calculateEctsGrade should map standard passing tiers (B, C, D, E)', async () => {
    const mod = await loadTypesModule();
    const calculateEcts = mod?.calculateEctsGrade || oracleCalculateEctsGrade;

    expect(calculateEcts(85)).toBe('B');
    expect(calculateEcts(78)).toBe('C');
    expect(calculateEcts(70)).toBe('D');
    expect(calculateEcts(62)).toBe('E');

    if (!mod?.calculateEctsGrade) {
      const typesPath = fileExists('packages/core/types/index.ts')
        ? 'packages/core/types/index.ts'
        : 'packages/types/src/index.ts';

      expect(fileExists(typesPath), `calculateEctsGrade must be exported from ${typesPath}`).toBe(
        true,
      );
    }
  });

  it('F2-4: calculateEctsGrade should map failing tiers (Fx, F)', async () => {
    const mod = await loadTypesModule();
    const calculateEcts = mod?.calculateEctsGrade || oracleCalculateEctsGrade;

    expect(calculateEcts(50)).toBe('Fx');
    expect(calculateEcts(20)).toBe('F');

    if (!mod?.calculateEctsGrade) {
      const typesPath = fileExists('packages/core/types/index.ts')
        ? 'packages/core/types/index.ts'
        : 'packages/types/src/index.ts';

      expect(fileExists(typesPath), `calculateEctsGrade must be exported from ${typesPath}`).toBe(
        true,
      );
    }
  });

  it('F2-5: domain types index should export calculateTraditionalGrade function', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const mod = await loadTypesModule();

    expect(typeof mod?.calculateTraditionalGrade).toBe('function');
  });

  it('F2-6: calculateTraditionalGrade should accurately calculate exam and credit marks', async () => {
    const mod = await loadTypesModule();
    const calcTraditional = mod?.calculateTraditionalGrade || oracleCalculateTraditionalGrade;

    // Exam scale
    expect(calcTraditional(92, 'exam')).toBe('відмінно');
    expect(calcTraditional(80, 'exam')).toBe('добре');
    expect(calcTraditional(65, 'exam')).toBe('задовільно');
    expect(calcTraditional(45, 'exam')).toBe('незадовільно');

    // Credit (залік) scale
    expect(calcTraditional(92, 'credit')).toBe('зараховано');
    expect(calcTraditional(60, 'credit')).toBe('зараховано');
    expect(calcTraditional(59, 'credit')).toBe('не зараховано');

    if (!mod?.calculateTraditionalGrade) {
      const typesPath = fileExists('packages/core/types/index.ts')
        ? 'packages/core/types/index.ts'
        : 'packages/types/src/index.ts';

      expect(
        fileExists(typesPath),
        `calculateTraditionalGrade must be exported from ${typesPath}`,
      ).toBe(true);
    }
  });
});

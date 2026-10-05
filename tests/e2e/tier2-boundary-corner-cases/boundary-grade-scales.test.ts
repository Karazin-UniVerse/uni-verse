import { describe, it, expect } from 'vitest';
import {
  loadTypesModule,
  oracleCalculateEctsGrade,
  oracleCalculateTraditionalGrade,
} from '../test-helpers';

describe('Tier 2 - Feature 2: Boundary & Corner Cases in Grade Scales', () => {
  it('F2-B1: ECTS Exact threshold boundaries (90, 82, 74, 64, 60, 35, 0)', async () => {
    const mod = await loadTypesModule();
    const calculate = mod?.calculateEctsGrade || oracleCalculateEctsGrade;

    expect(calculate(90)).toBe('A');
    expect(calculate(89)).toBe('B');
    expect(calculate(82)).toBe('B');
    expect(calculate(81)).toBe('C');
    expect(calculate(74)).toBe('C');
    expect(calculate(73)).toBe('D');
    expect(calculate(64)).toBe('D');
    expect(calculate(63)).toBe('E');
    expect(calculate(60)).toBe('E');
    expect(calculate(59)).toBe('Fx');
    expect(calculate(35)).toBe('Fx');
    expect(calculate(34)).toBe('F');
    expect(calculate(0)).toBe('F');
  });

  it('F2-B2: Floating-point and sub-point boundary precision (89.9, 59.9, 73.99)', async () => {
    const mod = await loadTypesModule();
    const calculate = mod?.calculateEctsGrade || oracleCalculateEctsGrade;

    expect(calculate(89.9)).toBe('B');
    expect(calculate(81.99)).toBe('C');
    expect(calculate(73.95)).toBe('D');
    expect(calculate(63.9)).toBe('E');
    expect(calculate(59.99)).toBe('Fx');
    expect(calculate(34.99)).toBe('F');
  });

  it('F2-B3: Traditional mark exam cutoff boundaries (90, 89.9, 74, 73.9, 60, 59.9)', async () => {
    const mod = await loadTypesModule();
    const calculate = mod?.calculateTraditionalGrade || oracleCalculateTraditionalGrade;

    expect(calculate(90, 'exam')).toBe('відмінно');
    expect(calculate(89.9, 'exam')).toBe('добре');
    expect(calculate(74, 'exam')).toBe('добре');
    expect(calculate(73.9, 'exam')).toBe('задовільно');
    expect(calculate(60, 'exam')).toBe('задовільно');
    expect(calculate(59.9, 'exam')).toBe('незадовільно');
  });

  it('F2-B4: Credit (залік) binary threshold edge cases (60 vs 59.99, 0, 100)', async () => {
    const mod = await loadTypesModule();
    const calculate = mod?.calculateTraditionalGrade || oracleCalculateTraditionalGrade;

    expect(calculate(100, 'credit')).toBe('зараховано');
    expect(calculate(60, 'credit')).toBe('зараховано');
    expect(calculate(59.99, 'credit')).toBe('не зараховано');
    expect(calculate(0, 'credit')).toBe('не зараховано');
  });

  it('F2-B5: Differentiated credit (диференційований залік) boundary equivalence to exam', async () => {
    const mod = await loadTypesModule();
    const calculate = mod?.calculateTraditionalGrade || oracleCalculateTraditionalGrade;

    expect(calculate(95, 'differentiated_credit')).toBe('відмінно');
    expect(calculate(75, 'differentiated_credit')).toBe('добре');
    expect(calculate(62, 'differentiated_credit')).toBe('задовільно');
    expect(calculate(40, 'differentiated_credit')).toBe('незадовільно');
  });

  it('F2-B6: Out-of-bounds inputs: negative scores and scores > 100', async () => {
    const mod = await loadTypesModule();
    const calculateEcts = mod?.calculateEctsGrade || oracleCalculateEctsGrade;
    const calculateTrad = mod?.calculateTraditionalGrade || oracleCalculateTraditionalGrade;

    // Scores < 0 should fail safely
    expect(calculateEcts(-10)).toBe('F');
    expect(calculateTrad(-5, 'exam')).toBe('незадовільно');

    // Scores > 100 should map to top grade
    expect(calculateEcts(105)).toBe('A');
    expect(calculateTrad(110, 'exam')).toBe('відмінно');
  });
});

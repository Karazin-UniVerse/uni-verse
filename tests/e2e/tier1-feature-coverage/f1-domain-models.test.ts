import { describe, it, expect } from 'vitest';
import {
  fileExists,
  readWorkspaceFile,
  mockStudentProfile,
  mockCurriculumItems,
  mockGradeRecords,
} from '../test-helpers';

describe('Tier 1 - Feature 1: Shared Core Domain Models (@universe/types)', () => {
  it('F1-1: packages/types package.json should be valid and configure exports', () => {
    expect(fileExists('packages/types/package.json')).toBe(true);
    const pkg = JSON.parse(readWorkspaceFile('packages/types/package.json'));

    expect(pkg.name).toBe('@universe/types');
    expect(pkg.private).toBe(true);
  });

  it('F1-2: packages/types/src/index.ts should declare StudentProfile model contract', async () => {
    expect(
      fileExists('packages/types/src/index.ts'),
      'packages/types/src/index.ts must exist',
    ).toBe(true);
    const content = readWorkspaceFile('packages/types/src/index.ts');

    expect(content).toContain('interface StudentProfile');
    expect(content).toContain('fullName');
    expect(content).toContain('recordBookNumber');
    expect(content).toContain('academicStanding');
    expect(content).toContain('gpa');

    // Structural validation with mock fixture
    expect(mockStudentProfile.fullName).toBe('Барсуков Родіон Сергійович');
    expect(mockStudentProfile.recordBookNumber).toBe('ЗК-2024-042');
    expect(mockStudentProfile.academicStanding).toBe('honors');
  });

  it('F1-3: packages/types/src/index.ts should declare CurriculumItem model contract', async () => {
    expect(
      fileExists('packages/types/src/index.ts'),
      'packages/types/src/index.ts must exist',
    ).toBe(true);
    const content = readWorkspaceFile('packages/types/src/index.ts');

    expect(content).toContain('interface CurriculumItem');
    expect(content).toContain('controlType');
    expect(content).toContain('instructors');
    expect(content).toContain('credits');

    // Structural validation with mock fixture
    expect(mockCurriculumItems.length).toBeGreaterThan(0);
    expect(mockCurriculumItems[0].controlType).toBe('exam');
    expect(mockCurriculumItems[0].credits).toBe(5);
  });

  it('F1-4: packages/types/src/index.ts should declare StudentRecordBookItem / GradeRecord model contract', async () => {
    expect(
      fileExists('packages/types/src/index.ts'),
      'packages/types/src/index.ts must exist',
    ).toBe(true);
    const content = readWorkspaceFile('packages/types/src/index.ts');

    expect(content).toMatch(/interface StudentRecordBookItem|type GradeRecord/);
    expect(content).toContain('ectsGrade');
    expect(content).toContain('traditionalGrade');
    expect(content).toContain('totalScore');

    // Structural validation with mock fixture
    expect(mockGradeRecords[0].totalScore).toBe(92);
    expect(mockGradeRecords[0].ectsGrade).toBe('A');
    expect(mockGradeRecords[0].traditionalGrade).toBe('відмінно');
  });

  it('F1-5: packages/types/src/index.ts should declare AssignmentItem, ScheduleItem, and LmsConnectionStatus', async () => {
    expect(
      fileExists('packages/types/src/index.ts'),
      'packages/types/src/index.ts must exist',
    ).toBe(true);
    const content = readWorkspaceFile('packages/types/src/index.ts');

    expect(content).toContain('interface AssignmentItem');
    expect(content).toContain('duedate');
    expect(content).toContain('submissionStatus');
    expect(content).toContain('interface ScheduleItem');
    expect(content).toContain('interface LmsConnectionStatus');
    expect(content).toContain('isConnected');
  });

  it('F1-6: packages/types should define essential union literal types', async () => {
    expect(
      fileExists('packages/types/src/index.ts'),
      'packages/types/src/index.ts must exist',
    ).toBe(true);
    const content = readWorkspaceFile('packages/types/src/index.ts');

    expect(content).toContain('type EctsGrade');
    expect(content).toContain("'A'");
    expect(content).toContain("'F'");
    expect(content).toContain('type TraditionalGrade');
    expect(content).toContain("'відмінно'");
    expect(content).toContain("'зараховано'");
    expect(content).toContain('type ControlType');
  });
});

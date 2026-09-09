import { describe, it, expect } from 'vitest';
import {
  fileExists,
  readWorkspaceFile,
  mockStudentProfile,
  mockCurriculumItems,
  mockGradeRecords,
} from '../test-helpers';

describe('Tier 1 - Feature 1: Shared Core Domain Models (@universe/core)', () => {
  it('F1-1: packages/core package.json should be valid and configure exports', () => {
    const corePkgExists = fileExists('packages/core/package.json');
    const typesPkgExists = fileExists('packages/types/package.json');

    expect(corePkgExists || typesPkgExists).toBe(true);

    const pkgPath = corePkgExists ? 'packages/core/package.json' : 'packages/types/package.json';
    const pkg = JSON.parse(readWorkspaceFile(pkgPath));

    expect(['@universe/core', '@universe/types']).toContain(pkg.name);
    expect(pkg.private).toBe(true);
  });

  it('F1-2: domain types index should declare StudentProfile model contract', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const content = readWorkspaceFile(typesPath);

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

  it('F1-3: domain types index should declare CurriculumItem model contract', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const content = readWorkspaceFile(typesPath);

    expect(content).toContain('interface CurriculumItem');
    expect(content).toContain('controlType');
    expect(content).toContain('instructors');
    expect(content).toContain('credits');

    // Structural validation with mock fixture
    expect(mockCurriculumItems.length).toBeGreaterThan(0);
    expect(mockCurriculumItems[0].controlType).toBe('exam');
    expect(mockCurriculumItems[0].credits).toBe(5);
  });

  it('F1-4: domain types index should declare StudentRecordBookItem / GradeRecord model contract', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const content = readWorkspaceFile(typesPath);

    expect(content).toMatch(/interface StudentRecordBookItem|type GradeRecord/);
    expect(content).toContain('ectsGrade');
    expect(content).toContain('traditionalGrade');
    expect(content).toContain('totalScore');

    // Structural validation with mock fixture
    expect(mockGradeRecords[0].totalScore).toBe(92);
    expect(mockGradeRecords[0].ectsGrade).toBe('A');
    expect(mockGradeRecords[0].traditionalGrade).toBe('відмінно');
  });

  it('F1-5: domain types index should declare AssignmentItem, ScheduleItem, and LmsConnectionStatus', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const content = readWorkspaceFile(typesPath);

    expect(content).toContain('interface AssignmentItem');
    expect(content).toContain('duedate');
    expect(content).toContain('submissionStatus');
    expect(content).toContain('interface ScheduleItem');
    expect(content).toContain('interface LmsConnectionStatus');
    expect(content).toContain('isConnected');
  });

  it('F1-6: domain types index should define essential union literal types', async () => {
    const typesPath = fileExists('packages/core/types/index.ts')
      ? 'packages/core/types/index.ts'
      : 'packages/types/src/index.ts';

    expect(fileExists(typesPath), `${typesPath} must exist`).toBe(true);
    const content = readWorkspaceFile(typesPath);

    expect(content).toContain('type EctsGrade');
    expect(content).toContain("'A'");
    expect(content).toContain("'F'");
    expect(content).toContain('type TraditionalGrade');
    expect(content).toContain("'відмінно'");
    expect(content).toContain("'зараховано'");
    expect(content).toContain('type ControlType');
  });
});

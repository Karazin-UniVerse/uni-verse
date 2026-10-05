import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  calculateAccumulatedGrade,
  calculateEctsGrade,
  calculateExamTargets,
  calculateTraditionalGrade,
} from '../grades.ts';

describe('calculateEctsGrade', () => {
  test('assigns A for scores >= 90', () => {
    assert.strictEqual(calculateEctsGrade(100), 'A');
    assert.strictEqual(calculateEctsGrade(95), 'A');
    assert.strictEqual(calculateEctsGrade(90), 'A');
  });

  test('assigns B for scores in range [82, 90)', () => {
    assert.strictEqual(calculateEctsGrade(89.9), 'B');
    assert.strictEqual(calculateEctsGrade(85), 'B');
    assert.strictEqual(calculateEctsGrade(82), 'B');
  });

  test('assigns C for scores in range [74, 82)', () => {
    assert.strictEqual(calculateEctsGrade(81.9), 'C');
    assert.strictEqual(calculateEctsGrade(78), 'C');
    assert.strictEqual(calculateEctsGrade(74), 'C');
  });

  test('assigns D for scores in range [64, 74)', () => {
    assert.strictEqual(calculateEctsGrade(73.9), 'D');
    assert.strictEqual(calculateEctsGrade(68), 'D');
    assert.strictEqual(calculateEctsGrade(64), 'D');
  });

  test('assigns E for scores in range [60, 64)', () => {
    assert.strictEqual(calculateEctsGrade(63.9), 'E');
    assert.strictEqual(calculateEctsGrade(62), 'E');
    assert.strictEqual(calculateEctsGrade(60), 'E');
  });

  test('assigns Fx for scores in range [35, 60)', () => {
    assert.strictEqual(calculateEctsGrade(59.9), 'Fx');
    assert.strictEqual(calculateEctsGrade(45), 'Fx');
    assert.strictEqual(calculateEctsGrade(35), 'Fx');
  });

  test('assigns F for scores < 35', () => {
    assert.strictEqual(calculateEctsGrade(34.9), 'F');
    assert.strictEqual(calculateEctsGrade(20), 'F');
    assert.strictEqual(calculateEctsGrade(0), 'F');
  });
});

describe('calculateTraditionalGrade', () => {
  describe('exam grading', () => {
    test('assigns відмінно for score >= 90', () => {
      assert.strictEqual(calculateTraditionalGrade(100), 'відмінно');
      assert.strictEqual(calculateTraditionalGrade(90, 'exam'), 'відмінно');
    });

    test('assigns добре for score in range [70, 90)', () => {
      assert.strictEqual(calculateTraditionalGrade(89.9, 'exam'), 'добре');
      assert.strictEqual(calculateTraditionalGrade(70, 'exam'), 'добре');
    });

    test('assigns задовільно for score in range [50, 70)', () => {
      assert.strictEqual(calculateTraditionalGrade(69.9, 'exam'), 'задовільно');
      assert.strictEqual(calculateTraditionalGrade(50, 'exam'), 'задовільно');
    });

    test('assigns незадовільно for score < 50', () => {
      assert.strictEqual(calculateTraditionalGrade(49.9, 'exam'), 'незадовільно');
      assert.strictEqual(calculateTraditionalGrade(30, 'exam'), 'незадовільно');
      assert.strictEqual(calculateTraditionalGrade(0, 'exam'), 'незадовільно');
    });
  });

  describe('credit grading', () => {
    test('assigns зараховано for score >= 50', () => {
      assert.strictEqual(calculateTraditionalGrade(100, 'credit'), 'зараховано');
      assert.strictEqual(calculateTraditionalGrade(50, 'credit'), 'зараховано');
    });

    test('assigns не зараховано for score < 50', () => {
      assert.strictEqual(calculateTraditionalGrade(49.9, 'credit'), 'не зараховано');
      assert.strictEqual(calculateTraditionalGrade(0, 'credit'), 'не зараховано');
    });
  });

  describe('differentiated credit grading', () => {
    test('uses standard multi-tier marks for differentiated_credit', () => {
      assert.strictEqual(calculateTraditionalGrade(95, 'differentiated_credit'), 'відмінно');
      assert.strictEqual(calculateTraditionalGrade(75, 'differentiated_credit'), 'добре');
      assert.strictEqual(calculateTraditionalGrade(55, 'differentiated_credit'), 'задовільно');
      assert.strictEqual(calculateTraditionalGrade(40, 'differentiated_credit'), 'незадовільно');
    });
  });
});

describe('calculateAccumulatedGrade', () => {
  describe('exam grading', () => {
    test('denies admission when semesterScore < 30', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 28,
        controlType: 'exam',
        examScore: 35,
      });

      assert.strictEqual(result.isAdmittedToExam, false);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.totalScore, 28);
      assert.strictEqual(result.traditionalGrade, 'незадовільно');
    });

    test('admits student when semesterScore >= 30 but exam has not been taken yet', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 45,
        controlType: 'exam',
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.totalScore, 45);
    });

    test('fails student if exam score < 20 even if sum is >= 50', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 40,
        controlType: 'exam',
        examScore: 18,
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, false);
      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.totalScore, 58);
      assert.strictEqual(result.traditionalGrade, 'задовільно');
    });

    test('passes student when semester >= 30 and exam >= 20 and total >= 50', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 35,
        controlType: 'exam',
        examScore: 25,
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, true);
      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.totalScore, 60);
      assert.strictEqual(result.ectsGrade, 'E');
      assert.strictEqual(result.traditionalGrade, 'задовільно');
    });

    test('assigns A when totalScore >= 90', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 55,
        controlType: 'exam',
        examScore: 38,
      });

      assert.strictEqual(result.isAdmittedToExam, true);
      assert.strictEqual(result.isExamPassed, true);
      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.totalScore, 93);
      assert.strictEqual(result.ectsGrade, 'A');
      assert.strictEqual(result.traditionalGrade, 'відмінно');
    });

    test('handles semester score clamping (max 60, min 0)', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 75,
        controlType: 'exam',
        examScore: 30,
      });

      assert.strictEqual(result.totalScore, 90);
    });
  });

  describe('credit and differentiated credit grading', () => {
    test('passes credit course when semesterScore >= 50', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 55,
        controlType: 'credit',
      });

      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.traditionalGrade, 'зараховано');
    });

    test('fails credit course when semesterScore < 50', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 48,
        controlType: 'credit',
      });

      assert.strictEqual(result.isCoursePassed, false);
      assert.strictEqual(result.traditionalGrade, 'не зараховано');
    });

    test('correctly evaluates differentiated credit tiers', () => {
      const result = calculateAccumulatedGrade({
        semesterScore: 72,
        controlType: 'differentiated_credit',
      });

      assert.strictEqual(result.isCoursePassed, true);
      assert.strictEqual(result.traditionalGrade, 'добре');
    });
  });
});

describe('calculateExamTargets', () => {
  test('calculates accurate required scores for high semester score (56/60)', () => {
    const targets = calculateExamTargets(56);
    const targetA = targets.find((t) => t.grade === 'A');
    const targetB = targets.find((t) => t.grade === 'B');

    assert.ok(targetA);
    assert.strictEqual(targetA.requiredExamScore, 34);
    assert.strictEqual(targetA.isAchievable, true);

    assert.ok(targetB);
    assert.strictEqual(targetB.requiredExamScore, 26);
    assert.strictEqual(targetB.isAchievable, true);
  });

  test('marks unreachable targets for low semester score (40/60)', () => {
    const targets = calculateExamTargets(40);
    const targetA = targets.find((t) => t.grade === 'A');

    assert.ok(targetA);
    assert.strictEqual(targetA.requiredExamScore, 50);
    assert.strictEqual(targetA.isAchievable, false);
  });

  test('marks all targets unachievable when semester score is below admission threshold (< 30)', () => {
    const targets = calculateExamTargets(25);

    for (const target of targets) {
      assert.strictEqual(target.isAchievable, false);
    }
  });

  test('clamps maximum semester score to 60', () => {
    const targets = calculateExamTargets(75);
    const targetA = targets.find((t) => t.grade === 'A');

    assert.ok(targetA);
    assert.strictEqual(targetA.requiredExamScore, 30);
  });
});

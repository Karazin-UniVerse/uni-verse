import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { parseCurriculumWorkbook, toImportedAssignments } from '../curriculum.ts';

const row = (cells: Record<number, string>): string[] => {
  const result: string[] = [];

  for (const [col, value] of Object.entries(cells)) {
    result[Number(col)] = value;
  }

  return Array.from(result, (cell) => cell ?? '');
};

// Shape of a «Робочий навчальний план» sheet: two semester blocks with hours by type.
const workingGrid = [
  row({ 17: "спеціальності  F3 Комп'ютерні науки" }),
  row({ 17: 'Рік навчання   2        форма здобуття освіти денна' }),
  row({ 0: '№ з/п', 1: 'Освітні компоненти', 23: 'I семестр', 45: 'II семестр', 67: 'Кафедра' }),
  row({
    27: 'лекції',
    29: 'лабораторні',
    31: 'практичні',
    33: 'семінари',
    49: 'лекції',
    51: 'лабораторні',
    53: 'практичні',
    55: 'семінари',
  }),
  row({
    0: '1',
    1: 'Бази даних',
    27: '32',
    29: '16',
    31: '16',
    49: '32',
    51: '16',
    53: '16',
    67: 'ММАД',
  }),
  row({ 0: 'Блок А "Розподілені системи"' }),
  row({ 0: '2', 1: 'Філософія', 49: '32', 55: '15' }),
  row({ 1: 'Разом', 27: '64' }),
  row({ 0: '3', 1: 'Після підсумку', 27: '32' }),
];

// Shape of a «Навчальний план» sheet: whole-programme hours plus weekly hours per semester.
const programGrid = [
  row({
    1: 'Код о/к',
    2: 'Освітні компоненти',
    17: 'Розподіл аудиторних годин на тиждень за семестрами',
  }),
  row({
    12: 'Лекції',
    13: 'Лабораторні',
    14: 'Практичні',
    15: 'Семінари',
    17: '1',
    18: '2',
    19: '3',
  }),
  row({ 17: 'Кількість тижнів в семестрі' }),
  row({ 17: '16', 18: '16', 19: '12' }),
  row({ 1: "1 ОБОВ'ЯЗКОВІ НАВЧАЛЬНІ ДИСЦИПЛІНИ" }),
  row({ 1: 'ОК01', 2: 'Історія України', 12: '32', 15: '16', 17: '3' }),
  row({ 1: 'ОК02', 2: 'Вища математика', 12: '80', 14: '80', 17: '4', 18: '6' }),
  row({ 1: "Разом за обов'язковими", 12: '112' }),
];

describe('curriculum workbook parsing', () => {
  test('reads both semesters of a working plan and stops at the summary row', () => {
    const [sheet] = parseCurriculumWorkbook([{ name: '2курс', grid: workingGrid }]);

    assert.equal(sheet.kind, 'WORKING');
    assert.equal(sheet.specialty, "F3 Комп'ютерні науки");
    assert.deepEqual(
      sheet.terms.map((term) => [term.courseYear, term.semester, term.disciplines.length]),
      [
        [2, 1, 1],
        [2, 2, 2],
      ],
    );
    assert.deepEqual(sheet.terms[0].disciplines[0], {
      title: 'Бази даних',
      department: 'ММАД',
      hours: { LECTURE: 32, LABORATORY: 16, PRACTICAL: 16, SEMINAR: 0 },
      notes: [],
    });
  });

  test('rounds odd hours to whole pairs and marks the discipline', () => {
    const [sheet] = parseCurriculumWorkbook([{ name: '2курс', grid: workingGrid }]);
    const philosophy = sheet.terms[1].disciplines.find(({ title }) => title === 'Філософія');

    assert.equal(philosophy?.hours.SEMINAR, 16);
    assert.deepEqual(philosophy?.notes, ['ROUNDED']);
  });

  test('splits programme hours across semesters by weekly load', () => {
    const [sheet] = parseCurriculumWorkbook([{ name: 'НП', grid: programGrid }]);

    assert.equal(sheet.kind, 'PROGRAM');
    assert.deepEqual(
      sheet.terms.map((term) => [term.courseYear, term.semester]),
      [
        [1, 1],
        [1, 2],
      ],
    );

    const [history, mathFirst] = sheet.terms[0].disciplines;
    const mathSecond = sheet.terms[1].disciplines[0];

    assert.deepEqual(history.hours, { LECTURE: 32, LABORATORY: 0, PRACTICAL: 0, SEMINAR: 16 });
    assert.deepEqual(history.notes, []);
    assert.deepEqual(mathFirst.hours, { LECTURE: 32, LABORATORY: 0, PRACTICAL: 32, SEMINAR: 0 });
    assert.deepEqual(mathSecond.hours, { LECTURE: 48, LABORATORY: 0, PRACTICAL: 48, SEMINAR: 0 });
    assert.deepEqual(mathSecond.notes, ['DISTRIBUTED']);
  });

  test('preserves total hours when small loads span four semesters', () => {
    const grid = [
      row({ 2: 'Освітні компоненти', 17: 'Розподіл аудиторних годин на тиждень за семестрами' }),
      row({ 12: 'Лекції', 17: '1', 18: '2', 19: '3', 20: '4' }),
      row({ 17: 'Кількість тижнів в семестрі' }),
      row({ 17: '16', 18: '16', 19: '16', 20: '16' }),
      row({ 1: 'ОК01', 2: 'Математика', 12: '4', 17: '1', 18: '1', 19: '1', 20: '1' }),
    ];
    const [sheet] = parseCurriculumWorkbook([{ name: 'НП', grid }]);
    const total = sheet.terms.reduce(
      (sum, term) =>
        sum + term.disciplines.reduce((hours, discipline) => hours + discipline.hours.LECTURE, 0),
      0,
    );

    assert.equal(total, 4);
  });

  test('skips sheets that are not curricula', () => {
    assert.deepEqual(
      parseCurriculumWorkbook([{ name: 'Графік', grid: [row({ 0: 'Вересень' })] }]),
      [],
    );
  });

  test('creates one assignment per teaching type with hours', () => {
    const [sheet] = parseCurriculumWorkbook([{ name: '2курс', grid: workingGrid }]);

    assert.deepEqual(toImportedAssignments(sheet.terms[0].disciplines), [
      { disciplineTitle: 'Бази даних', teachingType: 'LECTURE', academicHours: 32 },
      { disciplineTitle: 'Бази даних', teachingType: 'LABORATORY', academicHours: 16 },
      { disciplineTitle: 'Бази даних', teachingType: 'PRACTICAL', academicHours: 16 },
    ]);
  });
});

import {
  ACADEMIC_HOURS_PER_PAIR,
  CURRICULUM_DISCIPLINE_NOTE,
  CURRICULUM_SHEET_KIND,
  DEFAULT_NOMINAL_WEEKS,
  TIMETABLE_ASSIGNMENT_TEACHING_TYPE,
} from '../constants/timetable.ts';
import type {
  CurriculumDisciplineNote,
  TimetableAssignmentTeachingType,
} from '../constants/timetable.ts';
import type {
  CurriculumDiscipline,
  CurriculumHoursByType,
  CurriculumTerm,
  ImportedTeachingAssignmentRequest,
  ParsedCurriculumSheet,
  SpreadsheetGrid,
  SpreadsheetSheet,
} from '../types/timetable.ts';

type CellPosition = { row: number; col: number };

type TypeColumns = Partial<Record<TimetableAssignmentTeachingType, number>>;

const TYPE_HEADERS: ReadonlyArray<[string, TimetableAssignmentTeachingType]> = [
  ['лекції', TIMETABLE_ASSIGNMENT_TEACHING_TYPE.LECTURE],
  ['лабораторні', TIMETABLE_ASSIGNMENT_TEACHING_TYPE.LABORATORY],
  ['практичні', TIMETABLE_ASSIGNMENT_TEACHING_TYPE.PRACTICAL],
  ['семінари', TIMETABLE_ASSIGNMENT_TEACHING_TYPE.SEMINAR],
];

const TITLE_HEADER = 'освітні компоненти';
const SUMMARY_ROW_PREFIXES = ['разом', 'загальний обсяг', 'всього'];
const SEMESTERS_PER_YEAR = 2;

const normalize = (value: string | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const cellAt = (grid: SpreadsheetGrid, { row, col }: CellPosition): string =>
  grid[row]?.[col]?.trim() ?? '';

const findCell = (
  grid: SpreadsheetGrid,
  matches: (normalized: string) => boolean,
  fromRow = 0,
): CellPosition | null => {
  for (let row = fromRow; row < grid.length; row += 1) {
    const cells = grid[row] ?? [];

    for (let col = 0; col < cells.length; col += 1) {
      if (matches(normalize(cells[col]))) {
        return { row, col };
      }
    }
  }

  return null;
};

const parseNumber = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyHours = (): CurriculumHoursByType => ({
  LECTURE: 0,
  LABORATORY: 0,
  PRACTICAL: 0,
  SEMINAR: 0,
});

const toPairHours = (hours: number): number =>
  Math.max(0, Math.round(hours / ACADEMIC_HOURS_PER_PAIR) * ACADEMIC_HOURS_PER_PAIR);

const isSummaryTitle = (title: string): boolean => {
  const normalized = normalize(title);

  return SUMMARY_ROW_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

const hasHours = (hours: CurriculumHoursByType): boolean =>
  Object.values(hours).some((value) => value > 0);

type DisciplineDraft = {
  title: string;
  rawHours: CurriculumHoursByType;
  notes: CurriculumDisciplineNote[];
  department?: string;
};

/** Rounds each type to whole pairs and records whether anything changed. */
const buildDiscipline = ({
  title,
  rawHours,
  notes,
  department,
}: DisciplineDraft): CurriculumDiscipline => {
  const hours = emptyHours();
  let isRounded = false;

  for (const [type, value] of Object.entries(rawHours) as Array<
    [TimetableAssignmentTeachingType, number]
  >) {
    hours[type] = toPairHours(value);
    isRounded ||= hours[type] !== value;
  }

  return {
    title: title.replace(/\s+/g, ' ').trim(),
    ...(department ? { department } : {}),
    hours,
    notes: isRounded ? [...notes, CURRICULUM_DISCIPLINE_NOTE.ROUNDED] : notes,
  };
};

const readTypeColumns = (grid: SpreadsheetGrid, row: number, occurrence: number): TypeColumns => {
  const columns: TypeColumns = {};

  for (const [header, type] of TYPE_HEADERS) {
    let seen = 0;

    (grid[row] ?? []).forEach((value, col) => {
      if (normalize(value) === header) {
        if (seen === occurrence) {
          columns[type] = col;
        }

        seen += 1;
      }
    });
  }

  return columns;
};

const readHours = (
  grid: SpreadsheetGrid,
  row: number,
  columns: TypeColumns,
): CurriculumHoursByType => {
  const hours = emptyHours();

  for (const [type, col] of Object.entries(columns) as Array<
    [TimetableAssignmentTeachingType, number]
  >) {
    hours[type] = parseNumber(cellAt(grid, { row, col }));
  }

  return hours;
};

const readSpecialty = (grid: SpreadsheetGrid): string | undefined => {
  const position = findCell(grid, (value) => value.startsWith('спеціальності'));

  return position
    ? cellAt(grid, position)
        .replace(/^спеціальності/i, '')
        .trim() || undefined
    : undefined;
};

/** Робочий навчальний план: one course year per sheet, hours by type for each semester. */
const parseWorkingSheet = (sheet: SpreadsheetSheet): ParsedCurriculumSheet | null => {
  const { grid } = sheet;
  const titleHeader = findCell(grid, (value) => value === TITLE_HEADER);
  const yearCell = findCell(grid, (value) => /^рік навчання\s*\d/.test(value));

  if (!titleHeader || !yearCell) {
    return null;
  }

  const typeRow = findCell(grid, (value) => value === 'лекції', titleHeader.row)?.row;

  if (typeRow === undefined) {
    return null;
  }

  const courseYear = Number(/\d+/.exec(normalize(cellAt(grid, yearCell)))?.[0]);
  const numberCol = titleHeader.col - 1;
  const departmentCol = (grid[titleHeader.row] ?? []).findIndex(
    (value) => normalize(value) === 'кафедра',
  );
  const semesterColumns = [readTypeColumns(grid, typeRow, 0), readTypeColumns(grid, typeRow, 1)];
  const terms: CurriculumTerm[] = semesterColumns.map((_, index) => ({
    courseYear,
    semester: index + 1,
    disciplines: [],
  }));

  for (let row = typeRow + 1; row < grid.length; row += 1) {
    const title = cellAt(grid, { row, col: titleHeader.col });

    if (isSummaryTitle(title)) {
      break;
    }

    if (!title || !/^\d+$/.test(cellAt(grid, { row, col: numberCol }))) {
      continue;
    }

    const department =
      departmentCol >= 0 ? cellAt(grid, { row, col: departmentCol }) || undefined : undefined;

    semesterColumns.forEach((columns, index) => {
      const hours = readHours(grid, row, columns);

      if (hasHours(hours)) {
        terms[index].disciplines.push(
          buildDiscipline({ title, rawHours: hours, notes: [], department }),
        );
      }
    });
  }

  return {
    sheetName: sheet.name,
    kind: CURRICULUM_SHEET_KIND.WORKING,
    specialty: readSpecialty(grid),
    terms: terms.filter((term) => term.disciplines.length > 0),
  };
};

/**
 * Splits whole-programme hours of one type across semesters in proportion to the weekly
 * classroom load, rounding cumulative boundaries so whole-pair totals stay unchanged.
 */
const distributeHours = (total: number, shares: number[]): number[] => {
  const shareSum = shares.reduce((sum, share) => sum + share, 0);
  const roundedTotal = toPairHours(total);
  let cumulativeShare = 0;
  let allocated = 0;

  return shares.map((share) => {
    cumulativeShare += share;
    const boundary = toPairHours((roundedTotal * cumulativeShare) / shareSum);
    const part = boundary - allocated;

    allocated = boundary;

    return part;
  });
};

/** Навчальний план програми: whole-programme hours by type plus weekly hours per semester. */
const parseProgramSheet = (sheet: SpreadsheetSheet): ParsedCurriculumSheet | null => {
  const { grid } = sheet;
  const titleHeader = findCell(grid, (value) => value === TITLE_HEADER);
  const weeklyHeader = findCell(grid, (value) => value.includes('на тиждень'));

  if (!titleHeader || !weeklyHeader) {
    return null;
  }

  const typeRow = findCell(grid, (value) => value === 'лекції', titleHeader.row)?.row;

  if (typeRow === undefined) {
    return null;
  }

  const typeColumns = readTypeColumns(grid, typeRow, 0);
  const semesterColumns = (grid[typeRow] ?? []).flatMap((value, col) =>
    col >= weeklyHeader.col && /^\d$/.test(value.trim())
      ? [{ semester: Number(value.trim()), col }]
      : [],
  );
  const weeksRow = findCell(grid, (value) => value.startsWith('кількість тижнів'), typeRow);
  const weeksValuesRow = weeksRow ? weeksRow.row + 1 : -1;
  const codeCol = titleHeader.col - 1;
  const terms = new Map<number, CurriculumTerm>();

  for (let row = Math.max(typeRow, weeksValuesRow) + 1; row < grid.length; row += 1) {
    const title = cellAt(grid, { row, col: titleHeader.col });
    const code = cellAt(grid, { row, col: codeCol });

    if (
      !title ||
      !code ||
      isSummaryTitle(title) ||
      isSummaryTitle(code) ||
      normalize(title) === TITLE_HEADER
    ) {
      continue;
    }

    const loads = semesterColumns
      .map(({ semester, col }) => {
        const weeks =
          parseNumber(cellAt(grid, { row: weeksValuesRow, col })) || DEFAULT_NOMINAL_WEEKS;

        return { semester, load: parseNumber(cellAt(grid, { row, col })) * weeks };
      })
      .filter(({ load }) => load > 0);

    if (loads.length === 0) {
      continue;
    }

    const totals = readHours(grid, row, typeColumns);
    const perSemester = loads.map(emptyHours);

    for (const type of Object.keys(totals) as TimetableAssignmentTeachingType[]) {
      distributeHours(
        totals[type],
        loads.map(({ load }) => load),
      ).forEach((hours, index) => {
        perSemester[index][type] = hours;
      });
    }

    const notes = loads.length > 1 ? [CURRICULUM_DISCIPLINE_NOTE.DISTRIBUTED] : [];

    loads.forEach(({ semester }, index) => {
      if (!hasHours(perSemester[index])) {
        return;
      }

      const term = terms.get(semester) ?? {
        courseYear: Math.ceil(semester / SEMESTERS_PER_YEAR),
        semester: ((semester - 1) % SEMESTERS_PER_YEAR) + 1,
        disciplines: [],
      };

      term.disciplines.push(buildDiscipline({ title, rawHours: perSemester[index], notes }));
      terms.set(semester, term);
    });
  }

  return {
    sheetName: sheet.name,
    kind: CURRICULUM_SHEET_KIND.PROGRAM,
    specialty: readSpecialty(grid),
    terms: [...terms.entries()].sort(([left], [right]) => left - right).map(([, term]) => term),
  };
};

/** Reads every sheet that looks like a curriculum (РНП or НП) and skips the rest. */
export const parseCurriculumWorkbook = (sheets: SpreadsheetSheet[]): ParsedCurriculumSheet[] =>
  sheets.flatMap((sheet) => {
    const parsed = parseProgramSheet(sheet) ?? parseWorkingSheet(sheet);

    return parsed && parsed.terms.length > 0 ? [parsed] : [];
  });

/** One teaching assignment per teaching type that has hours. */
export const toImportedAssignments = (
  disciplines: CurriculumDiscipline[],
): ImportedTeachingAssignmentRequest[] =>
  disciplines.flatMap((discipline) =>
    TYPE_HEADERS.flatMap(([, teachingType]) =>
      discipline.hours[teachingType] > 0
        ? [
            {
              disciplineTitle: discipline.title,
              teachingType,
              academicHours: discipline.hours[teachingType],
            },
          ]
        : [],
    ),
  );

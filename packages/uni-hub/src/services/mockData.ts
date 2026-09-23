import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  NotificationsResponse,
  CourseStatistics,
} from '@uni-hub/types';
import type { GetAssignmentsParams } from './api';

export const mockCourses: Course[] = [
  {
    id: 101,
    fullname: 'Алгоритми та структури даних',
    shortname: 'АСД-302',
    summary: 'Асимптотичний аналіз, динамічне програмування, графи, дерева пошуку.',
    year: 2026,
    semester: 5,
  },
  {
    id: 102,
    fullname: 'Паралельні та розподілені обчислення',
    shortname: 'ПРО-301',
    summary: 'Архітектура паралельних систем, MPI, OpenMP, багатопотоковість.',
    year: 2026,
    semester: 5,
  },
  {
    id: 103,
    fullname: 'Організація баз даних',
    shortname: 'ОБД-303',
    summary: 'Реляційні бази даних, SQL, транзакції, індексація.',
    year: 2026,
    semester: 5,
  },
  {
    id: 104,
    fullname: 'Філософія та наукове мислення',
    shortname: 'ФНМ-105',
    summary: 'Критичне мислення, етика технологій та штучного інтелекту.',
    year: 2026,
    semester: 5,
  },
];

const now = Math.floor(Date.now() / 1000);

export const mockAssignments: Assignment[] = [
  {
    id: 201,
    courseName: 'Алгоритми та структури даних',
    name: 'Лабораторна робота №3: Двійкові дерева та АВЛ-балансування',
    description:
      'Реалізувати алгоритми вставки, видалення та балансування вершин АВЛ-дерева мовою TypeScript/C++.',
    duedate: now + 86400 * 2, // 2 days in future
    submissionStatus: 'graded',
    grade: '95',
    graded: true,
    year: 2026,
    semester: 5,
  },
  {
    id: 202,
    courseName: 'Паралельні та розподілені обчислення',
    name: 'Розрахунково-графічна робота №1: Модель передачі повідомлень (MPI)',
    description:
      'Розробити паралельну програму множення матриць великого розміру за допомогою бібліотеки MPI.',
    duedate: now + 86400 * 5, // 5 days in future
    submissionStatus: 'draft',
    grade: null,
    graded: false,
    year: 2026,
    semester: 5,
  },
  {
    id: 203,
    courseName: 'Організація баз даних',
    name: 'Практичне завдання: Оптимізація складних SQL-запитів та індексація',
    description:
      'Проаналізувати плани виконання запитів (EXPLAIN ANALYZE) та побудувати композитні індекси B-tree.',
    duedate: now - 86400 * 3, // 3 days overdue
    submissionStatus: 'not_submitted',
    grade: null,
    graded: false,
    year: 2026,
    semester: 5,
  },
  {
    id: 204,
    courseName: 'Філософія та наукове мислення',
    name: 'Аналітичне есе: Академічна доброчесність в епоху генеративного ШІ',
    description:
      'Дослідити етичні дилеми використання LLM у наукових дослідженнях та навчальному процесі.',
    duedate: 0, // NO DEADLINE (tests "Без терміну здачі", fix 1970 bug)
    submissionStatus: 'not_submitted',
    grade: null,
    graded: false,
    year: 2026,
    semester: 5,
  },
  {
    id: 205,
    courseName: 'Алгоритми та структури даних',
    name: 'Контрольний тест: Графи та алгоритми пошуку найкоротшого шляху',
    description: 'Тестові завдання з алгоритмів Дейкстри, Флойда-Воршелла та Беллмана-Форда.',
    duedate: now + 86400 * 9,
    submissionStatus: 'graded',
    grade: '100',
    graded: true,
    year: 2026,
    semester: 5,
  },
];

export const mockGrades: Grade[] = [
  {
    courseId: 101,
    courseName: 'Алгоритми та структури даних',
    grade: '95',
    rawGrade: 95,
    controlType: 'exam',
    semester: 5,
  },
  {
    courseId: 102,
    courseName: 'Паралельні та розподілені обчислення',
    grade: '-',
    rawGrade: null,
    controlType: 'exam',
    semester: 5,
  },
  {
    courseId: 103,
    courseName: 'Організація баз даних',
    grade: '-',
    rawGrade: null,
    controlType: 'exam',
    semester: 5,
  },
  {
    courseId: 104,
    courseName: 'Філософія та наукове мислення',
    grade: '-',
    rawGrade: null,
    controlType: 'credit',
    semester: 5,
  },
];

export const mockEvents: MoodleEvent[] = [
  {
    id: 301,
    name: 'Консультація перед екзаменом з АСД',
    courseName: 'Алгоритми та структури даних',
    description: 'Онлайн-зустріч у Google Meet для розбору практичних завдань',
    timestart: now + 86400 * 1,
    formattedtime: 'Завтра о 14:00',
    eventtype: 'due',
  },
  {
    id: 302,
    name: 'Захист лабораторної роботи №3',
    courseName: 'Паралельні та розподілені обчислення',
    description: 'Захист звіту та коду на занятті',
    timestart: now + 86400 * 4,
    formattedtime: 'Через 4 дні о 10:00',
    eventtype: 'course',
  },
];

export const mockNotifications: NotificationsResponse = {
  notifications: [
    {
      id: 401,
      subject: 'Оцінка за Лабораторну №3 виставлена',
      message: 'Викладач виставив оцінку 95/100 за Лабораторну роботу №3.',
      timecreated: now - 3600 * 2,
      read: false,
    },
    {
      id: 402,
      subject: 'Нагадування про дедлайн',
      message: 'Залишилося 5 днів до здачі РГР №1 з Паралельних обчислень.',
      timecreated: now - 3600 * 10,
      read: true,
    },
  ],
  unreadCount: 1,
};

export const mockStatistics: CourseStatistics = {
  total: 4,
};

export function getMockAssignments(params?: GetAssignmentsParams): Assignment[] {
  let list = [...mockAssignments];

  if (params?.status === 'not_completed') {
    list = list.filter(
      (a) => a.submissionStatus !== 'graded' && a.submissionStatus !== 'submitted',
    );
  }

  if (typeof params?.dateFrom === 'number') {
    list = list.filter((a) => a.duedate > 0 && a.duedate >= (params.dateFrom as number));
  }

  if (typeof params?.dateTo === 'number') {
    list = list.filter((a) => a.duedate > 0 && a.duedate <= (params.dateTo as number));
  }

  if (params?.sortByDate === 'desc') {
    list.sort((a, b) => {
      if (a.duedate === 0) {
        return 1;
      }

      if (b.duedate === 0) {
        return -1;
      }

      return b.duedate - a.duedate;
    });
  } else {
    list.sort((a, b) => {
      if (a.duedate === 0) {
        return 1;
      }

      if (b.duedate === 0) {
        return -1;
      }

      return a.duedate - b.duedate;
    });
  }

  return list;
}

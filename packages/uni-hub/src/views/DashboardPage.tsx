'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileEdit,
  Bell,
  LogOut,
  User,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  VolumeX,
  Menu,
  GraduationCap,
  Award,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button as SimpleButton,
  TextInput as SimpleInput,
  CheckBox,
  Spinner,
  Tag,
  Empty,
  Select,
  ProgressBar,
  useToast,
} from '@una';
import { moodleApi } from '@uni-hub/services/api';
import {
  type StudentProfile,
  type CurriculumItem,
  type ControlType,
  calculateEctsGrade,
  calculateTraditionalGrade,
  resolveStudentProfile,
  enrichMoodleCourse,
  generateStudentGradeRecords,
  DEFAULT_STUDENT_PROFILE,
} from '@core/types';
import type {
  Course,
  Grade,
  Assignment,
  MoodleEvent,
  Notification,
  CourseStatistics,
  CourseModule,
} from '@uni-hub/types';
import AssignmentModal from '@uni-hub/components/AssignmentModal';
import ScheduleView from '@uni-hub/components/ScheduleView';
import { GradesChart } from '@uni-hub/components/GradesChart';
import { AssignmentsDonut } from '@uni-hub/components/AssignmentsDonut';
import { DashboardSkeleton } from '@uni-hub/components/DashboardSkeleton';
import { StreakBadge } from '@uni-hub/components/gamification/StreakBadge';
import { ContextualGreeting } from '@uni-hub/components/gamification/ContextualGreeting';
import { LiveCountdown } from '@uni-hub/components/gamification/LiveCountdown';
import { BadgeSystem } from '@uni-hub/components/gamification/BadgeSystem';
import {
  GradeSimulator,
  GradeSimulatorTrigger,
} from '@uni-hub/components/gamification/GradeSimulator';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { useCountUp } from '@uni-hub/hooks/useCountUp';
import { useNow } from '@uni-hub/hooks/useNow';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import {
  getValidGrades,
  getGradeTone,
  getGradeCourseName,
  getGradeRawValue,
} from '@uni-hub/utils/grades';
import { playClick } from '@uni-hub/utils/soundEffects';
import styles from './DashboardPage.module.scss';

type NavKey = 'overview' | 'courses' | 'grades' | 'schedule' | 'assignments';

const NAV_KEYS = new Set<string>(['overview', 'courses', 'grades', 'schedule', 'assignments']);

const isNavKey = (value: string): value is NavKey => NAV_KEYS.has(value);

function getControlTypeLabel(controlType: ControlType): string {
  switch (controlType) {
    case 'exam':
      return 'Іспит';
    case 'credit':
      return 'Залік';
    case 'differentiated_credit':
      return 'Диф. залік';
    default:
      return 'Іспит';
  }
}

function parseGradeScore(gradeItem: any): number {
  const rawVal = getGradeRawValue(gradeItem);

  if (rawVal !== null && rawVal !== undefined) {
    const parsed = Number(rawVal);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  if (gradeItem.totalScore !== undefined && gradeItem.totalScore !== null) {
    const parsed = Number(gradeItem.totalScore);

    return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
  }

  const parsed = Number.parseFloat(gradeItem.grade);

  return !Number.isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.round(parsed)) : 0;
}

function getExamScoreDisplay(
  examScore: number | string | null | undefined,
  controlType?: ControlType,
): string {
  if (controlType === 'credit' || examScore === undefined || examScore === null) {
    return '—';
  }

  return String(examScore);
}

interface GradeTableRowProps {
  grade: any;
  index: number;
}

const GradeTableRow: React.FC<GradeTableRowProps> = ({ grade, index }) => {
  const cName = getGradeCourseName(grade) || grade.courseName || `Дисципліна #${index + 1}`;
  const totalScore = parseGradeScore(grade);
  const controlType: ControlType | undefined = grade.controlType;
  const ects = calculateEctsGrade(totalScore);
  const trad = calculateTraditionalGrade(totalScore, controlType ?? undefined);
  const tone = getGradeTone(totalScore);

  const currentScore =
    grade.currentScore !== undefined && grade.currentScore !== null
      ? String(grade.currentScore)
      : '—';

  const examScore = getExamScoreDisplay(grade.examScore, controlType);
  const creditsDisplay =
    grade.credits !== undefined && grade.credits !== null ? `${grade.credits} ECTS` : '—';

  return (
    <tr style={{ animationDelay: `${index * 40}ms` }}>
      <td>
        <strong>{cName}</strong>
      </td>
      <td>{creditsDisplay}</td>
      <td>
        {controlType ? (
          <Tag tone={controlType === 'exam' ? 'info' : 'neutral'}>
            {getControlTypeLabel(controlType)}
          </Tag>
        ) : (
          '—'
        )}
      </td>
      <td>{currentScore}</td>
      <td>{examScore}</td>
      <td>
        <div className={styles.score100Cell}>
          <span style={{ fontWeight: 600, minWidth: '32px' }}>{totalScore}</span>
          <ProgressBar value={totalScore} tone={tone} className={styles.gradeProgress} />
        </div>
      </td>
      <td>
        <Tag tone={tone}>{ects}</Tag>
      </td>
      <td>
        <Tag tone={totalScore >= 60 ? 'success' : 'danger'}>{trad}</Tag>
      </td>
    </tr>
  );
};

// NOTE(#65): api-provided profile will replace this fallback once the endpoint exists.
const fallbackStudentProfile: StudentProfile = DEFAULT_STUDENT_PROFILE;

const mockKarazinCurriculum: CurriculumItem[] = [
  {
    id: 101,
    code: 'CS301',
    name: 'Паралельні та розподілені обчислення',
    shortName: 'ПРО',
    fullname: 'Паралельні та розподілені обчислення',
    shortname: 'ПРО',
    description:
      'Архітектура паралельних обчислювальних систем, моделі OpenMP та MPI, багатопотоковість у C++.',
    credits: 5,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional',
    controlType: 'exam',
    instructors: [{ name: 'Проф. Коваленко О. І.', email: 'kovalenko@karazin.ua', role: 'Лектор' }],
    status: 'in_progress',
    progress: 75,
  },
  {
    id: 102,
    code: 'CS302',
    name: 'Алгоритми та структури даних',
    shortName: 'АСД',
    fullname: 'Алгоритми та структури даних',
    shortname: 'АСД',
    description:
      'Асимптотичний аналіз, динамічне програмування, дерева пошуку, графи та обчислювальна складність.',
    credits: 5,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional',
    controlType: 'exam',
    instructors: [{ name: 'Доц. Барсуков С. М.', email: 'barsukov.sm@karazin.ua', role: 'Лектор' }],
    status: 'in_progress',
    progress: 88,
  },
  {
    id: 103,
    code: 'CS303',
    name: 'Організація баз даних',
    shortName: 'ОБД',
    fullname: 'Організація баз даних',
    shortname: 'ОБД',
    description:
      'Реляційна модель даних, SQL-запити, транзакції, індексація, нормалізація схем та NoSQL сховища.',
    credits: 4,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional',
    controlType: 'exam',
    instructors: [{ name: 'Доц. Петренко В. О.', email: 'petrenko@karazin.ua', role: 'Лектор' }],
    status: 'in_progress',
    progress: 70,
  },
  {
    id: 104,
    code: 'CS304',
    name: 'Архітектура компʼютерів',
    shortName: 'АК',
    fullname: 'Архітектура компʼютерів',
    shortname: 'АК',
    description:
      'Організація процесорів, конвеєризація, ієрархія памʼяті, кеш-памʼять та асемблер x86/ARM.',
    credits: 4,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'professional',
    controlType: 'differentiated_credit',
    instructors: [{ name: 'Проф. Сидоренко А. П.', email: 'sydorenko@karazin.ua', role: 'Лектор' }],
    status: 'in_progress',
    progress: 65,
  },
  {
    id: 105,
    code: 'CS305',
    name: 'Іноземна мова за профспрямуванням',
    shortName: 'ІМ',
    fullname: 'Іноземна мова за профспрямуванням',
    shortname: 'ІМ',
    description:
      'Професійна англійська мова для IT-фахівців, академічне письмо, підготовка наукових публікацій.',
    credits: 3,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'general',
    controlType: 'credit',
    instructors: [
      { name: 'Старш. викл. Іванова М. В.', email: 'ivanova@karazin.ua', role: 'Викладач' },
    ],
    status: 'in_progress',
    progress: 90,
  },
  {
    id: 106,
    code: 'CS306',
    name: 'Фізичне виховання',
    shortName: 'ФВ',
    fullname: 'Фізичне виховання',
    shortname: 'ФВ',
    description: 'Оздоровча та загальнофізична підготовка студентів.',
    credits: 2,
    semester: 5,
    academicYear: '2026/2027',
    cycle: 'general',
    controlType: 'credit',
    instructors: [
      { name: 'Викл. Шевченко О. Д.', email: 'shevchenko@karazin.ua', role: 'Викладач' },
    ],
    status: 'in_progress',
    progress: 95,
  },
];

const cardMotion = {
  whileHover: { scale: 1.02, y: -2 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.15 },
} as const;

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const checkIn = useGamificationStore((s) => s.checkIn);
  const soundEnabled = useGamificationStore((s) => s.soundEnabled);
  const setSoundEnabled = useGamificationStore((s) => s.setSoundEnabled);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<NavKey>('overview');
  const [loading, setLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const siderRef = useRef<HTMLElement>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [selectedDueUnixSec, setSelectedDueUnixSec] = useState<number | undefined>();
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const activeStudentProfile = studentProfile ?? fallbackStudentProfile;

  const [data, setData] = useState<{
    courses: Course[];
    grades: Grade[];
    assignments: Assignment[];
    events: MoodleEvent[];
    notifications: Notification[];
    unreadCount: number;
    statistics: CourseStatistics | null;
  }>({
    courses: [],
    grades: [],
    assignments: [],
    events: [],
    notifications: [],
    unreadCount: 0,
    statistics: null,
  });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  const handleDateChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;

      if (!val) {
        setter('');

        return;
      }

      const [yearStr] = val.split('-');

      if (yearStr && yearStr.length > 4) {
        return;
      }

      setter(val);
    };

  const [isAssignmentModalVisible, setIsAssignmentModalVisible] = useState(false);
  const [selectedAssignmentModule, setSelectedAssignmentModule] = useState<CourseModule | null>(
    null,
  );

  const coursesCount = useCountUp(data.statistics?.total || 0, 800, !loading);
  const assignmentsCount = useCountUp(data.assignments.length, 800, !loading);

  const hasCachedData =
    data.courses.length > 0 ||
    data.grades.length > 0 ||
    data.assignments.length > 0 ||
    data.events.length > 0 ||
    hasLoadedOnce;

  const nowMs = useNow(30_000);

  const nearestDeadline = useMemo(() => {
    const nowSec = Math.floor(nowMs / 1000);

    return data.assignments
      .filter((a) => a.duedate > nowSec)
      .sort((a, b) => a.duedate - b.duedate)[0];
  }, [data.assignments, nowMs]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const params: Record<string, string | number> = { sortByDate: sortOrder };

      if (dateFrom) {
        const fromDate = new Date(dateFrom);

        if (!Number.isNaN(fromDate.getTime()) && fromDate.getFullYear() <= 2099) {
          params.dateFrom = Math.floor(fromDate.getTime() / 1000);
        }
      }

      if (dateTo) {
        const toDate = new Date(dateTo);

        if (!Number.isNaN(toDate.getTime()) && toDate.getFullYear() <= 2099) {
          params.dateTo = Math.floor(toDate.getTime() / 1000);
        }
      }

      if (hideCompleted) params.status = 'not_completed';

      const [coursesRes, gradesRes, assignmentsRes, eventsRes, notificationsRes, statsRes] =
        await Promise.all([
          moodleApi.getCourses(),
          moodleApi.getGrades(),
          moodleApi.getAssignments(params),
          moodleApi.getEvents(),
          moodleApi.getNotifications(),
          moodleApi.getStatistics(),
        ]);

      setData({
        courses: Array.isArray(coursesRes?.data) ? coursesRes.data : [],
        grades: Array.isArray(gradesRes?.data?.grades)
          ? gradesRes.data.grades
          : Array.isArray(gradesRes?.data)
            ? (gradesRes.data as unknown as Grade[])
            : [],
        assignments: Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : [],
        events: Array.isArray(eventsRes?.data) ? eventsRes.data : [],
        notifications: Array.isArray(notificationsRes?.data?.notifications)
          ? notificationsRes.data.notifications
          : [],
        unreadCount: notificationsRes?.data?.unreadCount || 0,
        statistics: statsRes?.data || null,
      });
      setHasLoadedOnce(true);
    } catch (error) {
      console.error(error);
      toast.error('Помилка завантаження даних. Будь ласка, переконайтеся, що бекенд запущено.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      router.push('/login');

      return;
    }

    const savedUser = localStorage.getItem('username');
    const savedEmail = localStorage.getItem('userEmail');
    const savedMoodleId = localStorage.getItem('moodleId');

    let tokenEmail: string | undefined;
    let tokenMoodleId: string | undefined;
    const token = localStorage.getItem('accessToken');

    if (token) {
      try {
        const parts = token.split('.');

        if (parts[1]) {
          const payload = JSON.parse(atob(parts[1]));

          tokenEmail = payload.email;
          tokenMoodleId = payload.moodleId ? String(payload.moodleId) : undefined;
        }
      } catch {
        // ignore
      }
    }

    const resolved = resolveStudentProfile({
      email: savedEmail || tokenEmail,
      username: savedUser,
      moodleId: savedMoodleId || tokenMoodleId,
    });

    setStudentProfile(resolved);
    checkIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab) {
      setActiveKey(isNavKey(requestedTab) ? requestedTab : 'overview');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sortOrder, dateFrom, dateTo, hideCompleted]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);

    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);

    const menuButton = document.querySelector<HTMLButtonElement>(`.${styles.mobileMenuBtn}`);

    menuButton?.focus();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const getFocusableElements = (): HTMLElement[] => {
      if (!siderRef.current) {
        return [];
      }

      const elements = siderRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      return Array.from(elements).filter((element) => {
        if (typeof element.checkVisibility === 'function') {
          return element.checkVisibility();
        }

        return element.offsetParent !== null;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();

        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();

        if (focusableElements.length === 0) {
          event.preventDefault();

          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        const isOutsideOrFirst =
          document.activeElement === firstElement ||
          !siderRef.current?.contains(document.activeElement);

        const isOutsideOrLast =
          document.activeElement === lastElement ||
          !siderRef.current?.contains(document.activeElement);

        if (event.shiftKey && isOutsideOrFirst) {
          event.preventDefault();

          lastElement?.focus();
        } else if (!event.shiftKey && isOutsideOrLast) {
          event.preventDefault();

          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const visibleFocusables = getFocusableElements();
    const firstFocusable = visibleFocusables[0];

    firstFocusable?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  const menuItems: { key: NavKey; icon: React.ReactNode; label: string }[] = [
    { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Картка студента / Огляд' },
    { key: 'courses', icon: <BookOpen size={18} />, label: 'Індивідуальний план' },
    { key: 'grades', icon: <ClipboardList size={18} />, label: 'Заліковка та бали' },
    { key: 'schedule', icon: <CalendarDays size={18} />, label: 'Розклад занять' },
    { key: 'assignments', icon: <FileEdit size={18} />, label: 'Завдання' },
  ];

  const renderOverview = () => {
    const rawCourses = data.courses.length > 0 ? data.courses : mockKarazinCurriculum;
    const overviewCourses = rawCourses
      .slice(0, 3)
      .map((c) => enrichMoodleCourse(c, activeStudentProfile.course));

    const renderUpcomingEvents = () => {
      if (data.events.length > 0) {
        return (
          <div className={styles.list}>
            {data.events.slice(0, 4).map((event, index) => (
              <div
                key={event.id}
                className={styles.listItem}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={styles.listTitle}>
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      {event.name}
                    </a>
                  ) : (
                    event.name
                  )}
                </div>
                <div
                  className={styles.muted}
                  dangerouslySetInnerHTML={{ __html: event.formattedtime }}
                />
              </div>
            ))}
          </div>
        );
      }

      if (data.assignments.length > 0) {
        return (
          <div className={styles.list}>
            {data.assignments.slice(0, 4).map((assign, index) => (
              <div
                key={assign.id}
                className={styles.listItem}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={styles.listTitle}>{assign.name}</div>
                <div className={styles.muted}>
                  {assign.courseName} • Дедлайн:{' '}
                  {new Date(assign.duedate * 1000).toLocaleDateString('uk-UA')}
                </div>
              </div>
            ))}
          </div>
        );
      }

      return <Empty description="Подій та дедлайнів не знайдено" />;
    };

    return (
      <div className={styles.stack}>
        <section className={styles.studentCard}>
          <div className={styles.studentCardTop}>
            <div className={styles.studentIdentity}>
              <div className={styles.studentAvatarLarge}>
                <GraduationCap size={26} />
              </div>
              <div className={styles.studentMainInfo}>
                <h3>{activeStudentProfile.fullName}</h3>
                <div className={styles.muted}>
                  Спеціальність {activeStudentProfile.specialty} •{' '}
                  {activeStudentProfile.educationalProgram}
                </div>
              </div>
            </div>
            <div className={styles.studentTags}>
              <Tag tone="warning">Демо-дані</Tag>
              <Tag tone="success">Денна форма</Tag>
              <Tag tone="info">Бюджет</Tag>
              <Tag tone="success">
                <Award size={12} style={{ marginRight: 4 }} />
                Відмінник (Академічна стипендія)
              </Tag>
            </div>
          </div>

          <p className={styles.muted} style={{ fontSize: 'var(--font-xs)', margin: 0 }}>
            Академічні реквізити (номер студентського, залікової книжки, факультет) відображаються
            як демонстраційні дані до підключення профільного API.
          </p>

          <div className={styles.studentGrid}>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Факультет / Інститут</span>
              <span className={styles.fieldValue}>{activeStudentProfile.faculty}</span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Кафедра</span>
              <span className={styles.fieldValue}>{activeStudentProfile.department}</span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Курс / Академічна група</span>
              <span className={styles.fieldValue}>
                {activeStudentProfile.course} курс, група {activeStudentProfile.group}
              </span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Студентський квиток</span>
              <span className={styles.fieldValue}>{activeStudentProfile.studentCardNumber}</span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Залікова книжка</span>
              <span className={styles.fieldValue}>{activeStudentProfile.recordBookNumber}</span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Здобуто кредитів ECTS</span>
              <span className={styles.fieldValue}>
                {activeStudentProfile.totalCreditsEarned} ECTS
              </span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Рейтинговий бал (GPA)</span>
              <span className={styles.fieldValue}>{activeStudentProfile.gpa} / 100</span>
            </div>
            <div className={styles.studentField}>
              <span className={styles.fieldLabel}>Академічний статус</span>
              <span className={styles.fieldValue} style={{ color: '#22c55e' }}>
                ● Навчається (активний)
              </span>
            </div>
          </div>
        </section>

        <div className={styles.overviewHero}>
          <ContextualGreeting assignments={data.assignments} />
          {nearestDeadline && (
            <div className={styles.nearestDeadline}>
              <span className={styles.muted}>Найближчий дедлайн: {nearestDeadline.name}</span>
              <LiveCountdown targetUnixSec={nearestDeadline.duedate} />
            </div>
          )}
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard} style={{ animationDelay: '0ms' }}>
            <div className={styles.statLabel}>Всього дисциплін</div>
            <div className={styles.statValue}>
              <BookOpen size={20} />
              {coursesCount}
            </div>
          </div>
          <div className={styles.statCard} style={{ animationDelay: '40ms' }}>
            <div className={styles.statLabel}>Завдань до виконання</div>
            <div className={styles.statValue}>
              <FileEdit size={20} />
              {assignmentsCount}
            </div>
          </div>
          <div className={styles.statCard} style={{ animationDelay: '80ms' }}>
            <div className={styles.statLabel}>Рейтинговий бал (GPA)</div>
            <div className={styles.statValue}>
              <GraduationCap size={20} />
              {activeStudentProfile.gpa}
            </div>
          </div>
        </div>

        <AssignmentsDonut assignments={data.assignments} grades={data.grades} />

        <div className={styles.split}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Поточні дисципліни</h3>
              <SimpleButton
                type="button"
                variant="secondary"
                size="small"
                isTransparent
                onClick={() => setActiveKey('courses')}
              >
                Всі
              </SimpleButton>
            </div>
            {overviewCourses.length > 0 ? (
              <div className={styles.list}>
                {overviewCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className={styles.listItem}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className={styles.listTitle}>
                      {'fullname' in course ? course.fullname : (course as CurriculumItem).name}
                    </div>
                    <div className={styles.muted}>
                      {'shortname' in course ? course.shortname : (course as CurriculumItem).code}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="Дисципліни не знайдено" />
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Найближчі події та дедлайни</h3>
              <SimpleButton
                type="button"
                variant="secondary"
                size="small"
                isTransparent
                onClick={() => setActiveKey('assignments')}
              >
                Всі
              </SimpleButton>
            </div>
            {renderUpcomingEvents()}
          </section>
        </div>
      </div>
    );
  };

  const renderCourses = () => {
    const rawCourses = data.courses.length > 0 ? data.courses : mockKarazinCurriculum;
    const coursesList = rawCourses.map((c) => enrichMoodleCourse(c, activeStudentProfile.course));

    return (
      <div className={styles.courseGrid}>
        {coursesList.map((course, index) => {
          const isCurriculum = 'credits' in course;
          const curriculum = isCurriculum ? (course as CurriculumItem) : null;
          const credits = curriculum?.credits;
          const controlType: ControlType | undefined = curriculum?.controlType;
          const instructor = curriculum?.instructors?.[0]?.name;
          const progress = curriculum?.progress;

          return (
            <motion.article
              key={course.id}
              className={styles.courseCard}
              style={{ animationDelay: `${index * 40}ms` }}
              {...cardMotion}
            >
              <div className={styles.courseCardHeader}>
                <h3>{'fullname' in course ? course.fullname : (course as CurriculumItem).name}</h3>
                <span className={styles.courseTag}>
                  <BookOpen size={14} aria-hidden />
                  <Tag tone="info">
                    {'shortname' in course ? course.shortname : (course as CurriculumItem).code}
                  </Tag>
                </span>
              </div>
              {(credits !== undefined || controlType !== undefined) && (
                <div className={styles.courseMetaRow}>
                  {credits !== undefined && <Tag tone="neutral">{credits} ECTS</Tag>}
                  {controlType && (
                    <Tag tone={controlType === 'exam' ? 'info' : 'success'}>
                      {getControlTypeLabel(controlType)}
                    </Tag>
                  )}
                </div>
              )}
              {instructor && (
                <div className={styles.courseTeacher}>
                  Викладач: <strong>{instructor}</strong>
                </div>
              )}
              <p className={styles.courseSummary}>
                {typeof (course as any).summary === 'string' && (course as any).summary
                  ? (course as any).summary
                  : (course as CurriculumItem).description ||
                    'Навчальна дисципліна індивідуального плану'}
              </p>
              {progress !== undefined && progress !== null && (
                <div style={{ margin: 'var(--space-12) 0' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'var(--font-xs)',
                      marginBottom: '4px',
                    }}
                  >
                    <span className={styles.muted}>Прогрес освоєння</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} tone={progress >= 60 ? 'success' : 'warning'} />
                </div>
              )}
              <SimpleButton
                type="button"
                variant="secondary"
                size="small"
                isTransparent
                onClick={() => {
                  playClick(soundEnabled);
                  router.push(`/courses/${course.id}/contents`);
                }}
              >
                Перегляд матеріалів курсу
              </SimpleButton>
            </motion.article>
          );
        })}
      </div>
    );
  };

  const renderGrades = () => {
    const rawValidGrades = getValidGrades(data.grades);
    const validGrades =
      rawValidGrades.length > 0
        ? rawValidGrades
        : generateStudentGradeRecords(
            data.courses.length > 0 ? data.courses : mockKarazinCurriculum,
            activeStudentProfile,
          );

    return (
      <div className={styles.gradesStack}>
        <div className={styles.pageTitleRow} style={{ marginBottom: 0 }}>
          <span className={styles.muted}>Електронна залікова книжка та симулятор оцінок</span>
          <GradeSimulatorTrigger onOpen={() => setSimulatorOpen(true)} />
        </div>
        <GradesChart grades={validGrades as any} />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дисципліна</th>
                <th>Кредити ECTS</th>
                <th>Форма контролю</th>
                <th>Поточний бал (0–60)</th>
                <th>Екзамен (0–40)</th>
                <th>Підсумковий 100-бальний бал</th>
                <th>Оцінка ECTS</th>
                <th>Традиційна (національна) оцінка</th>
              </tr>
            </thead>
            <tbody>
              {validGrades.map((g: any, index: number) => {
                const cName = getGradeCourseName(g) || g.courseName || `Дисципліна #${index + 1}`;

                return <GradeTableRow key={cName + index} grade={g} index={index} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAssignments = () => (
    <div className={styles.stack}>
      <div className={styles.filters}>
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateFrom}
          onChange={handleDateChange(setDateFrom)}
          aria-label="Дата від"
        />
        <SimpleInput
          type="date"
          size="medium"
          min="2000-01-01"
          max="2099-12-31"
          value={dateTo}
          onChange={handleDateChange(setDateTo)}
          aria-label="Дата до"
        />
        <Select
          value={sortOrder}
          onChange={(v) => setSortOrder(v as 'asc' | 'desc')}
          options={[
            { value: 'asc', label: 'Спочатку старі' },
            { value: 'desc', label: 'Спочатку нові' },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
          />
          Сховати виконані
        </label>
      </div>

      {data.assignments.length > 0 ? (
        data.assignments.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            className={styles.assignmentCard}
            {...cardMotion}
            onClick={() => {
              playClick(soundEnabled);
              setSelectedAssignmentModule({
                id: item.id,
                instance: item.id,
                name: item.name,
                modname: 'assign',
                description: item.description,
                contents: [],
              });
              setSelectedDueUnixSec(item.duedate);
              setIsAssignmentModalVisible(true);
            }}
          >
            <div className={styles.assignmentTop}>
              <div>
                <div className={styles.listTitle}>{item.name}</div>
                <div className={styles.muted}>{item.courseName}</div>
              </div>
              <div className={styles.nearestDeadline}>
                {item.duedate && item.duedate > 0 ? (
                  <>
                    <Tag tone="warning">
                      Дедлайн: {new Date(item.duedate * 1000).toLocaleDateString('uk-UA')}
                    </Tag>
                    <LiveCountdown targetUnixSec={item.duedate} />
                  </>
                ) : (
                  <Tag tone="default">Без терміну</Tag>
                )}
              </div>
            </div>
            <div
              className={styles.htmlSnippet}
              dangerouslySetInnerHTML={{
                __html:
                  (item.description || '').length > 200
                    ? (item.description || '').substring(0, 200) + '...'
                    : item.description || '',
              }}
            />
          </motion.button>
        ))
      ) : (
        <Empty description="Завдання не знайдено" />
      )}
    </div>
  );

  const renderActiveContent = () => {
    switch (activeKey) {
      case 'overview':
        return renderOverview();
      case 'courses':
        return renderCourses();
      case 'grades':
        return renderGrades();
      case 'schedule':
        return (
          <ScheduleView courses={data.courses.length > 0 ? data.courses : mockKarazinCurriculum} />
        );
      case 'assignments':
        return renderAssignments();
      default:
        return renderOverview();
    }
  };

  return (
    <div
      className={`${styles.layout} ${collapsed ? styles.collapsed : ''} ${mobileMenuOpen ? styles.mobileOpen : ''}`}
    >
      <BadgeSystem grades={data.grades} />
      {mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={closeMobileMenu}
          aria-label="Закрити меню"
        />
      )}
      <aside ref={siderRef} id="dashboard-sidebar" className={styles.sider} aria-label="Навігація">
        <div className={styles.brand}>
          <span>{collapsed && !mobileMenuOpen ? 'U' : 'UNiVerse'}</span>
          <SimpleButton
            type="button"
            variant="secondary"
            size="small"
            isTransparent
            onClick={() => setCollapsed((previous) => !previous)}
            aria-label={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </SimpleButton>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${activeKey === item.key ? styles.active : ''}`}
              onClick={() => {
                playClick(soundEnabled);
                setActiveKey(item.key);
                closeMobileMenu();
              }}
              title={item.label}
            >
              {activeKey === item.key && (
                <motion.div
                  layoutId="active-nav-pill"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {item.icon}
              {(!collapsed || mobileMenuOpen) && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.siderFooter}>
          <a
            href="https://moodle.universemvp.tech"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.moodleStatusLink}
            title="Moodle LMS: moodle.universemvp.tech (активно)"
          >
            <span className={styles.statusDot} aria-hidden />
            {!collapsed || mobileMenuOpen ? (
              <span className={styles.moodleHost}>🔗 moodle.universemvp.tech</span>
            ) : (
              <span className={styles.moodleCompactIcon}>🔗</span>
            )}
          </a>
          <ThemeSwitcher
            compact
            showLabel={!collapsed || mobileMenuOpen}
            className={styles.themeBtn}
          />
          <SimpleButton
            type="button"
            variant="secondary"
            size="medium"
            isTransparent
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            <LogOut size={18} />
            {(!collapsed || mobileMenuOpen) && <span>Вийти</span>}
          </SimpleButton>
        </div>
      </aside>

      <div
        className={styles.main}
        inert={mobileMenuOpen ? true : undefined}
        aria-hidden={mobileMenuOpen}
      >
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <SimpleButton
              type="button"
              variant="secondary"
              size="medium"
              isTransparent
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Відкрити меню"
              aria-expanded={mobileMenuOpen}
              aria-controls="dashboard-sidebar"
            >
              <Menu size={20} />
            </SimpleButton>
            <StreakBadge />
          </div>
          <div className={styles.headerRight}>
            <SimpleButton
              type="button"
              variant="secondary"
              size="medium"
              isTransparent
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={soundEnabled ? 'Вимкнути звук' : 'Увімкнути звук'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </SimpleButton>
            <div className={styles.notifWrap} ref={notifRef}>
              <SimpleButton
                type="button"
                variant="secondary"
                size="medium"
                isTransparent
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Сповіщення"
              >
                <Bell size={18} />
                {data.unreadCount > 0 && <span className={styles.badge}>{data.unreadCount}</span>}
              </SimpleButton>
              {notifOpen && (
                <motion.div
                  className={styles.notifDropdown}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className={styles.notifHeader}>
                    <strong>Сповіщення</strong>
                    {data.unreadCount > 0 && <Tag tone="info">{data.unreadCount} нових</Tag>}
                  </div>
                  <div className={styles.notifList}>
                    {data.notifications.length > 0 ? (
                      data.notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`${styles.notifItem} ${item.read ? '' : styles.unread}`}
                        >
                          <div className={styles.notifSubject}>{item.subject}</div>
                          <div
                            className={styles.muted}
                            dangerouslySetInnerHTML={{
                              __html:
                                (item.message || '').length > 100
                                  ? (item.message || '').substring(0, 100) + '...'
                                  : item.message || '',
                            }}
                          />
                          <div className={styles.notifTime}>
                            {new Date(item.timecreated * 1000).toLocaleString('uk-UA')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty description="Немає сповіщень" />
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            <div
              className={styles.user}
              title={`${activeStudentProfile.fullName} (${activeStudentProfile.group})`}
            >
              <span className={styles.avatar}>
                <User size={16} />
              </span>
              <span>{activeStudentProfile.fullName}</span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.pageTitleRow}>
            <h2 className={styles.pageTitle}>
              {menuItems.find((i) => i.key === activeKey)?.label}
            </h2>
          </div>
          {loading && !hasCachedData ? (
            <DashboardSkeleton />
          ) : (
            <>
              {loading && hasCachedData && (
                <div className={styles.contentLoading}>
                  <Spinner size="small" tip="Оновлення..." />
                </div>
              )}
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderActiveContent()}
              </motion.div>
            </>
          )}

          <AssignmentModal
            visible={isAssignmentModalVisible}
            onClose={() => {
              setIsAssignmentModalVisible(false);
              setSelectedAssignmentModule(null);
              setSelectedDueUnixSec(undefined);
            }}
            module={selectedAssignmentModule}
            dueUnixSec={selectedDueUnixSec}
          />

          <GradeSimulator
            open={simulatorOpen}
            onClose={() => setSimulatorOpen(false)}
            grades={data.grades}
            assignments={data.assignments}
          />
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileEdit,
  Calendar,
  Bell,
  LogOut,
  User,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  VolumeX,
  Menu,
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
} from '@una';
import { useToast } from '@ui/Toast';
import { moodleApi } from '@uni-hub/services/api';
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

type NavKey = 'overview' | 'courses' | 'grades' | 'assignments' | 'schedule' | 'events';

const NAV_KEYS: NavKey[] = ['overview', 'courses', 'grades', 'assignments', 'schedule', 'events'];

const isNavKey = (value: string): value is NavKey => NAV_KEYS.includes(value as NavKey);

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
      toast.error('Ошибка загрузки данных. Пожалуйста, убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) {
      router.push('/login');

      return;
    }

    checkIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab && isNavKey(requestedTab)) {
      setActiveKey(requestedTab);
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
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !siderRef.current?.contains(document.activeElement)
          ) {
            event.preventDefault();

            lastElement?.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !siderRef.current?.contains(document.activeElement)
          ) {
            event.preventDefault();

            firstElement?.focus();
          }
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
    { key: 'overview', icon: <LayoutDashboard size={18} />, label: 'Обзор' },
    { key: 'courses', icon: <BookOpen size={18} />, label: 'Курсы' },
    { key: 'grades', icon: <ClipboardList size={18} />, label: 'Оценки' },
    { key: 'assignments', icon: <FileEdit size={18} />, label: 'Задания' },
    { key: 'schedule', icon: <CalendarDays size={18} />, label: 'Расписание' },
    { key: 'events', icon: <Calendar size={18} />, label: 'События' },
  ];

  const renderOverview = () => (
    <div className={styles.stack}>
      <div className={styles.overviewHero}>
        <ContextualGreeting assignments={data.assignments} />
        {nearestDeadline && (
          <div className={styles.nearestDeadline}>
            <span className={styles.muted}>Ближайший дедлайн: {nearestDeadline.name}</span>
            <LiveCountdown targetUnixSec={nearestDeadline.duedate} />
          </div>
        )}
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard} style={{ animationDelay: '0ms' }}>
          <div className={styles.statLabel}>Всего курсов</div>
          <div className={styles.statValue}>
            <BookOpen size={20} />
            {coursesCount}
          </div>
        </div>
        <div className={styles.statCard} style={{ animationDelay: '40ms' }}>
          <div className={styles.statLabel}>Заданий</div>
          <div className={styles.statValue}>
            <FileEdit size={20} />
            {assignmentsCount}
          </div>
        </div>
      </div>

      <AssignmentsDonut assignments={data.assignments} grades={data.grades} />

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Последние курсы</h3>
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => setActiveKey('courses')}
            >
              Все
            </SimpleButton>
          </div>
          {data.courses.length > 0 ? (
            <div className={styles.list}>
              {data.courses.slice(0, 3).map((course, index) => (
                <div
                  key={course.id}
                  className={styles.listItem}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className={styles.listTitle}>{course.fullname}</div>
                  <div className={styles.muted}>{course.shortname}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="Курсы не найдены" />
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Ближайшие события</h3>
            <SimpleButton
              type="button"
              variant="secondary"
              size="small"
              isTransparent
              onClick={() => setActiveKey('events')}
            >
              Все
            </SimpleButton>
          </div>
          {data.events.length > 0 ? (
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
          ) : (
            <Empty description="События не найдены" />
          )}
        </section>
      </div>
    </div>
  );

  const renderCourses = () =>
    data.courses.length > 0 ? (
      <div className={styles.courseGrid}>
        {data.courses.map((course, index) => (
          <motion.article
            key={course.id}
            className={styles.courseCard}
            style={{ animationDelay: `${index * 40}ms` }}
            {...cardMotion}
          >
            <div className={styles.courseCardHeader}>
              <h3>{course.fullname}</h3>
              <span className={styles.courseTag}>
                <BookOpen size={14} aria-hidden />
                <Tag tone="info">{course.shortname}</Tag>
              </span>
            </div>
            <p className={styles.courseSummary}>{course.summary || 'Нет описания'}</p>
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
              Просмотр контента
            </SimpleButton>
          </motion.article>
        ))}
      </div>
    ) : (
      <Empty description="Курсы не найдены" />
    );

  const renderGrades = () => {
    const validGrades = getValidGrades(data.grades);

    if (validGrades.length === 0) {
      return <Empty description="Оценки не найдены" />;
    }

    return (
      <div className={styles.gradesStack}>
        <div className={styles.pageTitleRow} style={{ marginBottom: 0 }}>
          <span className={styles.muted}>Симулятор итогового балла</span>
          <GradeSimulatorTrigger onOpen={() => setSimulatorOpen(true)} />
        </div>
        <GradesChart grades={data.grades} />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Курс</th>
                <th>Оценка</th>
              </tr>
            </thead>
            <tbody>
              {validGrades.map((g, index) => {
                const cName = getGradeCourseName(g) || `Курс #${index + 1}`;
                const rawVal = getGradeRawValue(g);
                const tone = getGradeTone(rawVal);
                const barValue = rawVal ?? (Number.parseFloat(g.grade) || 0);

                return (
                  <tr key={cName + index} style={{ animationDelay: `${index * 40}ms` }}>
                    <td>{cName}</td>
                    <td>
                      <div className={styles.gradeCell}>
                        <Tag tone={tone}>{g.grade}</Tag>
                        <ProgressBar
                          value={barValue}
                          tone={tone}
                          className={styles.gradeProgress}
                        />
                      </div>
                    </td>
                  </tr>
                );
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
          aria-label="Дата от"
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
            { value: 'asc', label: 'Сначала старые' },
            { value: 'desc', label: 'Сначала новые' },
          ]}
        />
        <label className={styles.checkLabel}>
          <CheckBox
            variant="primary"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
          />
          Скрыть выполненные
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
                      Срок: {new Date(item.duedate * 1000).toLocaleDateString()}
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
        <Empty description="Задания не найдены" />
      )}
    </div>
  );

  const renderEvents = () =>
    data.events.length > 0 ? (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Событие</th>
              <th>Курс</th>
              <th>Время</th>
              <th>Тип</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((event) => (
              <tr key={event.id}>
                <td>
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      {event.name}
                    </a>
                  ) : (
                    event.name
                  )}
                </td>
                <td>{event.courseName}</td>
                <td dangerouslySetInnerHTML={{ __html: event.formattedtime }} />
                <td>
                  <Tag>{event.eventtype}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty description="События не найдены" />
    );

  const renderActiveContent = () => {
    switch (activeKey) {
      case 'overview':
        return renderOverview();
      case 'courses':
        return renderCourses();
      case 'grades':
        return renderGrades();
      case 'assignments':
        return renderAssignments();
      case 'events':
        return renderEvents();
      case 'schedule':
        return <ScheduleView />;
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
          aria-label="Закрыть меню"
        />
      )}
      <aside ref={siderRef} id="dashboard-sidebar" className={styles.sider} aria-label="Навигация">
        <div className={styles.brand}>
          <span>{collapsed && !mobileMenuOpen ? 'U' : 'UNiVerse'}</span>
          <SimpleButton
            type="button"
            variant="secondary"
            size="small"
            isTransparent
            onClick={() => setCollapsed((previous) => !previous)}
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
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
            {(!collapsed || mobileMenuOpen) && <span>Выйти</span>}
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
              aria-label="Открыть меню"
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
              aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
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
                aria-label="Уведомления"
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
                    <strong>Уведомления</strong>
                    {data.unreadCount > 0 && <Tag tone="info">{data.unreadCount} новых</Tag>}
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
                            {new Date(item.timecreated * 1000).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty description="Нет уведомлений" />
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            <div className={styles.user}>
              <span className={styles.avatar}>
                <User size={16} />
              </span>
              <span>Студент</span>
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
                  <Spinner size="small" tip="Обновление..." />
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

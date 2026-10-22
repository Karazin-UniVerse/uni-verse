import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { Assignment, MoodleEvent } from '@core/types/moodle';
import { UpcomingEventsList, type UpcomingEventsListProps } from './UpcomingEventsList';

const renderUpcomingEventsList = (props: UpcomingEventsListProps) => {
  return render(
    withLanguage(<UpcomingEventsList {...props} />),
  );
};

describe('UpcomingEventsList component', () => {
  it('should render upcoming events list with event title and formatted time', () => {
    const onNavigate = vi.fn();
    const mockEvents: MoodleEvent[] = [
      {
        id: 1,
        name: 'Лекція з архітектури ПЗ',
        description: 'Вступна лекція',
        courseName: 'Архітектура ПЗ',
        timestart: 1730000000,
        formattedtime: '<span>Понеділок, 10:00</span>',
        eventtype: 'course',
      },
      {
        id: 2,
        name: 'Практичне заняття №1',
        description: 'Робота в лабораторії',
        courseName: 'Операційні системи',
        timestart: 1730010000,
        formattedtime: '<b>Вівторок</b>, 12:00',
        eventtype: 'course',
      },
      {
        id: 3,
        name: 'Семінар з баз даних',
        description: 'Нормалізація форм',
        courseName: 'Бази даних',
        timestart: 1730020000,
        formattedtime: 'Середа, 14:00',
        eventtype: 'course',
      },
      {
        id: 4,
        name: 'Лабораторна робота №2',
        description: 'Дослідження памʼяті',
        courseName: 'Операційні системи',
        timestart: 1730030000,
        formattedtime: 'Четвер, 16:00',
        eventtype: 'course',
      },
      {
        id: 5,
        name: 'Пʼята подія поза лімітом',
        description: 'Має бути прихована лімітом slice(0, 4)',
        courseName: 'Архітектура ПЗ',
        timestart: 1730040000,
        formattedtime: 'Пʼятниця, 18:00',
        eventtype: 'course',
      },
    ];

    renderUpcomingEventsList({
      events: mockEvents,
      assignments: [],
      onNavigate,
    });

    expect(screen.getByText('Лекція з архітектури ПЗ')).toBeInTheDocument();
    expect(screen.getByText('Понеділок, 10:00')).toBeInTheDocument();
    expect(screen.getByText('Практичне заняття №1')).toBeInTheDocument();
    expect(screen.getByText('Вівторок, 12:00')).toBeInTheDocument();
    expect(screen.getByText('Семінар з баз даних')).toBeInTheDocument();
    expect(screen.getByText('Лабораторна робота №2')).toBeInTheDocument();
    expect(screen.queryByText('Пʼята подія поза лімітом')).not.toBeInTheDocument();
  });

  it('should render join meeting link button when event contains a meeting URL', () => {
    const onNavigate = vi.fn();
    const eventsWithMeeting: MoodleEvent[] = [
      {
        id: 10,
        name: 'Онлайн консультація',
        description: 'Посилання: https://meet.google.com/abc-defg-hij приєднуйтесь вчасно.',
        courseName: 'Мережеві технології',
        timestart: 1730000000,
        formattedtime: 'Середа, 14:00',
        eventtype: 'course',
      },
      {
        id: 11,
        name: 'Офлайн консультація',
        description: 'Аудиторія 3-14',
        courseName: 'Мережеві технології',
        timestart: 1730010000,
        formattedtime: 'Четвер, 15:00',
        eventtype: 'course',
      },
    ];

    renderUpcomingEventsList({
      events: eventsWithMeeting,
      assignments: [],
      onNavigate,
    });

    const joinLinks = screen.getAllByRole('link', { name: /Приєднатися до заняття/i });

    expect(joinLinks).toHaveLength(1);
    expect(joinLinks[0]).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    expect(joinLinks[0]).toHaveAttribute('target', '_blank');
    expect(joinLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should fall back to assignments list when events array is empty', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const assignments: Assignment[] = [
      {
        id: 101,
        courseName: 'Компʼютерна графіка',
        name: 'Лабораторна робота №1',
        duedate: 1735689600,
        description: 'Графічний конвеєр OpenGL',
      },
      {
        id: 102,
        courseName: 'Дискретна математика',
        name: 'Індивідуальне завдання',
        duedate: 0,
        description: 'Теорія графів',
      },
    ];

    renderUpcomingEventsList({
      events: [],
      assignments,
      onNavigate,
    });

    expect(screen.getByText('Лабораторна робота №1')).toBeInTheDocument();
    expect(screen.getByText(/Компʼютерна графіка/i)).toBeInTheDocument();
    expect(screen.getByText(/Дедлайн:/i)).toBeInTheDocument();

    expect(screen.getByText('Індивідуальне завдання')).toBeInTheDocument();
    expect(screen.getByText(/Дискретна математика/i)).toBeInTheDocument();
    expect(screen.getByText(/Без терміну/i)).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(2);

    await user.click(buttons[0]!);

    expect(onNavigate).toHaveBeenCalledWith('study', 'assignments');
  });

  it('should render empty state when both events and assignments are empty', () => {
    const onNavigate = vi.fn();

    renderUpcomingEventsList({
      events: [],
      assignments: [],
      onNavigate,
    });

    expect(screen.getByText('Подій та дедлайнів не знайдено')).toBeInTheDocument();
  });

  it('should render event link when event.url is present', () => {
    const onNavigate = vi.fn();
    const eventsWithUrl: MoodleEvent[] = [
      {
        id: 20,
        name: 'Модульний контроль',
        description: 'Опитування в системі Moodle',
        courseName: 'Бази даних',
        timestart: 1730000000,
        formattedtime: 'Пʼятниця, 09:00',
        eventtype: 'course',
        url: 'https://moodle.universemvp.tech/mod/quiz/view.php?id=12345',
      },
      {
        id: 21,
        name: 'Звичайна подія без посилання',
        description: 'Без посилання',
        courseName: 'Бази даних',
        timestart: 1730010000,
        formattedtime: 'Субота, 10:00',
        eventtype: 'course',
      },
    ];

    renderUpcomingEventsList({
      events: eventsWithUrl,
      assignments: [],
      onNavigate,
    });

    const eventLink = screen.getByRole('link', { name: 'Модульний контроль' });

    expect(eventLink).toBeInTheDocument();
    expect(eventLink).toHaveAttribute(
      'href',
      'https://moodle.universemvp.tech/mod/quiz/view.php?id=12345',
    );
    expect(eventLink).toHaveAttribute('target', '_blank');
    expect(eventLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(
      screen.queryByRole('link', { name: 'Звичайна подія без посилання' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Звичайна подія без посилання')).toBeInTheDocument();
  });
});

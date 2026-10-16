import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionCard } from './ActionCard';
import styles from './ActionCard.module.scss';

describe('ActionCard Component', () => {
  it('should render card with title, description, and accessible role', () => {
    render(
      <ActionCard
        title="Assignments"
        description="View upcoming tasks"
        icon={<span data-testid="action-icon">Icon</span>}
      />,
    );

    const button = screen.getByRole('button', { name: /assignments/i });

    expect(button).toBeInTheDocument();
    expect(screen.getByText('Assignments')).toBeInTheDocument();
    expect(screen.getByText('View upcoming tasks')).toBeInTheDocument();
    expect(screen.getByTestId('action-icon')).toBeInTheDocument();
  });

  it('should render link when href is provided', () => {
    render(
      <ActionCard
        href="https://example.com"
        target="_blank"
        rel="noopener noreferrer"
        isExternal
        title="Moodle Portal"
        description="Open external moodle"
        icon={<span>Moodle</span>}
      />,
    );

    const link = screen.getByRole('link', { name: /moodle portal/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should trigger action callback when action button is clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ActionCard
        title="Quick Action"
        description="Perform action"
        icon={<span>Action</span>}
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button', { name: /quick action/i });

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ActionCard
        disabled
        title="Disabled Action"
        description="Cannot perform action"
        icon={<span>Disabled</span>}
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button', { name: /disabled action/i });

    expect(button).toBeDisabled();

    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should support custom className and variant', () => {
    render(
      <ActionCard
        className="custom-test-card"
        variant="schedule"
        title="Schedule"
        description="View class timetable"
        icon={<span data-testid="schedule-icon">Cal</span>}
      />,
    );

    const button = screen.getByRole('button', { name: /schedule/i });
    const iconWrapper = screen.getByTestId('schedule-icon').parentElement;

    expect(button).toHaveClass('custom-test-card');
    expect(iconWrapper).toHaveClass(styles.iconSchedule);
  });

  it('should render badge when badge prop is provided', () => {
    render(
      <ActionCard
        title="Notifications"
        description="Recent updates"
        badge={3}
        badgeTone="alert"
        icon={<span>Bell</span>}
      />,
    );

    const badge = screen.getByText('3');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(styles.badgeAlert);
  });
});
